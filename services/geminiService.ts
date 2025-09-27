

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
    ApiKeyStatus
} from '../types';

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
        // Use a double assertion to bypass strict type checking when the response is already a JSON object.
        // This resolves issues where TypeScript infers array types as 'unknown[]' which cannot be assigned to more specific types like 'string[]'.
        return data as unknown as T;
    }

    const jsonString = data as string | undefined | null;

    if (typeof jsonString !== 'string' || !jsonString.trim()) {
        console.error("Failed to parse JSON from model: input is not a valid string.", { input: jsonString });
        return fallback;
    }
    try {
        const markdownMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
        if (markdownMatch && markdownMatch[1]) {
            // Use a double assertion to bypass strict type checking after parsing.
            return JSON.parse(markdownMatch[1]) as unknown as T;
        }
        const firstBracket = jsonString.indexOf('[');
        const firstBrace = jsonString.indexOf('{');
        let start = -1;
        if (firstBracket === -1 && firstBrace === -1) {
            console.error("No JSON object or array found in the string.", { input: jsonString });
            return fallback;
        }
        if (firstBracket === -1) start = firstBrace;
        else if (firstBrace === -1) start = firstBracket;
        else start = Math.min(firstBracket, firstBrace);
        const end = (jsonString[start] === '{') ? jsonString.lastIndexOf('}') : jsonString.lastIndexOf(']');
        if (start === -1 || end === -1) {
            console.error("Mismatched JSON brackets in the string.", { input: jsonString });
            return fallback;
        }
        const jsonPart = jsonString.substring(start, end + 1);
        // Use a double assertion to bypass strict type checking after parsing.
        return JSON.parse(jsonPart) as unknown as T;
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
    if (errorMessage.includes('implementation is not yet available')) {
        throw new Error(error.message); // Rethrow the user-friendly message to be caught by the UI
    }
    
    let status: ApiKeyStatus = 'network_error';
    let userMessage = 'خطا در ارتباط با سرویس هوش مصنوعی Gemini. لطفاً اتصال اینترنت خود را بررسی کنید.';

    if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        status = 'quota_exceeded';
        userMessage = 'شما از سقف استفاده رایگان خود از API هوش مصنوعی Gemini عبور کرده‌اید.';
    } else if (errorMessage.includes('500') || errorMessage.includes('Internal error') || errorMessage.includes('xhr error')) {
        status = 'network_error';
        userMessage = 'سرویس هوش مصنوعی Gemini با یک خطای داخلی مواجه شد. لطفاً بعداً دوباره تلاش کنید.';
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
async function generateContentWithRetry(ai: GoogleGenAI, request: any, retries: number = 2, delay: number = 1000): Promise<GenerateContentResponse> {
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await ai.models.generateContent(request);
            return response;
        } catch (error: any) {
            lastError = error;
            const errorMessage = error.toString();
            // Only retry on 500-level errors or network issues ("xhr error")
            if ((errorMessage.includes('500') || errorMessage.includes('xhr error')) && i < retries) {
                console.warn(`Gemini API call failed (attempt ${i + 1}/${retries + 1}). Retrying in ${delay * (i + 1)}ms...`);
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
        if (!apiKey) {
            // This will be caught by handleGeminiError and shown to user
            throw new Error("Fallback to Gemini failed: Gemini API key not configured.");
        }
        return new GoogleGenAI({ apiKey });
    }

    switch (provider) {
        case 'gemini':
            const apiKey = settings.aiModelSettings.gemini.apiKey || process.env.API_KEY;
            if (!apiKey) {
                // This will be caught by handleGeminiError and shown to user
                throw new Error("Gemini API key not configured.");
            }
            return new GoogleGenAI({ apiKey });
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
        await generateContentWithRetry(ai, {
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
            Each article object must have these keys: title, summary, link (must be a direct, working URL to the article), source, publicationTime (in Persian Jalali format), credibility, category, imageUrl.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const result = safeJsonParse<{ articles: NewsArticle[], suggestions: string[] }>(response.text, { articles: [], suggestions: [] });
        
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
    const cacheKey = `live-news-${tabId}`;
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
            - "link": string (A direct, working URL to the full article)
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
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const result = safeJsonParse<NewsArticle[]>(response.text, []);
        
        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web);
        if (groundingSources) {
            result.forEach(article => {
                article.groundingSources = groundingSources;
            });
        }

        cache.set(cacheKey, result, 10 * 60 * 1000);
        return result;
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
            Your entire response MUST be a single, valid JSON array of objects. Each object must have "title" and "link" properties.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const result = safeJsonParse<TickerArticle[]>(response.text, []);
        cache.set(cacheKey, result, 30 * 60 * 1000);
        return result;
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
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        // FIX: Using a generic type of `any[]` for `safeJsonParse` avoids potential TypeScript inference errors with `unknown[]`,
        // while the subsequent `filter` call ensures the function's return type remains a clean `string[]`.
        const parsed = safeJsonParse<any[]>(response.text, []);
        if (!Array.isArray(parsed)) {
            console.error("generateDynamicFilters expected an array but got object:", parsed);
            return [];
        }
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
    const cacheKey = `rss-feeds-${feeds.map(f => f.id).join('-')}-${query || ''}`;
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
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const result = safeJsonParse<NewsArticle[]>(response.text, []);
        
        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web);
        if (groundingSources) {
            result.forEach(article => {
                article.groundingSources = groundingSources;
            });
        }
        
        cache.set(cacheKey, result, 20 * 60 * 1000);
        return result;
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
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult: FactCheckResult = safeJsonParse<FactCheckResult>(response.text, { overallCredibility: "Error", summary: "Failed to parse model response.", sources: [] });
        
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            parsedResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }

        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'factCheckNews');
    }
}

export async function analyzeMedia(
    url: string | null,
    file: { data: string, mimeType: string } | null,
    userPrompt: string,
    instruction: string,
    settings: AppSettings
): Promise<MediaAnalysisResult> {
    try {
        const ai = getAiClient(settings, 'analyzer-media');

        const contentParts: any[] = [];
        
        const truncatedInstruction = (instruction || '').substring(0, MAX_INSTRUCTION_LENGTH);
        const truncatedUserPrompt = (userPrompt || '').substring(0, 1000);
        
        let prompt = `
            ${truncatedInstruction}
            Analyze the provided media content based on the user's request. Use a real-time web search to find context and verify claims.
            User request: "${truncatedUserPrompt}"
            ${url ? `The main content is at this URL: ${url}` : 'The main content is in the attached file.'}

            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting.
            The JSON object must have the following structure:
            {
              "summary": "string (A comprehensive summary of the media content in Persian.)",
              "transcript": "string (The full, accurate transcription of dialogues in the video, in Persian. Leave this field empty if it's an image.)",
              "analyzedClaims": [
                {
                  "claimText": "string (The exact text of the claim being made.)",
                  "timestamp": "string (The exact timestamp of the claim in the video (e.g., '02:35'). Use 'N/A' for images.)",
                  "credibility": "integer (A credibility score for the claim from 0 to 100.)",
                  "analysis": "string (A short, neutral analysis of the claim's validity and credibility.)"
                }
              ],
              "critique": {
                "logic": "string (Critique of logical fallacies.)",
                "science": "string (Critique of scientific inaccuracies.)",
                "argumentation": "string (Critique of argumentation flaws.)",
                "rhetoric": "string (Critique of rhetoric and delivery.)",
                "grammar": "string (Critique of grammatical errors.)",
                "evidence": "string (Critique of evidence and sources provided.)",
                "philosophy": "string (Critique of philosophical flaws.)"
              }
            }
        `;
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
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<MediaAnalysisResult>(response.text, {} as MediaAnalysisResult);
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            parsedResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }
        return parsedResult;
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
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text;
    } catch (error) {
        handleGeminiError(error, 'generateAIInstruction');
    }
}

export async function testAIInstruction(instruction: string, settings: AppSettings): Promise<boolean> {
    const apiKey = settings.aiModelSettings.gemini.apiKey || process.env.API_KEY;
    if (!apiKey) {
        handleGeminiError(new Error("Gemini API key not configured."), 'testAIInstruction');
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey });
        const request = {
            model: "gemini-2.5-flash",
            contents: "Test prompt",
            config: { systemInstruction: instruction, maxOutputTokens: 5 }
        };
        await generateContentWithRetry(ai, request);
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
            Each object must have these keys: name, field, url, activity, credibility, region.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<Partial<Source>[]>(response.text, []);
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
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<PodcastResult[]>(response.text, []);

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
            parsedResult.forEach(podcast => {
                podcast.groundingSources = groundingSources;
            });
        }

        return parsedResult;
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
          Do not include any other text or markdown formatting.
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<{ results: WebResult[], suggestions: string[] }>(response.text, { results: [], suggestions: [] });
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
        const response = await generateContentWithRetry(ai, request);
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
        const response = await generateContentWithRetry(ai, request);
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
        const response = await generateContentWithRetry(ai, request);
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
        const response = await generateContentWithRetry(ai, request);
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
        const response = await generateContentWithRetry(ai, request);
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
          Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must strictly adhere to this structure:
          {
            "title": "string",
            "summary": "string",
            "keywords": ["string"],
            "chart": { "type": "bar" | "pie" | "line" | "table", "title": "string", "labels": ["string"], "datasets": [{ "label": "string", "data": [number] }] },
            "sourceDetails": { "name": "string", "link": "string", "author": "string", "publicationDate": "string", "credibility": "string" },
            "analysis": { "acceptancePercentage": number, "currentValidity": "string", "alternativeResults": "string" },
            "relatedSuggestions": ["string"]
          }
        `;
        const request = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { 
                tools: [{googleSearch: {}}]
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<StatisticsResult>(response.text, {} as StatisticsResult);
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
            ${truncatedInstruction}\nFind scientific articles for: "${truncatedQuery}"
            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must strictly adhere to this structure (it's the same as StatisticsResult but without the chart):
             {
                "title": "string",
                "summary": "string",
                "keywords": ["string"],
                "sourceDetails": { "name": "string", "link": "string", "author": "string", "publicationDate": "string", "credibility": "string" },
                "analysis": { "acceptancePercentage": number, "currentValidity": "string", "alternativeResults": "string" },
                "relatedSuggestions": ["string"]
            }
        `;
        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                tools: [{googleSearch: {}}]
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<ScientificArticleResult>(response.text, {} as ScientificArticleResult);
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
            ${truncatedInstruction}\nFind religious text for: "${truncatedQuery}"
            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must strictly adhere to this structure (it's the same as StatisticsResult but without the chart):
             {
                "title": "string",
                "summary": "string",
                "keywords": ["string"],
                "sourceDetails": { "name": "string", "link": "string", "author": "string", "publicationDate": "string", "credibility": "string" },
                "analysis": { "acceptancePercentage": number, "currentValidity": "string", "alternativeResults": "string" },
                "relatedSuggestions": ["string"]
            }
        `;
        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                tools: [{googleSearch: {}}]
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<ScientificArticleResult>(response.text, {} as ScientificArticleResult);
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
        const response = await generateContentWithRetry(ai, request);
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
            Your entire response MUST be a single, valid JSON object.
            Do not include any other text or markdown formatting.
        `;
        const request = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }] 
            }
        };
        const response = await generateContentWithRetry(ai, request);
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
        const response = await generateContentWithRetry(ai, request);
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
            ${truncatedInstruction}\nAnalyze this agent request.\nTopic: ${truncatedTopic}\nRequest: ${truncatedRequest}
            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must adhere to this structure:
            {
              "isClear": boolean,
              "questions": [{ "questionText": "string", "questionType": "text-input" | "multiple-choice", "options": ["string"] }],
              "refinedPrompt": "string"
            }
        `;
        const requestBody = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { tools: [{googleSearch: {}}] }
        };
        const response = await generateContentWithRetry(ai, requestBody);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<AgentClarificationRequest>(response.text, { isClear: true });
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
                Do not include any other text or markdown formatting.
            `,
            config: { tools:[{googleSearch:{}}] }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<AgentExecutionResult>(response.text, {} as AgentExecutionResult);
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
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsed = safeJsonParse<any[]>(response.text, []);
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
            Do not include any other text or markdown formatting.
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}]}};
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<GeneralTopicResult>(response.text, {} as GeneralTopicResult);

        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];
        if (groundingSources.length > 0) {
            const existingUris = new Set(parsedResult.sources?.map(s => s.uri));
            const newSources = groundingSources.filter(s => !existingUris.has(s.uri));
            parsedResult.sources = [...(parsedResult.sources || []), ...newSources];
        }
        return parsedResult;

    } catch (error) {
        handleGeminiError(error, 'fetchGeneralTopicAnalysis');
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
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<CryptoCoin[]>(response.text, []);
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
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<SimpleCoin[]>(response.text, []);
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
            ${truncatedInstruction}\nSearch for crypto coin: "${truncatedQuery}"
            Your entire response MUST be a single, valid JSON object. Do not include any text or markdown formatting. The JSON must adhere to this structure:
            {
              "coin": { "id": "string", "symbol": "string", "name": "string", "image": "string", "price_usd": number, "price_toman": number, "price_change_percentage_24h": number, "market_cap_usd": number, "market_cap_toman": number },
              "summary": "string",
              "sources": [{ "name": "string", "link": "string", "credibility": "string" }]
            }
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<CryptoSearchResult>(response.text, {} as CryptoSearchResult);
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
            ${truncatedInstruction}\nAnalyze crypto coin: "${truncatedCoinName}"
            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must adhere to this structure:
            {
              "coinName": "string", "symbol": "string", "summary": "string",
              "technicalAnalysis": { "title": "string", "content": "string", "keyLevels": { "support": ["string"], "resistance": ["string"] } },
              "fundamentalAnalysis": { "title": "string", "content": "string", "keyMetrics": [{ "name": "string", "value": "string" }] },
              "sentimentAnalysis": { "title": "string", "content": "string", "score": number },
              "futureOutlook": "string"
            }
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<CryptoAnalysisResult>(response.text, {} as CryptoAnalysisResult);
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
            ${truncatedInstruction}\nAnalyze topic: ${truncatedTopic}
            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must adhere to this structure:
            {
                "understanding": "string", "analysis": "string (HTML-formatted)", "proponentPercentage": number,
                "proponents": [{ "name": "string", "argument": "string", "scientificLevel": number }],
                "opponents": [{ "name": "string", "argument": "string", "scientificLevel": number }],
                "examples": [{ "title": "string", "content": "string" }],
                "mentionedSources": [{ "title": "string", "url": "string", "sourceCredibility": "string", "argumentCredibility": "string" }],
                "techniques": ["string"], "suggestions": [{ "title": "string", "url": "string" }]
            }
        ` }];
        if(file) contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
        const request = {model: 'gemini-2.5-flash', contents: { parts: contentParts }, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<AnalysisResult>(response.text, {} as AnalysisResult);
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
            ${truncatedInstruction}\nFind fallacies in: ${truncatedTopic}
            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must adhere to this structure:
            { "identifiedFallacies": [{ "type": "string", "quote": "string", "explanation": "string", "correctedStatement": "string" }] }
        ` }];
        if(file) contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
        const request = {model: 'gemini-2.5-flash', contents: { parts: contentParts }, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<FallacyResult>(response.text, {} as FallacyResult);
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

        const prompt = `${truncatedInstruction}\nType: ${themeType}\nInspiration URL: ${url}\nDescription: ${truncatedDesc}\nImage Desc: ${truncatedImgDesc}.
        Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must adhere to this structure:
        { "themeName": "string", "understanding": "string", "colorPalette": { "primary": "string", "secondary": "string", "accent": "string", "background": "string", "text": "string" }, "fontPairings": { "headings": "string", "body": "string" }, "layout": "string", "features": ["string"] }
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<WordPressThemePlan>(response.text, {} as WordPressThemePlan);
    } catch (error) {
        handleGeminiError(error, 'generateWordPressThemePlan');
    }
}
export async function generateWordPressThemeCode(plan: WordPressThemePlan, file: string, settings: AppSettings): Promise<string> {
    try {
        const ai = getAiClient(settings, 'wordpress-theme');
        const prompt = `Based on this plan: ${JSON.stringify(plan).substring(0, 4000)}\nGenerate the code for the file: ${file}`;
        const request = {model: 'gemini-2.5-flash', contents: prompt};
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response.text.replace(/^```(php|css|js)?\s*|```\s*$/g, '').trim();
    } catch (error) {
        handleGeminiError(error, 'generateWordPressThemeCode');
    }
}
export async function getDebateTurnResponse(transcript: TranscriptEntry[], role: DebateRole, turn: number, config: DebateConfig, isFinal: boolean, instruction: string, provider: AIModelProvider, settings: AppSettings): Promise<GenerateContentResponse> {
    try {
        const ai = getAiClient(settings, 'analyzer-debate', provider);

        const transcriptText = transcript.map(t => `${t.participant.name} (${debateRoleLabels[t.participant.role]}): ${t.text}`).join('\n\n');
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
            prompt += `Based on the conversation so far, provide your response according to your role and the configured tone and length.`;
        }

        const request = {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return response;
    } catch (error) {
        handleGeminiError(error, 'getDebateTurnResponse');
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
            **Your turn:** Based on the user's last message and your role, provide a concise and relevant response in Persian.
        `;
        
        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        };
        const response = await generateContentWithRetry(ai, request);
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
            Focus exclusively on the **User's** performance.
            The latest part of the transcript is provided below for context.
            Your entire output must be in Persian.
            Your entire response MUST be a single, valid JSON object. Do not include any other text or markdown formatting. The JSON must adhere to this structure:
            {
                "summary": "string",
                "performanceAnalysis": { "knowledgeLevel": number, "eloquence": number, "argumentStrength": number, "feedback": "string" },
                "fallacyDetection": [{ "fallacyType": "string", "userQuote": "string", "explanation": "string" }],
                "overallScore": number
            }
        `;

        const request = {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            },
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<DebateAnalysisResult>(response.text, {} as DebateAnalysisResult);
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
            Your entire response MUST be a single, valid JSON array of objects. Each object MUST have "name" and "url" properties.
            Do not include any other text or markdown formatting.
        `;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}] }};
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        return safeJsonParse<Partial<RSSFeed>[]>(response.text, []);
    } catch (error) {
        handleGeminiError(error, 'findFeedsWithAI');
    }
}

export async function generateEditableListItems(listName: string, listType: string, count: number, settings: AppSettings): Promise<string[]> {
    try {
        const ai = getAiClient(settings);
        const prompt = `Generate a list of ${count} items for a settings page. The list is for "${listName}". Return a JSON array of strings.`;
        const request = {model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }};
        const response = await generateContentWithRetry(ai, request);
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
        const truncatedTopic = (topic || '').substring(0, 500);
        const prompt = `Based on the research topic "${truncatedTopic}" in the field of "${field}", generate 5 to 7 highly relevant academic and scientific keywords for database searches. Your response MUST be a single, valid JSON array of strings. Do not include any other text or markdown formatting.`;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsed = safeJsonParse<any[]>(response.text, []);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((item): item is string => typeof item === 'string');
    } catch (error) {
        handleGeminiError(error, 'generateResearchKeywords');
    }
}

export async function fetchResearchData(topic: string, field: string, keywords: string[], settings: AppSettings): Promise<ResearchResult> {
    try {
        const ai = getAiClient(settings, 'research-analysis');
        const prompt = `
            Conduct a deep academic analysis on the following topic for a Persian-speaking audience.
            - Topic: "${(topic || '').substring(0, 1000)}"
            - Field: "${(field || '').substring(0, 200)}"
            - Keywords: ${keywords.join(', ').substring(0, 500)}

            Your task is to search the most up-to-date and recent academic, scientific, and credible web sources.
            It is crucial that you remain completely neutral and objective. Present the information as it exists from the sources, without adding your own opinions or trying to align with any potential user bias. Your goal is to provide a factual, balanced overview.
            The entire response must be in Persian.
            Your entire response MUST be a single, valid JSON object. Do not include any other text, explanations, or markdown formatting like \`\`\`json. The JSON object must have the following structure:
            {
              "understanding": "string",
              "comprehensiveSummary": "string",
              "credibilityScore": number,
              "viewpointDistribution": { "proponentPercentage": number, "opponentPercentage": number, "neutralPercentage": number },
              "proponents": [ { "name": "string", "argument": "string", "scientificLevel": number } ],
              "opponents": [ { "name": "string", "argument": "string", "scientificLevel": number } ],
              "neutral": [ { "name": "string", "argument": "string", "scientificLevel": number } ],
              "academicSources": [ { "title": "string", "link": "string", "snippet": "string" } ]
            }
        `;
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<ResearchResult>(response.text, {} as ResearchResult);
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            parsedResult.webSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }
        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'fetchResearchData');
    }
}

export async function fetchStatisticalResearch(
    topic: string,
    comparisonTopics: string[],
    keywords: string[],
    settings: AppSettings
): Promise<StatisticalResearchResult> {
    try {
        const ai = getAiClient(settings, 'statistical-research');
        const jsonStructure = `
        {
          "understanding": "string",
          "summary": "string",
          "validationMetrics": {
            "credibilityValidation": "string",
            "statisticalCredibilityScore": number (0-100),
            "documentCredibility": "string",
            "typeOfStatistics": "string",
            "statisticalMethod": "string",
            "participants": "string or number",
            "samplingMethod": "string",
            "methodCredibilityPercentage": number (0-100)
          },
          "charts": [{ "type": "bar" | "pie" | "line" | "table", "title": "string", "labels": ["string"], "datasets": [{ "label": "string", "data": [number] }] }],
          "proponents": [{ "name": "string", "argument": "string", "scientificLevel": number (1-5) }],
          "opponents": [{ "name": "string", "argument": "string", "scientificLevel": number (1-5) }],
          "neutral": [{ "name": "string", "argument": "string", "scientificLevel": number (1-5) }],
          "academicSources": [{ "title": "string", "link": "string", "snippet": "string" }],
          "relatedTopics": [{ "title": "string", "link": "string" }]
        }
        `;
        const prompt = `
            Conduct a deep statistical research analysis on the primary topic: "${(topic || '').substring(0, 1000)}".
            ${comparisonTopics.filter(t => t.trim() !== '').length > 0 ? `Compare it statistically against: "${comparisonTopics.join(' and ').substring(0, 500)}".` : ''}
            Use these keywords to guide your search: ${keywords.join(', ').substring(0, 500)}.
            Search only reputable academic, scientific, university, and top-tier English-language sources.
            Your entire response must be a single, valid JSON object in PERSIAN. Do not include any text, explanations, or markdown formatting. The JSON must strictly adhere to this structure: ${jsonStructure}
        `;

        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        };
        const response = await generateContentWithRetry(ai, request);
        window.dispatchEvent(new CustomEvent('apiKeyStatusChange', { detail: { status: 'valid' } }));
        const parsedResult = safeJsonParse<StatisticalResearchResult>(response.text, {} as StatisticalResearchResult);
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            parsedResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }
        return parsedResult;
    } catch (error) {
        handleGeminiError(error, 'fetchStatisticalResearch');
    }
}