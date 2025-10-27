import { GoogleGenAI, GenerateContentResponse, Type, Chat } from "@google/genai";
import * as cache from './cacheService';
import {
    NewsArticle,
    Filters,
    FactCheckResult,
    AIInstructionType,
    aiInstructionLabels,
    AppSettings,
    Source,
    SourceCategory,
    PodcastResult,
    WebResult,
    GroundingSource,
    StatisticsResult,
    ScientificArticleResult,
    VideoFactCheckResult,
    VideoTimestampResult,
    TranscriptionResult,
    AgentClarificationRequest,
    AgentExecutionResult,
    PageConfig,
    GeneralTopicResult,
    BookResult,
    CryptoCoin,
    SimpleCoin,
    CryptoSearchResult,
    CryptoAnalysisResult,
    AnalysisResult,
    FallacyResult,
    WordPressThemePlan,
    DebateConfig,
    DebateRole,
    debateRoleLabels,
    AIModelProvider,
    DebateParticipant,
    TranscriptEntry,
    RSSFeed,
    FindSourcesOptions,
    ConductDebateMessage,
    ConductDebateConfig,
    DebateAnalysisResult,
    ResearchResult,
    MediaAnalysisResult,
    StatisticalResearchResult,
    Sources,
    TickerArticle,
    ApiKeyStatus,
    ArticleSearchResult,
    SiteValidationResult,
    ComparisonValidationResult,
    FinalDebateAnalysis,
    VideoAuthenticityResult,
    VideoFactCheckStudioResult
} from '../types';
import { saveHistoryItem } from "./historyService";

// --- CONSTANTS for Prompt Truncation ---
const MAX_INSTRUCTION_LENGTH = 2000;
const MAX_FILTER_ITEMS = 20;
const MAX_SOURCES_IN_PROMPT = 30;
const MAX_DOMAINS_IN_PROMPT = 30;
const MAX_TEXT_LENGTH = 8000;
const MAX_TOPIC_LENGTH = 8000;
const MAX_DESC_LENGTH = 5000;
const MAX_CATEGORIES_IN_PROMPT = 20;


// A helper to safely parse JSON from the model
function safeJsonParse<T>(data: any, fallback: T): T {
    // If the SDK already parsed the JSON, return it directly.
    if (typeof data === 'object' && data !== null) {
        return data as unknown as T;
    }

    const jsonString = data as string | undefined | null;

    if (typeof jsonString !== 'string' || !jsonString.trim()) {
        console.error("Failed to parse JSON from model: input is not a valid string.", { input: jsonString });
        return fallback;
    }
    
    let stringToParse = jsonString;

    try {
        const markdownMatch = stringToParse.match(/```json\s*([\s\S]*?)\s*```/);
        if (markdownMatch && markdownMatch[1]) {
            stringToParse = markdownMatch[1];
        }

        const firstBracket = stringToParse.indexOf('[');
        const firstBrace = stringToParse.indexOf('{');
        
        let start = -1;
        if (firstBracket === -1 && firstBrace === -1) throw new Error("No JSON object or array found in string.");
        
        start = (firstBracket === -1 || (firstBrace !== -1 && firstBrace < firstBracket)) ? firstBrace : firstBracket;

        const openChar = stringToParse[start];
        const closeChar = openChar === '{' ? '}' : ']';
        
        let depth = 1;
        let end = -1;
        for (let i = start + 1; i < stringToParse.length; i++) {
            const char = stringToParse[i];
            // This is a simplified parser; it doesn't account for brackets inside strings,
            // but it's far more robust than lastIndexOf for handling trailing text.
            if (char === openChar) depth++;
            else if (char === closeChar) depth--;

            if (depth === 0) {
                end = i;
                break;
            }
        }
        
        if (end === -1) throw new Error("Mismatched JSON brackets in the string.");

        let jsonPart = stringToParse.substring(start, end + 1);
        
        try {
            // First attempt with the extracted part
            return JSON.parse(jsonPart) as T;
        } catch (initialParseError) {
            // If it fails, it's likely a control character issue. Sanitize and retry.
            console.warn("Initial JSON parse failed, retrying with sanitization.", initialParseError);
            // This regex removes characters in the C0 and C1 control blocks which are invalid in JSON strings.
            const sanitizedJsonPart = jsonPart.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            return JSON.parse(sanitizedJsonPart) as T;
        }

    } catch (error) {
        console.error("Failed to parse JSON from model:", error);
        console.error("Original string:", jsonString);
        return fallback;
    }
}


// Centralized error handler
function handleGeminiError(error: any, functionName: string): never {
    // Log the technical error for debugging
    console.error(`Gemini API Error in ${functionName}:`, error);

    const errorMessage = error.toString();
    
    let status: ApiKeyStatus = 'network_error';
    let userMessage = 'خطا در ارتباط با سرویس هوش مصنوعی Gemini. لطفاً اتصال اینترنت خود را بررسی کنید.';

    if (errorMessage.includes('Region not supported') || errorMessage.includes('PERMISSION_DENIED')) {
        status = 'network_error'; // Or a new status for 'region_unsupported'
        userMessage = 'سرویس Gemini API در منطقه جغرافیایی شما پشتیبانی نمی‌شود. برای رفع این مشکل، می‌توانید از طریق بخش "تنظیمات > اتصالات دیگر"، یک Cloudflare Worker را به عنوان پروکسی تنظیم و استفاده کنید.';
    } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        status = 'quota_exceeded';
        userMessage = 'شما از سقف استفاده رایگان خود از API هوش مصنوعی Gemini عبور کرده‌اید.';
    } else if (errorMessage.includes('500') || errorMessage.includes('Internal error') || errorMessage.includes('xhr error')) {
        status = 'network_error';
        if (errorMessage.includes('xhr error')) {
            userMessage = 'خطا در ارتباط با سرور Gemini. این خطا ممکن است به دلایل زیر باشد:\n1. مشکل در اتصال اینترنت شما.\n2. استفاده از VPN یا پروکسی که با سرویس تداخل دارد.\n3. محدودیت‌های جغرافیایی که مانع از دسترسی مستقیم به سرورهای Google می‌شود. برای رفع این مشکل، استفاده از پروکسی Cloudflare Worker در بخش تنظیمات برنامه به شدت توصیه می‌شود.';
        } else {
            userMessage = 'سرویس هوش مصنوعی Gemini با یک خطای داخلی مواجه شد. لطفاً بعداً دوباره تلاش کنید.';
        }
    } else if (errorMessage.includes('API key not valid')) {
        status = 'invalid_key';
        userMessage = 'کلید API وارد شده برای Gemini نامعتبر است. لطفاً آن را در تنظیمات بررسی کنید.';
    } else if (errorMessage.includes('Gemini API key not configured')) {
        status = 'not_set';
        userMessage = 'کلید API برای Gemini تنظیم نشده است. لطفاً برنامه را طبق راهنما اجرا کنید.';
    }

    window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status } }));
    throw new Error(userMessage);
}

// Added a retry mechanism for generateContent to handle transient network errors.
async function generateContentWithRetry(ai: GoogleGenAI, request: any, settings: AppSettings, retries: number = 2, delay: number = 1000): Promise<GenerateContentResponse> {
    const { cloudflareWorkerUrl, cloudflareWorkerToken } = settings.integrations;

    // --- PROXY LOGIC ---
    if (cloudflareWorkerUrl && cloudflareWorkerToken) {
        const proxyUrl = new URL('/gemini-proxy', cloudflareWorkerUrl).toString();
        try {
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cloudflareWorkerToken}`,
                },
                body: JSON.stringify(request),
            });

            const jsonResponse = await response.json();

            if (!response.ok) {
                const error = new Error(jsonResponse.error?.message || 'Proxy request to Gemini failed.');
                // @ts-ignore
                error.status = jsonResponse.error?.status;
                // @ts-ignore
                error.code = jsonResponse.error?.code;
                throw error;
            }
            
            // FIX: Handle safety blocks and other non-candidate responses that still return 200 OK
            if (!jsonResponse.candidates || jsonResponse.candidates.length === 0) {
                const blockReason = jsonResponse.promptFeedback?.blockReason;
                if (blockReason) {
                    throw new Error(`Internal error: Request blocked by Gemini for safety reason: ${blockReason}.`);
                }
                const finishReason = jsonResponse.candidates?.[0]?.finishReason;
                if (finishReason && finishReason !== 'STOP') {
                    throw new Error(`Internal error: Content generation stopped for reason: ${finishReason}.`);
                }
                console.error('Proxy to Gemini returned 200 OK but with no candidates.', jsonResponse);
                throw new Error('Internal error: Gemini returned an empty response.');
            }

            // The response from the proxy is the raw Gemini JSON.
            // We create a mock SDK response object that has the `.text` property.
            const mockResponse = {
                ...jsonResponse,
                text: jsonResponse.candidates[0]?.content?.parts?.map((p: any) => p.text).join('') || '',
            };
            
            return mockResponse as GenerateContentResponse;
        } catch (error) {
            handleGeminiError(error, 'generateContentWithRetry (via proxy)');
        }
    }

    // --- DIRECT API CALL LOGIC (FALLBACK) ---
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await ai.models.generateContent(request);

            // FIX: Manually build the text content from parts to ensure consistency and prevent errors
            // when the .text property on the SDK response is not available or returns undefined.
            const responseText = response.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
            
            // FIX: Handle empty/blocked responses from the SDK itself
            if (!responseText && (!response.candidates || response.candidates.length === 0)) {
                const blockReason = response.promptFeedback?.blockReason;
                if (blockReason) {
                    throw new Error(`Internal error: Request blocked by Gemini for safety reason: ${blockReason}.`);
                }
                const finishReason = response.candidates?.[0]?.finishReason;
                if (finishReason && finishReason !== 'STOP') {
                    throw new Error(`Internal error: Content generation stopped for reason: ${finishReason}.`);
                }
                console.error('Gemini SDK returned a response with no candidates.', response);
                throw new Error('Internal error: Gemini returned an empty response.');
            }

            // Create a new response object with an explicit .text property to ensure it's always a string.
            // This guarantees that subsequent calls to safeJsonParse(response.text) will not fail.
            const consistentResponse = {
                ...response,
                text: responseText,
            };

            return consistentResponse as GenerateContentResponse;
        } catch (error: any) {
            lastError = error;
            const errorMessage = error.toString();
            // Only retry on 500-level errors or network issues ("xhr error")
            if ((errorMessage.includes('500') || errorMessage.includes('xhr error')) && i < retries) {
                console.warn(`Gemini API call failed (attempt ${i + 1}/${retries + 1}). Retrying in ${delay * (i + 1)}ms...`);
                window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'retrying', attempt: i + 2, maxRetries: retries + 1 } }));
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // linear backoff
            } else {
                // If it's not a retryable error or retries are exhausted, re-throw.
                throw error;
            }
        }
    }
    // This line should not be reachable if the loop logic is correct, but it satisfies TypeScript's control flow analysis.
    throw lastError;
}

const getAiClient = (settings: AppSettings, task?: AIInstructionType, providerOverride?: AIModelProvider): GoogleGenAI => {
    const provider = providerOverride || (task ? settings.modelAssignments[task] : undefined) || settings.defaultProvider;

    const useGeminiFallback = (unsupportedProvider: string) => {
        console.warn(
            `Provider '${unsupportedProvider}' is configured but its implementation is not yet available. ` +
            `Gracefully falling back to 'gemini' for this request. Please select 'gemini' in the settings for this task or as the default provider to remove this warning.`
        );
        const apiKey = settings.aiModelSettings.gemini.apiKey || process.env.API_KEY;
        if (!apiKey && !(settings.integrations.cloudflareWorkerUrl && settings.integrations.cloudflareWorkerToken)) {
             throw new Error("Fallback to Gemini failed: Gemini API key or proxy is not configured.");
        }
        return new GoogleGenAI({ apiKey: apiKey || 'proxy-placeholder' });
    }

    switch (provider) {
        case 'gemini':
            const apiKey = settings.aiModelSettings.gemini.apiKey || process.env.API_KEY;
            if (!apiKey && !(settings.integrations.cloudflareWorkerUrl && settings.integrations.cloudflareWorkerToken)) {
                throw new Error("Gemini API key or proxy is not configured.");
            }
            // If using proxy, a placeholder key is fine as the worker handles the real key.
            return new GoogleGenAI({ apiKey: apiKey || 'proxy-placeholder' });
        case 'openai':
        case 'openrouter':
        case 'groq':
            return useGeminiFallback(provider);
        default:
            // This should ideally not happen if UI is correct
            throw new Error(`Unsupported AI provider: ${provider}`);
    }
};

export function createChat(settings: AppSettings, task: AIInstructionType, systemInstruction?: string): Chat {
    try {
        const ai = getAiClient(settings, task); // This will no longer throw for unimplemented providers.
        return ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction }
        });
    } catch (error) {
        // The error from getAiClient is still a user-friendly Error object. Re-throw it. 
        throw error; 
    }
}


// Added function to check API key status, required by AIModelSettings component.
export async function checkApiKeyStatus(apiKey: string | undefined | null): Promise<ApiKeyStatus> {
    if (!apiKey) {
        return 'not_set';
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        // Use a very lightweight model call to check the key and quota.
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "test",
            config: { maxOutputTokens: 1 }
        });
        return 'valid';
    } catch (error: any) {
        const errorMessage = error.toString();
        if (errorMessage.includes('API key not valid')) {
            return 'invalid_key';
        }
        if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
            return 'quota_exceeded';
        }
        if (errorMessage.includes('Region not supported') || errorMessage.includes('PERMISSION_DENIED')) {
            return 'network_error'; // Treat as network error as it might be circumventable
        }
        // This might catch DNS issues, CORS, 500 errors, etc.
        if (error.name === 'AbortError' || error.message.includes('network') || errorMessage.includes('xhr error') || errorMessage.includes('500')) {
            return 'network_error';
        }
        console.error("Unknown error during API key status check:", error);
        // If it's another error, it's likely an invalid key or configuration problem.
        return 'invalid_key';
    }
}


// --- News & Search ---

export async function fetchNews(filters: Filters, instruction: string, articlesPerColumn: number, showImages: boolean, settings: AppSettings): Promise<{ articles: NewsArticle[], suggestions: string[] }> {
    const cacheKey = `news-search-${JSON.stringify(filters)}`;
    const cached = cache.get<{ articles: NewsArticle[], suggestions: string[] }>(cacheKey);
    if (cached) return cached;

    try {
        const ai = getAiClient(settings, 'news-search');
        
        const formatFilterList = (items: string[]): string => {
            if (items.includes('all') || items.length === 0) {
                return 'any';
            }
            return items.slice(0, MAX_FILTER_ITEMS).join(', ');
        };
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedQuery = (filters.query || '').substring(0, 1000);

        const prompt = `
            ${truncatedInstruction}
            Based on a real-time web search, find the top ${articlesPerColumn} news articles matching these criteria:
            - Query: "${truncatedQuery}"
            - Categories: ${formatFilterList(filters.categories)}
            - Regions: ${formatFilterList(filters.regions)}
            - Sources: ${formatFilterList(filters.sources)}
            - Images: ${showImages ? 'Required' : 'Not required'}
            Generate some related search suggestions as well.
            Your entire response MUST be a single, valid JSON object with two keys: "articles" and "suggestions".
            Each article object must have these keys: title, summary, link, source, publicationTime (in Persian Jalali format), credibility, category, imageUrl.
            CRITICAL: The 'link' for each article **MUST** be the direct, verifiable URL from the web search results you used to create that article's summary. Do not synthesize, guess, or create URLs. This is the most important rule.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult = { articles: [], suggestions: [] };
        const parsedResult = safeJsonParse<Partial<{ articles: NewsArticle[], suggestions: string[] }>>(response.text, {});
        const result = { ...defaultResult, ...parsedResult };
        
        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web);
        if (groundingSources) {
            result.articles.forEach(article => {
                article.groundingSources = groundingSources;
            });
        }

        cache.set(cacheKey, result);
        return result;
    } catch (error) {
        handleGeminiError(error, 'fetchNews');
    }
}

export async function fetchLiveNews(tabId: string, sources: Sources, instruction: string, showImages: boolean, specifics: any, settings: AppSettings): Promise<NewsArticle[]> {
    const cacheKey = `live-news-${tabId}-${specifics.articlesToDisplay}`;
    const cached = cache.get<NewsArticle[]>(cacheKey, 10 * 60 * 1000); // 10 minute TTL for live news
    if (cached) return cached;

    try {
        const ai = getAiClient(settings, 'news-display');

        const allSourcesList: Source[] = Object.values(sources).flat();
        const selectedSourceIds: string[] = Object.values(specifics.selectedSources || {}).flat();
        
        const selectedSourceNames = allSourcesList
            .filter(source => selectedSourceIds.includes(source.id))
            .map(source => source.name);

        const truncatedSourceNames = selectedSourceNames.slice(0, MAX_SOURCES_IN_PROMPT);
        const sourceListString = truncatedSourceNames.join(', ');

        const sourcePromptPart = truncatedSourceNames.length > 0
            ? `Prioritize news from these sources if relevant: ${sourceListString.substring(0, 1500)}.`
            : 'Search from a wide variety of reliable news sources.';
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);

        const prompt = `
            ${truncatedInstruction}
            Search the web for the absolute latest, up-to-the-minute top ${specifics.articlesToDisplay} news articles for the category: "${tabId}".
            ${sourcePromptPart}
            Images: ${showImages ? 'Required' : 'Not required'}.
            Your entire response MUST be a single, valid JSON array of objects. Do not include any other text or markdown formatting.
            Each object in the array must have the following keys:
            - "title": string (The article title in Persian)
            - "summary": string (A concise summary in Persian)
            - "link": string (CRITICAL: This MUST be a direct, working, and publicly accessible URL to the full news article, taken *directly* from the web search results you used. Do not provide links to homepages, paywalled content, or incorrect/404 pages. Your top priority is link accuracy.)
            - "source": string (The name of the news source in Persian)
            - "publicationTime": string (The publication date in Persian Jalali format, e.g., '۱۴۰۳/۰۵/۰۲')
            - "credibility": string (MUST be one of these exact Persian strings: "بسیار معتبر", "معتبر", or "نیازمند بررسی")
            - "category": string (The news category in Persian)
            - "imageUrl": string or null (A direct URL to a relevant image, or null if not available)
        `;
        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<NewsArticle[]>(response.text, []);
        
        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult as NewsArticle] : []);

        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web);
        if (groundingSources) {
            resultsArray.forEach((article: NewsArticle) => {
                article.groundingSources = groundingSources;
            });
        }
        
        saveHistoryItem({
            type: 'live-news',
            query: `اخبار زنده: ${tabId}`,
            resultSummary: `${resultsArray.length} خبر جدید دریافت شد.`,
            data: resultsArray
        });

        cache.set(cacheKey, resultsArray, 10 * 60 * 1000);
        return resultsArray as NewsArticle[];
    } catch (error) {
        handleGeminiError(error, 'fetchLiveNews');
    }
}


export async function fetchTickerHeadlines(categories: string[], instruction: string, settings: AppSettings): Promise<TickerArticle[]> {
    const cacheKey = `ticker-headlines-${categories.join(',')}`;
    const cached = cache.get<TickerArticle[]>(cacheKey, 30 * 60 * 1000); // 30 minute TTL for ticker
    if (cached) return cached;

    try {
        const ai = getAiClient(settings, 'news-ticker');

        const truncatedCategories = categories.slice(0, MAX_CATEGORIES_IN_PROMPT);
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);

        const prompt = `
            ${truncatedInstruction}. Find 10 top headlines from these categories: ${truncatedCategories.join(', ').substring(0, 1000)}.
            Your entire response MUST be a single, valid JSON array of objects. Each object must have "title" and "link" properties. The 'link' MUST be a direct, working URL from your web search results.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<TickerArticle[]>(response.text, []);
        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult as TickerArticle] : []);
        cache.set(cacheKey, resultsArray, 30 * 60 * 1000);
        return resultsArray as TickerArticle[];
    } catch (error) {
        handleGeminiError(error, 'fetchTickerHeadlines');
    }
}

export async function generateDynamicFilters(query: string, listType: 'categories' | 'regions' | 'sources', count: number, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings);
        const truncatedQuery = (query || '').substring(0, 500);

        const prompt = `
            Based on the search query "${truncatedQuery}", suggest ${count} relevant ${listType} for filtering news.
            Your entire response MUST be a single, valid JSON array of strings.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }] 
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        // FIX: The parsed JSON from the model can be of any type. Parse as 'unknown' first,
        // then perform type checks to safely handle the data and ensure it matches the function's return type.
        const parsed = safeJsonParse<unknown>(response.text, []);
        if (!Array.isArray(parsed)) {
            console.error("generateDynamicFilters expected an array but got:", typeof parsed, parsed);
            return [];
        }
        // Filter to ensure all items in the array are strings to match the string[] return type.
        return parsed.filter((item): item is string => typeof item === 'string');
    } catch (error) {
        handleGeminiError(error, 'generateDynamicFilters');
    }
}

export async function checkForUpdates(sources: any, settings: AppSettings): Promise<boolean> {
    console.log("Checking for updates...", sources);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return Math.random() > 0.7;
}

export async function fetchNewsFromFeeds(feeds: RSSFeed[], instruction: string, settings: AppSettings, query?: string): Promise<NewsArticle[]> {
    const cacheKey = `rss-feeds-${feeds.map(f => f.id).join('-')}-${settings.rssFeedSpecifics.articlesToDisplay}-${query || ''}`;
    const cached = cache.get<NewsArticle[]>(cacheKey, 20 * 60 * 1000); // 20 min TTL for RSS
    if (cached) return cached;
    try {
        const ai = getAiClient(settings, 'rss-feeds');

        const getDomainFromUrl = (url: string): string => {
            try {
                const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                const hostname = new URL(fullUrl).hostname;
                return hostname.replace(/^www\./, '');
            } catch (e) {
                const domainMatch = url.match(/^([^:\/\n?]+)/);
                return domainMatch ? domainMatch[1] : url;
            }
        };
        
        const sourceDomains = [...new Set(feeds.map(feed => getDomainFromUrl(feed.url)))];
        
        const truncatedDomains = sourceDomains.slice(0, MAX_DOMAINS_IN_PROMPT);
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedQuery = (query || '').substring(0, 500);

        const prompt = `
            ${truncatedInstruction}
            Search the web for the latest ${settings.rssFeedSpecifics.articlesToDisplay} news articles from these news websites: ${truncatedDomains.join(', ').substring(0, 1500)}.
            Do not try to parse the RSS feeds directly. Instead, search for the latest news from their respective websites.
            ${query ? `Filter the search results by this query: "${truncatedQuery}"` : ''}
            Your entire response MUST be a single, valid JSON array of article objects. All text values in the JSON, including title, summary, source, credibility, and category, MUST be in Persian.
            Each article object must have these keys: title, summary, link, source, publicationTime (in Persian Jalali format), credibility, category, and an optional imageUrl.
            CRITICAL: The 'link' for each article **MUST** be the direct, verifiable URL from your web search results. Do not invent links.
            The 'credibility' field is mandatory and MUST be one of these exact Persian strings: "بسیار معتبر", "معتبر", or "نیازمند بررسی". Do not use English terms.
            Ensure every field is populated. If an image is not found, the imageUrl can be null.
            Do not include any other text or markdown formatting outside of the JSON array.
        `;

        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<NewsArticle[]>(response.text, []);
        
        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult as NewsArticle] : []);

        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web);
        if (groundingSources) {
            resultsArray.forEach((article: NewsArticle) => {
                article.groundingSources = groundingSources;
            });
        }
        
        saveHistoryItem({
            type: 'rss-feed',
            query: query || 'همه فیدها',
            resultSummary: `تعداد ${resultsArray.length} خبر از خبرخوان‌ها یافت شد.`,
            data: resultsArray,
        });
        
        cache.set(cacheKey, resultsArray, 20 * 60 * 1000);
        return resultsArray as NewsArticle[];
    } catch (error) {
        handleGeminiError(error, 'fetchNewsFromFeeds');
    }
}

// --- Fact Check & Analysis ---

export async function factCheckNews(text: string, file: { data: string, mimeType: string } | null, settings: AppSettings, url?: string, instruction?: string): Promise<FactCheckResult> {
    try {
        const ai = getAiClient(settings, 'fact-check');

        const contentParts: any[] = [];
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);

        let prompt = `
            ${truncatedInstruction}\nAnalyze the following content for fact-checking. Use a live web search to find verified information.
            Your entire response MUST be a single, valid JSON object matching the FactCheckResult structure.
            The JSON should have keys: "overallCredibility", "summary", and "sources" (an array).
            Each source object in the array must have "name", "link", "publicationDate" (in Persian Jalali format), "credibility", and "summary".
            The 'link' for each source **MUST** be a working URL taken directly from your web search.
            Do not include any other text or markdown formatting.
        `;
        if (text) {
            const truncatedText = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) + '... [text truncated]' : text;
            prompt += `\nText: "${truncatedText}"`;
        }
        if (url) prompt += `\nURL: "${url}"`;
        contentParts.push({ text: prompt });

        if (file) {
            contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
        }

        const request = {
            model: 'gemini-2.5-flash',
            contents: { parts: contentParts },
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: FactCheckResult = { overallCredibility: "Error", summary: "Failed to parse model response.", sources: [] };
        const parsedResult = safeJsonParse<Partial<FactCheckResult>>(response.text, {});
        const finalResult = { ...defaultResult, ...parsedResult };
        
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            finalResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }

        return finalResult;
    } catch (error) {
        handleGeminiError(error, 'factCheckNews');
    }
}

export async function factCheckVideoStudio(url: string, criteria: string[], settings: AppSettings): Promise<VideoFactCheckStudioResult> {
    try {
        const ai = getAiClient(settings, 'fact-check-video-studio');
        const instruction = settings.aiInstructions['fact-check-video-studio'];
        
        const prompt = `
            ${instruction}
            You are "VideoFactCheck Studio". Your CRITICAL mission is to act as a digital forensics expert and perform a detailed, factual fact-check on the video from the provided URL.
            **Your entire analysis MUST be strictly confined to verifiable information found online that is DIRECTLY related to this specific video URL: ${url}.**
            You MUST ground all your findings in information obtained by using your web search tool. DO NOT INVENT or HALLUCINATE any data.
            All URLs you provide in any field MUST be real, working links you found during your search.
            
            If you cannot find specific information for a requested field (like 'viewCount', specific claims, etc.) through your search, you MUST use the exact Persian phrase "اطلاعات یافت نشد" for that field's value. Do not guess or infer information.

            **Video URL to Analyze:** ${url}
            **Data to retrieve based on user selection:** ${criteria.join(', ')}

            **Instructions:**
            1.  Your primary task is to search the web for transcripts, summaries, news articles, and discussions specifically about the video at the provided URL.
            2.  Populate the JSON structure below ONLY with information you can verify from your web search.
            3.  For any field where verifiable information is not found, use the value "اطلاعات یافت نشد".

            Your response must be only the JSON object, without any other text or markdown formatting.
        `;

        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
            }
        };

        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        
        const defaultResult: VideoFactCheckStudioResult = {
            videoInfo: { videoTitle: '' },
            claims: [],
        };

        const parsedResult = safeJsonParse<Partial<VideoFactCheckStudioResult>>(response.text, {});
        
        const finalResult = { ...defaultResult, ...parsedResult };


        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            finalResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }

        return finalResult as VideoFactCheckStudioResult;

    } catch (error) {
        handleGeminiError(error, 'factCheckVideoStudio');
    }
}


export async function checkVideoAuthenticity(url: string, instruction: string, settings: AppSettings): Promise<VideoAuthenticityResult> {
    try {
        const ai = getAiClient(settings, 'fact-check-video-authenticity');
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);

        const prompt = `
            ${truncatedInstruction}
            
            Please analyze the video from the following URL. Use your web search tool to find context about this video's authenticity.
            URL: "${url}"

            Your entire response MUST be a single, valid JSON object that strictly adheres to the VideoAuthenticityResult structure, with all text in Persian.
            Do not include any other text or markdown formatting.
        `;

        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: VideoAuthenticityResult = {
            isAiGenerated: { verdict: false, confidence: 0, explanation: 'تحلیل انجام نشد.' },
            hasAiArtifacts: { verdict: false, confidence: 0, explanation: 'تحلیل انجام نشد.' },
            isManipulated: { verdict: false, confidence: 0, explanation: 'تحلیل انجام نشد.' },
            overallVerdict: 'غیرقابل تشخیص',
            detailedAnalysis: 'پاسخی از مدل دریافت نشد یا پاسخ قابل تحلیل نبود.',
        };
        const parsedResult = safeJsonParse<Partial<VideoAuthenticityResult>>(response.text, {});
        
        const finalResult: VideoAuthenticityResult = {
            ...defaultResult,
            ...parsedResult,
            isAiGenerated: { ...defaultResult.isAiGenerated, ...(parsedResult.isAiGenerated || {}) },
            hasAiArtifacts: { ...defaultResult.hasAiArtifacts, ...(parsedResult.hasAiArtifacts || {}) },
            isManipulated: { ...defaultResult.isManipulated, ...(parsedResult.isManipulated || {}) },
        };

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            finalResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }

        return finalResult;
    } catch (error) {
        handleGeminiError(error, 'checkVideoAuthenticity');
    }
}
export async function analyzeMedia(
    url: string | null,
    // FIX: Update the file parameter type to include the 'name' property.
    file: { data: string, mimeType: string, name: string } | null,
    userPrompt: string,
    instruction: string,
    settings: AppSettings
): Promise<MediaAnalysisResult> {
    try {
        const ai = getAiClient(settings, 'analyzer-media');

        const contentParts: any[] = [];
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedUserPrompt = (userPrompt || '').substring(0, 1000);
        
        let prompt: string;
        
        const jsonStructurePrompt = `
            Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. CRITICAL: Ensure all newline characters inside JSON string values are properly escaped as \\n. The JSON object must have the following structure with example values:
            \`\`\`json
            {
              "summary": "خلاصه‌ای جامع از محتوای رسانه...",
              "transcript": "متن کامل و دقیق گفتگوها در ویدئو...",
              "analyzedClaims": [
                {
                  "claimText": "متن دقیق ادعای مطرح شده.",
                  "timestamp": "02:35",
                  "credibility": 80,
                  "analysis": "تحلیل کوتاه و بی‌طرفانه از اعتبار ادعا."
                }
              ],
              "critique": {
                "logic": "نقد مغالطه‌های منطقی.",
                "science": "نقد عدم دقت‌های علمی.",
                "argumentation": "نقد ایرادات استدلالی.",
                "rhetoric": "نقد فن بیان و نحوه ارائه.",
                "grammar": "نقد خطاهای دستوری.",
                "evidence": "نقد شواهد و منابع ارائه شده. Cite sources with direct, working URLs like [Source Name](https://example.com).",
                "philosophy": "نقد ایرادات فلسفی."
              }
            }
            \`\`\`
        `;

        if (url) {
            prompt = `
                ${truncatedInstruction}
                **CRITICAL MISSION:** You are an expert media analyst. Your entire task is to analyze the content provided from the URL below. You MUST base your response strictly on verifiable information found at or about this specific URL. Use your web search tool to gather context *about this specific URL and its content*. Do not invent or hallucinate information. If you cannot find information for a field, state that clearly in your analysis.

                **Media URL to Analyze:** ${url}
                **User's Analysis Request:** "${truncatedUserPrompt}"
                
                ${jsonStructurePrompt}
            `;
        } else {
            prompt = `
                ${truncatedInstruction}
                Analyze the provided media file based on the user's request. Use a real-time web search to find context and verify claims if necessary.
                User request: "${truncatedUserPrompt}"
                The main content is in the attached file.
                
                ${jsonStructurePrompt}
            `;
        }
        
        contentParts.push({ text: prompt });

        if (file) {
            contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
        }

        const request = {
            model: 'gemini-2.5-flash',
            contents: { parts: contentParts },
            config: {
                tools: [{ googleSearch: {} }]
            },
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: MediaAnalysisResult = {
            summary: 'پاسخ دریافت نشد.',
            transcript: '',
            analyzedClaims: [],
            critique: { logic: '', science: '', argumentation: '', rhetoric: '', grammar: '', evidence: '', philosophy: '' }
        };
        const parsedResult = safeJsonParse<Partial<MediaAnalysisResult>>(response.text, {});
        const finalResult = { 
            ...defaultResult,
            ...parsedResult,
            critique: { ...defaultResult.critique, ...(parsedResult.critique || {}) },
        };

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            finalResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }

        saveHistoryItem({
            type: 'analyzer-media',
            query: url || file?.name || 'تحلیل رسانه',
            resultSummary: finalResult.summary.slice(0, 150) + '...',
            data: finalResult
        });
        
        return finalResult;
    } catch (error) {
        handleGeminiError(error, 'analyzeMedia');
    }
}

export async function generateAIInstruction(taskLabel: string, settings: AppSettings): Promise<string> {
    try {
        const ai = getAiClient(settings);
        
        const prompt = `Create a detailed, expert-level system instruction prompt in Persian for an AI model. The task is: "${taskLabel}". The prompt should be clear, concise, and guide the model to produce high-quality, structured output.`;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text;
    } catch (error) {
        handleGeminiError(error, 'generateAIInstruction');
    }
}

export async function testAIInstruction(instruction: string, settings: AppSettings): Promise<boolean> {
    try {
        const ai = getAiClient(settings);
        const request = {
            model: "gemini-2.5-flash",
            contents: "Test prompt",
            config: { systemInstruction: instruction, maxOutputTokens: 5 }
        };
        await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return true;
    } catch (e) {
        handleGeminiError(e, 'testAIInstruction');
    }
}

export async function findSourcesWithAI(category: SourceCategory, existingSources: Source[], options: FindSourcesOptions, settings: AppSettings): Promise<Partial<Source>[]> {
    try {
        const ai = getAiClient(settings);

        const truncatedExisting = existingSources.slice(0, 50).map(s => s.url).join(', ').substring(0, 1000);

        const prompt = `
            Find ${options.count} new, high-quality news sources for the category "${category}".
            - Region: ${options.region}
            - Language: ${options.language}
            - Credibility: ${options.credibility}
            - Exclude these already known sources: ${truncatedExisting}
            Your entire response MUST be a single, valid JSON array of objects.
            Each object must have these keys: name, field, url, activity, credibility, region. The 'url' must be a direct, working URL from your web search.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<Partial<Source>[]>(response.text, []);
        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult] : []);
        return resultsArray as Partial<Source>[];
    } catch (error) {
        handleGeminiError(error, 'findSourcesWithAI');
    }
}


export async function fetchPodcasts(query: string, instruction: string, settings: AppSettings): Promise<PodcastResult[]> {
    try {
        const ai = getAiClient(settings, 'podcast-search');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedQuery = (query || '').substring(0, 500);

        const prompt = `
            ${truncatedInstruction}\nFind podcasts related to: "${truncatedQuery}"
            Your entire response MUST be a single, valid JSON array of PodcastResult objects.
            The 'link' and 'audioUrl' for each podcast, as well as the 'url' for 'hostingSites', MUST be direct, working URLs from your web search.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<PodcastResult[]>(response.text, []);
        
        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult as PodcastResult] : []);

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
            resultsArray.forEach((podcast: PodcastResult) => {
                podcast.groundingSources = groundingSources;
            });
        }

        return resultsArray as PodcastResult[];
    } catch (error) {
        handleGeminiError(error, 'fetchPodcasts');
    }
}

export async function fetchWebResults(searchType: string, filters: Filters, instruction: string, settings: AppSettings): Promise<{ results: WebResult[], sources: GroundingSource[], suggestions: string[] }> {
    try {
        const ai = getAiClient(settings, `${searchType}-search` as AIInstructionType);

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedQuery = (filters.query || '').substring(0, 500);

        const prompt = `
          ${truncatedInstruction}\nSearch for ${searchType} about "${truncatedQuery}" with these filters: ${JSON.stringify(filters)}. Also provide related suggestions.
          Your entire response MUST be a single, valid JSON object with two keys: "results" (an array of WebResult objects) and "suggestions" (an array of strings).
          The 'link' in each WebResult object MUST be the exact, working URL from your web search results.
          Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult = { results: [], suggestions: [] };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<typeof defaultResult>>(response.text, {}) };
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];
        
        return { ...parsedResult, sources };
    } catch (error) {
        handleGeminiError(error, 'fetchWebResults');
    }
}


// --- Content Generation ---

export async function generateSeoKeywords(topic: string, instruction: string, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings, 'seo-keywords');
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedTopic = (topic || '').substring(0, 500);
        const prompt = `${truncatedInstruction}\nGenerate SEO keywords for: "${truncatedTopic}"`;
        const request = { 
            model: "gemini-2.5-flash", 
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text.split(',').map(k => k.trim());
    } catch (error) {
        handleGeminiError(error, 'generateSeoKeywords');
    }
}

export async function suggestWebsiteNames(topic: string, instruction: string, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings, 'website-names');
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedTopic = (topic || '').substring(0, 500);
        const prompt = `${truncatedInstruction}\nSuggest website names for: "${truncatedTopic}"`;
        const request = { model: "gemini-2.5-flash", contents: prompt };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text.split('\n').map(k => k.trim().replace(/^- /, ''));
    } catch (error) {
        handleGeminiError(error, 'suggestWebsiteNames');
    }
}

export async function suggestDomainNames(topic: string, instruction: string, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings, 'domain-names');
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedTopic = (topic || '').substring(0, 500);
        const prompt = `${truncatedInstruction}\nSuggest domain names for: "${truncatedTopic}"`;
        const request = { model: "gemini-2.5-flash", contents: prompt };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text.split('\n').map(k => k.trim());
    } catch (error) {
        handleGeminiError(error, 'suggestDomainNames');
    }
}

export async function generateArticle(topic: string, wordCount: number, instruction: string, settings: AppSettings): Promise<{articleText: string, groundingSources: GroundingSource[]}> {
    try {
        const ai = getAiClient(settings, 'article-generation');
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedTopic = (topic || '').substring(0, 1000);

        const prompt = `${truncatedInstruction}\nWrite an article about "${truncatedTopic}" with approximately ${wordCount} words.`;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];

        return { articleText: response.text, groundingSources };
    } catch (error) {
        handleGeminiError(error, 'generateArticle');
    }
}

export async function generateImagesForArticle(prompt: string, count: number, style: string, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings, 'article-generation'); // Image generation is part of article generation task

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: { numberOfImages: count }
        });
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
    } catch (error) {
        handleGeminiError(error, 'generateImagesForArticle');
    }
}

export async function generateAboutMePage(description: string, siteUrl: string, platform: string, images: {data: string, mimeType: string}[], pageConfig: PageConfig, instruction: string, settings: AppSettings): Promise<string> {
    try {
        const ai = getAiClient(settings, 'page-builder');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedDescription = (description || '').substring(0, MAX_DESC_LENGTH);

        const prompt = `
            ${truncatedInstruction}
            Description: ${truncatedDescription}
            Site URL: ${siteUrl}
            Platform: ${platform}
            Page Config: ${JSON.stringify(pageConfig)}
            Number of images provided: ${images.length}
            Generate a complete, single HTML file.
        `;
        const contentParts: any[] = [{ text: prompt }];
        images.forEach(img => {
            contentParts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
        });

        const request = {
            model: "gemini-2.5-flash",
            contents: { parts: contentParts }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text.replace(/^```html\s*|```\s*$/g, '').trim();
    } catch (error) {
        handleGeminiError(error, 'generateAboutMePage');
    }
}

export async function fetchStatistics(query: string, instruction: string, settings: AppSettings): Promise<StatisticsResult> {
    try {
        const ai = getAiClient(settings, 'stats-search');
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedQuery = (query || '').substring(0, 500);

        const prompt = `
          ${truncatedInstruction}
          Find statistics for: "${truncatedQuery}"
          Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must strictly adhere to this structure with example values:
          \`\`\`json
          {
            "title": "عنوان آمار",
            "summary": "خلاصه نتایج آماری...",
            "keywords": ["کلمه کلیدی ۱", "کلمه کلیدی ۲"],
            "chart": { "type": "bar", "title": "عنوان نمودار", "labels": ["برچسب ۱", "برچسب ۲"], "datasets": [{ "label": "داده", "data": [100, 200] }] },
            "sourceDetails": { "name": "نام منبع", "link": "https://example.com", "author": "نام نویسنده", "publicationDate": "۱۴۰۳/۰۵/۰۱", "credibility": "بسیار معتبر" },
            "analysis": { "acceptancePercentage": 95, "currentValidity": "معتبر", "alternativeResults": "نتایج جایگزین..." },
            "relatedSuggestions": ["پیشنهاد مرتبط ۱", "پیشنهاد مرتبط ۲"]
          }
          \`\`\`
          The 'link' inside "sourceDetails" MUST be the exact, working URL from your web search results for that source.
        `;
        const request = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { 
                tools: [{googleSearch: {}}]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: StatisticsResult = {
            title: 'پاسخ دریافت نشد',
            summary: '',
            keywords: [],
            chart: { type: 'table', title: '', labels: [], datasets: [] },
            sourceDetails: { name: '', link: '', author: '', publicationDate: '', credibility: '' },
            analysis: { acceptancePercentage: 0, currentValidity: '' },
            relatedSuggestions: []
        };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<StatisticsResult>>(response.text, {}) };
        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web);
        if (groundingSources) {
            parsedResult.groundingSources = groundingSources;
        }
        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'fetchStatistics');
    }
}
export async function fetchScientificArticle(query: string, instruction: string, settings: AppSettings): Promise<ScientificArticleResult> {
    try {
        const ai = getAiClient(settings, 'science-search');
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedQuery = (query || '').substring(0, 500);

        const prompt = `
            ${truncatedInstruction}
            Find scientific articles for: "${truncatedQuery}"
            Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must strictly adhere to this structure with example values:
            \`\`\`json
             {
                "title": "عنوان مقاله علمی",
                "summary": "خلاصه مقاله...",
                "keywords": ["کلمه کلیدی ۱", "کلمه کلیدی ۲"],
                "sourceDetails": { "name": "نام ژورنال", "link": "https://example.com/article", "author": "نام نویسنده", "publicationDate": "۱۴۰۳/۰۵/۰۱", "credibility": "بسیار معتبر" },
                "analysis": { "acceptancePercentage": 90, "currentValidity": "معتبر", "alternativeResults": "تحلیل‌های دیگر..." },
                "relatedSuggestions": ["پیشنهاد مرتبط ۱"]
            }
            \`\`\`
            The 'link' inside "sourceDetails" MUST be the exact, working URL from your web search results for that source.
        `;
        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                tools: [{googleSearch:{}}]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: ScientificArticleResult = {
            title: 'پاسخ دریافت نشد',
            summary: '',
            keywords: [],
            sourceDetails: { name: '', link: '', author: '', publicationDate: '', credibility: '' },
            analysis: { acceptancePercentage: 0, currentValidity: '' },
            relatedSuggestions: []
        };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<ScientificArticleResult>>(response.text, {}) };
        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web);
        if (groundingSources) {
            parsedResult.groundingSources = groundingSources;
        }
        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'fetchScientificArticle');
    }
}
export async function fetchReligiousText(query: string, instruction: string, settings: AppSettings): Promise<ScientificArticleResult> {
    try {
        const ai = getAiClient(settings, 'religion-search');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedQuery = (query || '').substring(0, 1000);
        
        const prompt = `
            ${truncatedInstruction}
            Find religious text for: "${truncatedQuery}"
            Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must strictly adhere to this structure with example values:
            \`\`\`json
             {
                "title": "عنوان متن دینی",
                "summary": "خلاصه متن یا تفسیر...",
                "keywords": ["کلمه کلیدی ۱", "کلمه کلیدی ۲"],
                "sourceDetails": { "name": "نام کتاب یا منبع", "link": "https://example.com/source", "author": "نام نویسنده/مفسر", "publicationDate": "تاریخ انتشار", "credibility": "بسیار معتبر" },
                "analysis": { "acceptancePercentage": 98, "currentValidity": "مورد قبول", "alternativeResults": "تفاسیر دیگر..." },
                "relatedSuggestions": ["موضوع مرتبط"]
            }
            \`\`\`
            The 'link' inside "sourceDetails" MUST be the exact, working URL from your web search results for that source.
        `;
        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                tools: [{googleSearch:{}}]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: ScientificArticleResult = {
            title: 'پاسخ دریافت نشد',
            summary: '',
            keywords: [],
            sourceDetails: { name: '', link: '', author: '', publicationDate: '', credibility: '' },
            analysis: { acceptancePercentage: 0, currentValidity: '' },
            relatedSuggestions: []
        };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<ScientificArticleResult>>(response.text, {}) };
        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web);
        if (groundingSources) {
            parsedResult.groundingSources = groundingSources;
        }
        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'fetchReligiousText');
    }
}
export async function generateContextualFilters(listType: string, context: any, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings);
        const truncatedContext = JSON.stringify(context).substring(0, 1000);

        const prompt = `
            Based on this context: ${truncatedContext}, generate 5 relevant filters for "${listType}".
            Your entire response MUST be a single, valid JSON array of strings.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsed = safeJsonParse<any[]>(response.text, []);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((item): item is string => typeof item === 'string');
    } catch (error) {
        handleGeminiError(error, 'generateContextualFilters');
    }
}
export async function analyzeVideoFromUrl(url: string, type: string, keywords: string, instruction: string, settings: AppSettings): Promise<any> {
    try {
        const ai = getAiClient(settings, 'video-converter');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedKeywords = (keywords || '').substring(0, 500);

        const prompt = `
            ${truncatedInstruction}\nAnalyze video from URL: ${url}\nAnalysis type: ${type}\nKeywords: ${truncatedKeywords}
            Your entire response MUST be a single, valid JSON object. Any links in the response must be real and taken from your search results.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }] 
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<any>(response.text, {});
    } catch (error) {
        handleGeminiError(error, 'analyzeVideoFromUrl');
    }
}
export async function formatTextContent(text: string | null, url: string | null, instruction: string, settings: AppSettings): Promise<string> {
    try {
        const ai = getAiClient(settings);

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedText = (text || '').substring(0, MAX_TEXT_LENGTH);

        const prompt = `${truncatedInstruction}\nFormat this content:\n${truncatedText || `Content from URL: ${url}`}`;
        const request = {model: 'gemini-2.5-flash', contents: prompt};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text;
    } catch (error) {
        handleGeminiError(error, 'formatTextContent');
    }
}
export async function analyzeAgentRequest(topic: string, request: string, instruction: string, settings: AppSettings): Promise<AgentClarificationRequest> {
    try {
        const ai = getAiClient(settings, 'browser-agent');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedTopic = (topic || '').substring(0, 1000);
        const truncatedRequest = (request || '').substring(0, 2000);

        const prompt = `
            ${truncatedInstruction}
            Analyze this agent request.
            Topic: ${truncatedTopic}
            Request: ${truncatedRequest}
            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must adhere to this structure with example values:
            \`\`\`json
            {
              "isClear": false,
              "questions": [{ "questionText": "چه نوع اطلاعاتی را در اولویت قرار دهم؟", "questionType": "multiple-choice", "options": ["آمار", "اخبار", "تحلیل‌ها"] }],
              "refinedPrompt": "خلاصه آخرین اخبار و آمارهای مربوط به هوش مصنوعی با تمرکز بر تحلیل‌ها."
            }
            \`\`\`
        `;
        const requestBody = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { tools: [{googleSearch:{}}] }
        };
        const response = await generateContentWithRetry(ai, requestBody, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult = { isClear: true };
        return { ...defaultResult, ...safeJsonParse<Partial<AgentClarificationRequest>>(response.text, {}) };
    } catch (error) {
        handleGeminiError(error, 'analyzeAgentRequest');
    }
}
export async function executeAgentTask(prompt: string, instruction: string, settings: AppSettings): Promise<AgentExecutionResult> {
    try {
        const ai = getAiClient(settings, 'browser-agent');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedPrompt = (prompt || '').substring(0, 8000);

        const request = {
            model: 'gemini-2.5-flash',
            contents: `
                ${truncatedInstruction}\n${truncatedPrompt}
                Your entire response MUST be a single, valid JSON object matching the AgentExecutionResult structure.
                The 'uri' for each source MUST be a direct, working URL from your web search results.
                Do not include any other text or markdown formatting.
            `,
            config: { tools:[{googleSearch:{}}] }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult = { summary: 'پاسخی دریافت نشد.', steps: [], sources: [] };
        return { ...defaultResult, ...safeJsonParse<Partial<AgentExecutionResult>>(response.text, {}) };
    } catch (error) {
        handleGeminiError(error, 'executeAgentTask');
    }
}
export async function generateKeywordsForTopic(mainTopic: string, comparisonTopic: string, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings);
        const truncatedMain = (mainTopic || '').substring(0, 500);
        const truncatedComp = (comparisonTopic || '').substring(0, 500);

        const prompt = `
            Generate keywords for topic "${truncatedMain}" ${truncatedComp ? `and comparison topic "${truncatedComp}"` : ''}
            Your entire response MUST be a single, valid JSON array of strings.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsed: any[] = safeJsonParse(response.text, []);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((item): item is string => typeof item === 'string');
    } catch (error) {
        handleGeminiError(error, 'generateKeywordsForTopic');
    }
}
export async function fetchGeneralTopicAnalysis(mainTopic: string, comparisonTopic: string, keywords: string[], domains: string[], instruction: string, settings: AppSettings): Promise<GeneralTopicResult> {
    try {
        const ai = getAiClient(settings, 'general-topics');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedMain = (mainTopic || '').substring(0, 1000);
        const truncatedComp = (comparisonTopic || '').substring(0, 1000);
        const truncatedKeywords = keywords.join(', ').substring(0, 500);
        const truncatedDomains = domains.join(', ').substring(0, 500);

        const prompt = `
            ${truncatedInstruction}\nTopic: ${truncatedMain}\nComparison: ${truncatedComp}\nKeywords: ${truncatedKeywords}\nDomains: ${truncatedDomains}
            Your entire response MUST be a single, valid JSON object matching the GeneralTopicResult structure.
            The "sources" array MUST be populated with direct results from your web search. Each object must have a "uri" which is the direct, working URL, and a "title".
            Do not include any other text or markdown formatting.
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}]}};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: GeneralTopicResult = {
            title: 'پاسخ دریافت نشد',
            summary: '',
            keyPoints: [],
            sources: []
        };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<GeneralTopicResult>>(response.text, {}) };

        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];
        if (groundingSources.length > 0) {
            const existingUris = new Set(parsedResult.sources?.map(s => s.uri));
            const newSources = groundingSources.filter(s => !existingUris.has(s.uri));
            parsedResult.sources = [...(parsedResult.sources || []), ...newSources];
        }

        saveHistoryItem({
            type: 'general-topics',
            query: mainTopic,
            resultSummary: parsedResult.summary.slice(0, 150) + '...',
            data: parsedResult
        });

        return parsedResult;

    } catch (error) {
        handleGeminiError(error, 'fetchGeneralTopicAnalysis');
    }
}

export async function fetchBookResults(query: string, formats: string[], contentTypes: string[], languages: string[], instruction: string, settings: AppSettings): Promise<BookResult[]> {
    try {
        const ai = getAiClient(settings, 'book-search');
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedQuery = (query || '').substring(0, 500);
        const prompt = `
            ${truncatedInstruction}
            Find books or articles for query: "${truncatedQuery}".
            - Formats: ${formats.join(', ')}
            - Content Types: ${contentTypes.join(', ')}
            - Languages: ${languages.join(', ')}
            Your entire response MUST be a single, valid JSON array of BookResult objects.
            Each object must have: title, summary, authors (array), publicationYear, source, downloadLinks (array of {format, url}), and optional imageUrl.
            The 'url' in each download link MUST be a direct, working URL from your web search.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<BookResult[]>(response.text, []);

        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult as BookResult] : []);

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
            resultsArray.forEach((book: BookResult) => {
                book.groundingSources = groundingSources;
            });
        }
        return resultsArray as BookResult[];
    } catch (error) {
        handleGeminiError(error, 'fetchBookResults');
    }
}

export async function fetchCryptoData(type: string, timeframe: string, count: number, instruction: string, settings: AppSettings, ids?: string[]): Promise<CryptoCoin[]> {
    try {
        const ai = getAiClient(settings, 'crypto-data');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedIds = (ids || []).join(', ').substring(0, 1000);

        const prompt = `
            ${truncatedInstruction}\nFetch ${count} crypto coins. Type: ${type}. Timeframe: ${timeframe}. ${ids ? `IDs: ${truncatedIds}` : ''}
            Your entire response MUST be a single, valid JSON array of CryptoCoin objects.
            Do not include any other text or markdown formatting.
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}]}};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<CryptoCoin[]>(response.text, []);
        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult as CryptoCoin] : []);
        return resultsArray as CryptoCoin[];
    } catch (error) {
        handleGeminiError(error, 'fetchCryptoData');
    }
}
export async function fetchCoinList(instruction: string, settings: AppSettings): Promise<SimpleCoin[]> {
    try {
        const ai = getAiClient(settings, 'crypto-data');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);

        const prompt = `
            ${truncatedInstruction}\nFetch a list of all major crypto coins.
            Your entire response MUST be a single, valid JSON array of SimpleCoin objects.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<SimpleCoin[]>(response.text, []);
        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult as SimpleCoin] : []);
        return resultsArray as SimpleCoin[];
    } catch (error) {
        handleGeminiError(error, 'fetchCoinList');
    }
}
export async function searchCryptoCoin(query: string, instruction: string, settings: AppSettings): Promise<CryptoSearchResult> {
    try {
        const ai = getAiClient(settings, 'crypto-search');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedQuery = (query || '').substring(0, 200);

        const prompt = `
            ${truncatedInstruction}
            Search for crypto coin: "${truncatedQuery}"
            Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must adhere to this structure with example values:
            \`\`\`json
            {
              "coin": { "id": "bitcoin", "symbol": "BTC", "name": "بیت‌کوین", "image": "https://example.com/btc.png", "price_usd": 65000.00, "price_toman": 3900000000, "price_change_percentage_24h": -2.5, "market_cap_usd": 1300000000000, "market_cap_toman": 78000000000000000 },
              "summary": "خلاصه‌ای درباره بیت‌کوین...",
              "sources": [{ "name": "CoinMarketCap", "link": "https://coinmarketcap.com", "credibility": "بسیار معتبر" }]
            }
            \`\`\`
            The 'link' for each source MUST be a direct, working URL from your web search.
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: CryptoSearchResult = {
            coin: { id: '', symbol: '', name: 'نامشخص', image: '', price_usd: 0, price_toman: 0, price_change_percentage_24h: 0, market_cap_usd: 0, market_cap_toman: 0 },
            summary: 'پاسخ دریافت نشد.',
            sources: []
        };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<CryptoSearchResult>>(response.text, {}) };
        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web);
        if (groundingSources) {
            parsedResult.groundingSources = groundingSources;
        }
        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'searchCryptoCoin');
    }
}
export async function fetchCryptoAnalysis(coinName: string, instruction: string, settings: AppSettings): Promise<CryptoAnalysisResult> {
    try {
        const ai = getAiClient(settings, 'crypto-analysis');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedCoinName = (coinName || '').substring(0, 200);

        const prompt = `
            ${truncatedInstruction}
            Analyze crypto coin: "${truncatedCoinName}"
            Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must adhere to this structure with example values:
            \`\`\`json
            {
              "coinName": "اتریوم",
              "symbol": "ETH",
              "summary": "خلاصه تحلیل...",
              "technicalAnalysis": { "title": "تحلیل تکنیکال", "content": "محتوای تحلیل...", "keyLevels": { "support": ["$3000", "$2800"], "resistance": ["$3500", "$3800"] } },
              "fundamentalAnalysis": { "title": "تحلیل فاندامنتال", "content": "محتوای تحلیل...", "keyMetrics": [{ "name": "Total Value Locked", "value": "$50B" }] },
              "sentimentAnalysis": { "title": "تحلیل احساسات بازار", "content": "محتوای تحلیل...", "score": 75 },
              "futureOutlook": "چشم‌انداز آینده..."
            }
            \`\`\`
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: CryptoAnalysisResult = {
            coinName: 'نامشخص',
            symbol: '',
            summary: 'پاسخ دریافت نشد.',
            technicalAnalysis: { title: '', content: '', keyLevels: { support: [], resistance: [] } },
            fundamentalAnalysis: { title: '', content: '', keyMetrics: [] },
            sentimentAnalysis: { title: '', content: '', score: 0 },
            futureOutlook: ''
        };
        const parsedResult = safeJsonParse<Partial<CryptoAnalysisResult>>(response.text, {});
        
        const finalResult = {
            ...defaultResult,
            ...parsedResult,
            technicalAnalysis: { ...defaultResult.technicalAnalysis, ...(parsedResult.technicalAnalysis || {}) },
            fundamentalAnalysis: { ...defaultResult.fundamentalAnalysis, ...(parsedResult.fundamentalAnalysis || {}) },
            sentimentAnalysis: { ...defaultResult.sentimentAnalysis, ...(parsedResult.sentimentAnalysis || {}) },
        };

        saveHistoryItem({
            type: 'crypto-analysis',
            query: `تحلیل ${coinName}`,
            resultSummary: finalResult.summary.slice(0, 150) + '...',
            data: finalResult
        });

        return finalResult;
    } catch (error) {
        handleGeminiError(error, 'fetchCryptoAnalysis');
    }
}
export async function analyzeContentDeeply(topic: string, file: any, instruction: string, settings: AppSettings, instructionKey: AIInstructionType): Promise<AnalysisResult> {
    try {
        const ai = getAiClient(settings, instructionKey);

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedTopic = (topic || '').substring(0, MAX_TOPIC_LENGTH);

        const contentParts: any[] = [{ text: `
            ${truncatedInstruction}
            Analyze topic: ${truncatedTopic}
            Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must adhere to this structure with example values:
            \`\`\`json
            {
                "understanding": "درک من از موضوع...",
                "analysis": "<h1>تحلیل</h1><p>متن تحلیل به صورت HTML...</p>",
                "proponentPercentage": 70,
                "proponents": [{ "name": "نام موافق", "argument": "استدلال...", "scientificLevel": 4 }],
                "opponents": [{ "name": "نام مخالف", "argument": "استدلال...", "scientificLevel": 3 }],
                "examples": [{ "title": "عنوان مثال", "content": "محتوای مثال..." }],
                "mentionedSources": [{ "title": "عنوان منبع", "url": "https://example.com", "sourceCredibility": "معتبر", "argumentCredibility": "معتبر" }],
                "techniques": ["تکنیک ۱", "تکنیک ۲"],
                "suggestions": [{ "title": "پیشنهاد ۱", "url": "https://example.com/suggestion" }]
            }
            \`\`\`
            The 'url' for each object in "mentionedSources" and "suggestions" MUST be a direct, working URL from your web search.
        ` }];
        if(file) contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
        const request = {model: 'gemini-2.5-flash', contents: { parts: contentParts }, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: AnalysisResult = {
            understanding: 'پاسخ دریافت نشد.',
            analysis: '',
            proponentPercentage: 0,
            proponents: [],
            opponents: [],
            examples: [],
            mentionedSources: [],
            techniques: [],
            suggestions: []
        };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<AnalysisResult>>(response.text, {}) };
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            parsedResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }
        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'analyzeContentDeeply');
    }
}
export async function findFallacies(topic: string, file: any, instruction: string, settings: AppSettings): Promise<FallacyResult> {
    try {
        const ai = getAiClient(settings, 'analyzer-fallacy-finder');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedTopic = (topic || '').substring(0, MAX_TOPIC_LENGTH);

        const contentParts: any[] = [{ text: `
            ${truncatedInstruction}
            Find fallacies in: ${truncatedTopic}
            Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must adhere to this structure with example values:
            \`\`\`json
            { "identifiedFallacies": [{ "type": "مغالطه پهلوان‌پنبه", "quote": "نقل قول از متن...", "explanation": "توضیح مغالطه...", "correctedStatement": "بیان اصلاح شده..." }] }
            \`\`\`
        ` }];
        if(file) contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
        const request = {model: 'gemini-2.5-flash', contents: { parts: contentParts }, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: FallacyResult = { identifiedFallacies: [] };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<FallacyResult>>(response.text, {}) };
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            parsedResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }
        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'findFallacies');
    }
}
export async function generateWordPressThemePlan(themeType: string, url: string, desc: string, imgDesc: string, instruction: string, settings: AppSettings): Promise<WordPressThemePlan> {
    try {
        const ai = getAiClient(settings, 'wordpress-theme');

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedDesc = (desc || '').substring(0, 2000);
        const truncatedImgDesc = (imgDesc || '').substring(0, 1000);

        const prompt = `${truncatedInstruction}
        Type: ${themeType}
        Inspiration URL: ${url}
        Description: ${truncatedDesc}
        Image Desc: ${truncatedImgDesc}.
        Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must adhere to this structure with example values:
        \`\`\`json
        {
          "themeName": "نام قالب پیشنهادی",
          "understanding": "درک من از درخواست...",
          "colorPalette": { "primary": "#3B82F6", "secondary": "#6366F1", "accent": "#EC4899", "background": "#111827", "text": "#E5E7EB" },
          "fontPairings": { "headings": "Vazirmatn", "body": "Sahel" },
          "layout": "طرح دو ستونه با سایدبار راست...",
          "features": ["اسلایدر تمام عرض", "بخش آخرین مطالب", "فرم تماس"]
        }
        \`\`\`
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: WordPressThemePlan = {
            themeName: 'نامشخص',
            understanding: 'پاسخ دریافت نشد.',
            colorPalette: {},
            fontPairings: {},
            layout: '',
            features: []
        };
        const parsedResult = safeJsonParse<Partial<WordPressThemePlan>>(response.text, {});
        return {
            ...defaultResult,
            ...parsedResult,
            colorPalette: { ...defaultResult.colorPalette, ...(parsedResult.colorPalette || {}) },
            fontPairings: { ...defaultResult.fontPairings, ...(parsedResult.fontPairings || {}) },
        };
    } catch (error) {
        handleGeminiError(error, 'generateWordPressThemePlan');
    }
}
export async function generateWordPressThemeCode(plan: WordPressThemePlan, file: string, settings: AppSettings): Promise<string> {
    try {
        const ai = getAiClient(settings, 'wordpress-theme');
        const prompt = `Based on this plan: ${JSON.stringify(plan).substring(0, 4000)}\nGenerate the code for the file: ${file}`;
        const request = {model: 'gemini-2.5-flash', contents: prompt};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text.replace(/^```(php|css|js)?\s*|```\s*$/g, '').trim();
    } catch (error) {
        handleGeminiError(error, 'generateWordPressThemeCode');
    }
}
export async function getDebateTurnResponse(transcript: TranscriptEntry[], role: DebateRole, turn: number, config: DebateConfig, isFinal: boolean, instruction: string, provider: AIModelProvider, settings: AppSettings): Promise<GenerateContentResponse> {
    try {
        const ai = getAiClient(settings, 'analyzer-debate', provider);

        const transcriptText = transcript.map(t => `${t.speaker.name} (${debateRoleLabels[t.speaker.role]}): ${t.text}`).join('\n\n');
        const truncatedTranscript = transcriptText.substring(transcriptText.length - 8000);
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);

        let prompt = `${truncatedInstruction}\n
        **Debate Configuration:**
        - Topic: ${config.topic}
        - Quality Level: ${config.qualityLevel}
        - Tone: ${config.tone}
        - Response Length: ${config.responseLength}
        
        **Current Transcript (latest part):**
        ${truncatedTranscript}
        
        ---
        
        **Your Turn:**
        You are **${config.participants.find(p => p.role === role)?.name}** and your role is **${debateRoleLabels[role]}**.
        This is your turn number **${turn}** out of ${config.turnLimit}.
        `;

        if (isFinal && role === 'moderator') {
            prompt += `This is the final turn of the debate. As the moderator, please provide a concise, neutral summary of the entire debate, highlighting the key arguments from each side. Conclude the debate.`;
        } else {
            prompt += `Based on the conversation so far, provide your response according to your role and the configured tone and length. When citing external information, you MUST provide a direct, working URL from your web search results.`;
        }

        const request = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response;
    } catch (error) {
        handleGeminiError(error, 'getDebateTurnResponse');
    }
}

export async function analyzeFinalDebate(transcript: TranscriptEntry[], settings: AppSettings): Promise<FinalDebateAnalysis> {
    try {
        const ai = getAiClient(settings, 'debate-final-analysis');
        const instruction = settings.aiInstructions['debate-final-analysis'];
        const transcriptText = transcript.map(t => `${t.speaker.name} (${debateRoleLabels[t.speaker.role]}): ${t.text}`).join('\n\n');
        const truncatedTranscript = transcriptText.substring(transcriptText.length - 15000); // Larger context for final analysis

        const participantNames = [...new Set(transcript.map(t => t.speaker.name))].join(', ');

        const prompt = `${instruction}
**Full Debate Transcript:**
${truncatedTranscript}

---
Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must adhere to this structure with example values:
\`\`\`json
{
  "summary": "خلاصه‌ای بی‌طرفانه از نکات اصلی مناظره...",
  "conclusion": "نتیجه‌گیری نهایی و دلیل اعلام برنده...",
  "keyArguments": {
    "proponent": ["استدلال کلیدی موافق ۱", "..."],
    "opponent": ["استدلال کلیدی مخالف ۱", "..."]
  },
  "performanceAnalysis": {
    "نام شرکت‌کننده ۱": {
      "knowledgeLevel": 8,
      "eloquence": 7,
      "argumentStrength": 9,
      "fallacyCount": 1,
      "feedback": "بازخورد سازنده برای این شرکت‌کننده..."
    }
  },
  "winner": "نام شرکت‌کننده برنده یا tie"
}
\`\`\`
Provide a detailed performance analysis for each participant: ${participantNames}.
`;

        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: FinalDebateAnalysis = {
            summary: 'پاسخ دریافت نشد.',
            conclusion: '',
            keyArguments: { proponent: [], opponent: [] },
            performanceAnalysis: {},
            winner: 'نامشخص',
        };
        const parsedResult = safeJsonParse<Partial<FinalDebateAnalysis>>(response.text, {});
        return {
            ...defaultResult,
            ...parsedResult,
            keyArguments: { ...defaultResult.keyArguments, ...(parsedResult.keyArguments || {}) },
        };
    } catch (error) {
        handleGeminiError(error, 'analyzeFinalDebate');
    }
}

export async function getAIOpponentResponse(
    transcript: ConductDebateMessage[],
    config: ConductDebateConfig,
    instruction: string,
    settings: AppSettings
): Promise<GenerateContentResponse> {
    try {
        const ai = getAiClient(settings, 'analyzer-user-debate', config.aiModel);
        const transcriptText = transcript.map(t => `${t.role === 'user' ? 'شما' : 'هوش مصنوعی'}: ${t.text}`).join('\n\n');
        const truncatedTranscript = transcriptText.substring(transcriptText.length - 8000);
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);

        const prompt = `
            ${truncatedInstruction}
            **Debate Topic:** ${config.topic}
            **Your Role:** ${debateRoleLabels[config.aiRole]}

            **Debate Transcript so far (latest part):**
            ${truncatedTranscript}

            ---
            **Your turn:** Based on the user's last message and your role, provide a concise and relevant response in Persian. If you cite external information, provide a direct, working URL from your web search.
        `;
        
        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response;
    } catch (error) {
        handleGeminiError(error, 'getAIOpponentResponse');
    }
}

export async function analyzeUserDebate(
    transcript: ConductDebateMessage[],
    topic: string,
    instruction: string,
    settings: AppSettings
): Promise<DebateAnalysisResult> {
    try {
        const ai = getAiClient(settings, 'analyzer-user-debate');

        const transcriptText = transcript.map(t => `${t.role === 'user' ? 'User' : 'AI'}: ${t.text}`).join('\n\n');
        const truncatedTranscript = transcriptText.substring(transcriptText.length - 8000);

        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);

        const prompt = `
            ${truncatedInstruction}
            Analyze the following debate transcript on the topic "${topic}".
            Focus primarily on the **User's** performance, but compare it to the AI's to determine a winner.
            The latest part of the transcript is provided below for context.
            Your entire output must be in Persian.
            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must adhere to this structure with example values:
            \`\`\`json
            {
                "summary": "خلاصه‌ای بی‌طرفانه از نکات اصلی مناظره...",
                "performanceAnalysis": { 
                    "knowledgeLevel": 8, 
                    "eloquence": 7, 
                    "argumentStrength": 9, 
                    "feedback": "بازخورد سازنده و توصیه‌هایی برای کاربر..." 
                },
                "fallacyDetection": [{ "fallacyType": "مغالطه پهلوان‌پنبه", "userQuote": "نقل قول کاربر...", "explanation": "توضیح مغالطه..." }],
                "overallScore": 85,
                "winner": "user",
                "conclusion": "نتیجه‌گیری نهایی و دلیل اعلام برنده..."
            }
            \`\`\`
        `;

        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            },
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: DebateAnalysisResult = {
            summary: 'پاسخ دریافت نشد.',
            performanceAnalysis: { knowledgeLevel: 0, eloquence: 0, argumentStrength: 0, feedback: '' },
            fallacyDetection: [],
            overallScore: 0
        };
        const parsedResult = safeJsonParse<Partial<DebateAnalysisResult>>(response.text, {});
        return {
            ...defaultResult,
            ...parsedResult,
            performanceAnalysis: { ...defaultResult.performanceAnalysis, ...(parsedResult.performanceAnalysis || {}) },
        };
    } catch (error) {
        handleGeminiError(error, 'analyzeUserDebate');
    }
}

export async function findFeedsWithAI(category: SourceCategory, existing: RSSFeed[], settings: AppSettings): Promise<Partial<RSSFeed>[]> {
    try {
        const ai = getAiClient(settings);
        const truncatedExisting = existing.slice(0, 50).map(f => f.url).join(', ').substring(0, 1000);
        const prompt = `
            Find 5 new RSS feeds for category "${category}", excluding these URLs: ${truncatedExisting}
            Your entire response MUST be a single, valid JSON array of objects. Each object MUST have "name" and "url" properties. The 'url' MUST be a direct, working URL from your web search.
            Do not include any other text or markdown formatting.
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<Partial<RSSFeed>[]>(response.text, []);
        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult] : []);
        return resultsArray as Partial<RSSFeed>[];
    } catch (error) {
        handleGeminiError(error, 'findFeedsWithAI');
    }
}

export async function generateEditableListItems(listName: string, listType: string, count: number, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings);
        const prompt = `Generate a list of ${count} items for a settings page. The list is for "${listName}". Return a JSON array of strings.`;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsed = safeJsonParse<any[]>(response.text, []);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((item): item is string => typeof item === 'string');
    } catch (error) {
        handleGeminiError(error, 'generateEditableListItems');
    }
}

export async function generateResearchKeywords(topic: string, field: string, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings, 'research-analysis');
        const prompt = `Based on the research topic "${topic}" in the field of "${field || 'general knowledge'}", generate 5 highly relevant and specific academic keywords to aid in searching for scholarly articles. Return a JSON array of strings.`;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }};
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsed = safeJsonParse<any[]>(response.text, []);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is string => typeof item === 'string');
    } catch (error) {
        handleGeminiError(error, 'generateResearchKeywords');
    }
}

export async function fetchResearchData(topic: string, field: string, keywords: string[], settings: AppSettings): Promise<ResearchResult> {
    try {
        const ai = getAiClient(settings, 'research-analysis');
        const prompt = `
            ${settings.aiInstructions['research-analysis']}
            **Topic:** ${topic}
            **Field:** ${field || 'General'}
            **Keywords:** ${keywords.join(', ')}

            Your entire response must be a single, valid JSON object, with all text in Persian. Do not include any other text or markdown formatting. The JSON must strictly adhere to this structure with example values:
            \`\`\`json
            {
              "understanding": "درک من از موضوع تحقیق...",
              "comprehensiveSummary": "خلاصه جامع و بی‌طرفانه...",
              "credibilityScore": 85,
              "viewpointDistribution": {
                "proponentPercentage": 60,
                "opponentPercentage": 30,
                "neutralPercentage": 10
              },
              "proponents": [
                { "name": "نام محقق یا گروه موافق", "argument": "استدلال اصلی آنها...", "scientificLevel": 4 }
              ],
              "opponents": [
                { "name": "نام محقق یا گروه مخالف", "argument": "استدلال اصلی آنها...", "scientificLevel": 3 }
              ],
              "neutral": [
                { "name": "نام محقق یا گروه بی‌طرف", "argument": "استدلال اصلی آنها...", "scientificLevel": 4 }
              ],
              "academicSources": [
                { "title": "عنوان مقاله علمی", "link": "https://example.com/paper.pdf", "snippet": "بخش کوتاهی از مقاله..." }
              ]
            }
            \`\`\`
            The 'link' for each academic source MUST be a direct, working URL from your web search.
        `;
        const request = { model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{ googleSearch: {} }] } };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: ResearchResult = {
            understanding: 'پاسخ دریافت نشد.',
            comprehensiveSummary: '',
            credibilityScore: 0,
            viewpointDistribution: { proponentPercentage: 0, opponentPercentage: 0, neutralPercentage: 0 },
            proponents: [],
            opponents: [],
            neutral: [],
            academicSources: [],
            webSources: []
        };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<ResearchResult>>(response.text, {}) };

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            parsedResult.webSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }

        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'fetchResearchData');
    }
}


export async function fetchStatisticalResearch(mainTopic: string, comparisonTopics: string[], keywords: string[], settings: AppSettings): Promise<StatisticalResearchResult> {
    try {
        const ai = getAiClient(settings, 'statistical-research');
        const prompt = `
            ${settings.aiInstructions['statistical-research']}
            **Main Topic:** ${mainTopic}
            **Comparison Topics:** ${comparisonTopics.join(' vs ')}
            **Keywords:** ${keywords.join(', ')}

            Your entire response must be a single valid JSON object adhering to this structure with example values. All text must be in Persian:
            \`\`\`json
            {
              "understanding": "درک من از موضوع تحقیق آماری...",
              "summary": "خلاصه‌ای از نتایج آماری...",
              "validationMetrics": {
                "credibilityValidation": "تحلیل اعتبار داده‌ها...",
                "statisticalCredibilityScore": 90,
                "documentCredibility": "اعتبار اسناد: بالا",
                "typeOfStatistics": "توصیفی",
                "statisticalMethod": "تحلیل رگرسیون",
                "participants": "1500 نفر",
                "samplingMethod": "تصادفی طبقه‌بندی شده",
                "methodCredibilityPercentage": 95
              },
              "charts": [
                {
                  "type": "bar",
                  "title": "نمودار مقایسه‌ای",
                  "labels": ["گروه الف", "گروه ب"],
                  "datasets": [{ "label": "میزان رضایت", "data": [75, 60] }]
                }
              ],
              "proponents": [
                { "name": "نام گروه موافق", "argument": "استدلال آنها...", "scientificLevel": 5 }
              ],
              "opponents": [
                { "name": "نام گروه مخالف", "argument": "استدلال آنها...", "scientificLevel": 4 }
              ],
              "neutral": [
                { "name": "نام گروه بی‌طرف", "argument": "استدلال آنها...", "scientificLevel": 4 }
              ],
              "academicSources": [
                { "title": "عنوان مقاله مرتبط", "link": "https://example.com/source.pdf", "snippet": "بخش کوتاهی از مقاله..." }
              ],
              "relatedTopics": [
                { "title": "موضوع مرتبط", "link": "https://example.com/related" }
              ]
            }
            \`\`\`
            All 'link' properties MUST be direct, working URLs from your web search.
        `;
        const request = { model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{ googleSearch: {} }] } };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: StatisticalResearchResult = {
            understanding: 'پاسخ دریافت نشد.',
            summary: '',
            validationMetrics: { credibilityValidation: '', statisticalCredibilityScore: 0, documentCredibility: '', typeOfStatistics: '', statisticalMethod: '', participants: 0, samplingMethod: '', methodCredibilityPercentage: 0 },
            charts: [],
            proponents: [],
            opponents: [],
            neutral: [],
            academicSources: [],
            relatedTopics: []
        };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<StatisticalResearchResult>>(response.text, {}) };

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            parsedResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }
        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'fetchStatisticalResearch');
    }
}
export async function generateArticleKeywords(topic: string, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings, 'article-search-academic'); // or a more general one
        const prompt = `Based on the research topic "${topic}", generate 5 highly relevant and specific academic or journalistic keywords to aid in searching for articles. Return a JSON array of strings.`;
        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsed = safeJsonParse<any[]>(response.text, []);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is string => typeof item === 'string');
    } catch (error) {
        handleGeminiError(error, 'generateArticleKeywords');
    }
}

export async function fetchArticles(topic: string, keywords: string[], languages: string[], type: 'academic' | 'journalistic', instruction: string, settings: AppSettings): Promise<ArticleSearchResult[]> {
    try {
        const ai = getAiClient(settings, type === 'academic' ? 'article-search-academic' : 'article-search-journalistic');
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedTopic = (topic || '').substring(0, 1000);
        const prompt = `
            ${truncatedInstruction}
            Search for ${type} articles.
            - Topic: "${truncatedTopic}"
            - Keywords: ${keywords.join(', ')}
            - Languages: ${languages.join(', ')}
            Your entire response MUST be a single, valid JSON array of objects. Each object must have "title", "summary", and "link".
            The 'link' MUST be a direct, working URL from your web search.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<any>(response.text, []);

        const resultsArray = Array.isArray(parsedResult) ? parsedResult : (parsedResult && Object.keys(parsedResult).length > 0 ? [parsedResult] : []);

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
            resultsArray.forEach((article: ArticleSearchResult) => {
                article.groundingSources = groundingSources;
            });
        }
        return resultsArray as ArticleSearchResult[];
    } catch (error) {
        handleGeminiError(error, 'fetchArticles');
    }
}

export async function fetchArticleContent(url: string, settings: AppSettings): Promise<string> {
    try {
        const ai = getAiClient(settings);
        const prompt = `Access the content of the article at this URL: ${url}. Extract the main body of the article, clean it of ads, navigation, and comments, and return it as a well-formatted, clean HTML string. Use paragraphs, headings, lists, etc., as appropriate.`;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text.replace(/^```html\s*|```\s*$/g, '').trim();
    } catch (error) {
        handleGeminiError(error, 'fetchArticleContent');
    }
}

export async function validateSite(topic: string, keywords: string[], settings: AppSettings): Promise<SiteValidationResult> {
    try {
        const ai = getAiClient(settings, 'validation-site');
        const instruction = settings.aiInstructions['validation-site'];
        const prompt = `
            ${instruction}
            - Site to validate: "${topic}"
            - Keywords for focus: ${keywords.join(', ')}
            Your entire response MUST be a single, valid JSON object with all text in Persian. Do not include any other text or markdown formatting. The JSON must include all fields as defined in the SiteValidationResult structure, with example values:
            \`\`\`json
            {
                "siteName": "نام سایت",
                "mainUrl": "https://example.com",
                "socialMedia": [{ "platform": "Twitter", "url": "https://twitter.com/example" }],
                "isActive": true,
                "lastActivityDate": "۱۴۰۳/۰۵/۰۱",
                "archiveUrl": "https://web.archive.org/web/*/https://example.com",
                "credibilityAnalysis": "تحلیل اعتبار...",
                "credibilityScore": 75,
                "fundingSources": { "analysis": "تحلیل منابع مالی...", "hasExternalFunding": false, "knownFunders": [] },
                "sponsoredProjects": { "analysis": "تحلیل پروژه‌های اسپانسری...", "hasSponsoredProjects": true, "projects": [{ "name": "پروژه نمونه", "client": "مشتری نمونه" }] },
                "registrationLocation": "مکان ثبت",
                "founder": "نام موسس",
                "totalProjects": 10,
                "certifications": ["گواهی‌نامه نمونه"],
                "expertCount": 5,
                "fieldOfWork": "حوزه کاری"
            }
            \`\`\`
            CRITICAL: All URLs provided in the JSON response (e.g., 'mainUrl', 'socialMedia.url', 'archiveUrl') **MUST** be real, working URLs discovered through your web search. Do not invent or guess URLs.
        `;
        const request = { model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{ googleSearch: {} }] } };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: SiteValidationResult = {
            siteName: 'نامشخص',
            mainUrl: '',
            socialMedia: [],
            isActive: false,
            credibilityAnalysis: 'پاسخ دریافت نشد.',
            credibilityScore: 0,
            fundingSources: { analysis: '', hasExternalFunding: false, knownFunders: [] },
            sponsoredProjects: { analysis: '', hasSponsoredProjects: false, projects: [] },
            registrationLocation: '',
            founder: '',
            totalProjects: 0,
            certifications: [],
            expertCount: 0,
            fieldOfWork: ''
        };
        const parsedResult = safeJsonParse<Partial<SiteValidationResult>>(response.text, {});
        const finalResult = { 
            ...defaultResult,
            ...parsedResult,
            fundingSources: { ...defaultResult.fundingSources, ...(parsedResult.fundingSources || {}) },
            sponsoredProjects: { ...defaultResult.sponsoredProjects, ...(parsedResult.sponsoredProjects || {}) },
        };

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            finalResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }
        return finalResult;
    } catch (error) {
        handleGeminiError(error, 'validateSite');
    }
}

export async function validateArticleOrDoc(topic: string, file: { data: string, mimeType: string } | null, type: 'article' | 'document', settings: AppSettings): Promise<SiteValidationResult> {
    try {
        const instructionKey: AIInstructionType = type === 'article' ? 'validation-article' : 'validation-document';
        const ai = getAiClient(settings, instructionKey);
        const instruction = settings.aiInstructions[instructionKey];

        const contentParts: any[] = [];
        const prompt = `
            ${instruction}
            - ${type === 'article' ? 'Article' : 'Document'} to validate: "${topic || 'see attached file'}"
            Your entire response MUST be a single, valid JSON object matching the SiteValidationResult structure. Do not include any other text or markdown formatting.
            CRITICAL: All URLs provided in the JSON response (e.g., 'mainUrl', 'socialMedia.url', 'archiveUrl') **MUST** be real, working URLs discovered through your web search. Do not invent or guess URLs.
        `;
        contentParts.push({ text: prompt });

        if (file) {
            contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
        }
        
        const request = { model: 'gemini-2.5-flash', contents: { parts: contentParts }, config: { tools: [{ googleSearch: {} }] } };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultResult: SiteValidationResult = {
            siteName: 'نامشخص',
            mainUrl: '',
            socialMedia: [],
            isActive: false,
            credibilityAnalysis: 'پاسخ دریافت نشد.',
            credibilityScore: 0,
            fundingSources: { analysis: '', hasExternalFunding: false, knownFunders: [] },
            sponsoredProjects: { analysis: '', hasSponsoredProjects: false, projects: [] },
            registrationLocation: '',
            founder: '',
            totalProjects: 0,
            certifications: [],
            expertCount: 0,
            fieldOfWork: ''
        };
        const parsedResult = safeJsonParse<Partial<SiteValidationResult>>(response.text, {});
        const finalResult = {
            ...defaultResult,
            ...parsedResult,
            fundingSources: { ...defaultResult.fundingSources, ...(parsedResult.fundingSources || {}) },
            sponsoredProjects: { ...defaultResult.sponsoredProjects, ...(parsedResult.sponsoredProjects || {}) },
        };
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            finalResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }
        return finalResult;
    } catch (error) {
        handleGeminiError(error, 'validateArticleOrDoc');
    }
}

export async function compareSites(siteA: string, siteB: string, settings: AppSettings): Promise<ComparisonValidationResult> {
    try {
        const ai = getAiClient(settings, 'validation-comparison');
        const instruction = settings.aiInstructions['validation-comparison'];
        const prompt = `
            ${instruction}
            - Site A: "${siteA}"
            - Site B: "${siteB}"
            Your entire response MUST be a single, valid JSON object matching the ComparisonValidationResult structure. This requires you to first internally generate TWO full SiteValidationResult objects for Site A and Site B, including all fields like registrationLocation, founder, totalProjects, expertCount, etc. Then, create the final comparison object. For the \`comparativeScores\` array, generate scores (0-100) for these specific aspects: 'Financial Transparency', 'Technical Expertise', 'Public Trust', 'Activity Level', and 'Source Credibility'. Do not include any other text or markdown formatting.
            CRITICAL: All URLs provided in the JSON response (e.g., 'mainUrl', 'socialMedia.url', 'archiveUrl') **MUST** be real, working URLs discovered through your web search. Do not invent or guess URLs.
        `;
        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        };
        const response = await generateContentWithRetry(ai, request, settings);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const defaultSiteResult: SiteValidationResult = {
            siteName: 'نامشخص',
            mainUrl: '',
            socialMedia: [],
            isActive: false,
            credibilityAnalysis: 'پاسخ دریافت نشد.',
            credibilityScore: 0,
            fundingSources: { analysis: '', hasExternalFunding: false, knownFunders: [] },
            sponsoredProjects: { analysis: '', hasSponsoredProjects: false, projects: [] },
            registrationLocation: '',
            founder: '',
            totalProjects: 0,
            certifications: [],
            expertCount: 0,
            fieldOfWork: ''
        };
        const defaultResult: ComparisonValidationResult = {
            siteA: defaultSiteResult,
            siteB: defaultSiteResult,
            comparisonSummary: 'پاسخ دریافت نشد.',
            comparativeScores: []
        };
        const parsedResult = { ...defaultResult, ...safeJsonParse<Partial<ComparisonValidationResult>>(response.text, {}) };
        
        // Safeguard to ensure the structure is correct before returning
        if (!parsedResult || !parsedResult.siteA || !parsedResult.siteB || !parsedResult.comparativeScores) {
            console.error("Malformed JSON response from compareSites despite JSON mode:", parsedResult);
            throw new Error("پاسخ دریافت شده از هوش مصنوعی ساختار مورد انتظار را ندارد. ممکن است به دلیل پیچیدگی درخواست باشد. لطفاً دوباره تلاش کنید.");
        }
        
        return parsedResult;
    } catch (error) {
        if (error instanceof Error && error.message.includes("ساختار مورد انتظار")) {
            throw error;
        }
        handleGeminiError(error, 'compareSites');
    }
}