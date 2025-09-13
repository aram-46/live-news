

import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
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
    StatisticalResearchResult
} from '../types';

let ai: GoogleGenAI;

const getAIClient = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            console.error("API_KEY environment variable not set!");
            throw new Error("API_KEY environment variable not set!");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

// A helper to safely parse JSON from the model
function safeJsonParse<T>(jsonString: string | undefined | null, fallback: T): T {
    if (typeof jsonString !== 'string' || !jsonString.trim()) {
        console.error("Failed to parse JSON from model: input is not a valid string.", { input: jsonString });
        return fallback;
    }
    try {
        // The model can sometimes return conversational text before or after the JSON,
        // or wrap it in markdown code blocks. This function attempts to extract the JSON part.
        
        // First, look for markdown block
        const markdownMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
        if (markdownMatch && markdownMatch[1]) {
            return JSON.parse(markdownMatch[1]) as T;
        }

        // If no markdown, find the first '{' or '[' and the last '}' or ']'
        const firstBracket = jsonString.indexOf('[');
        const firstBrace = jsonString.indexOf('{');
        
        let start = -1;
        
        if (firstBracket === -1 && firstBrace === -1) {
            // If no JSON structure is found, return fallback
            console.error("No JSON object or array found in the string.", { input: jsonString });
            return fallback;
        }

        // Find the earliest start of a JSON object or array
        if (firstBracket === -1) {
            start = firstBrace;
        } else if (firstBrace === -1) {
            start = firstBracket;
        } else {
            start = Math.min(firstBracket, firstBrace);
        }

        // Find the corresponding closing bracket/brace
        const end = (jsonString[start] === '{') 
            ? jsonString.lastIndexOf('}') 
            : jsonString.lastIndexOf(']');

        if (start === -1 || end === -1) {
            console.error("Mismatched JSON brackets in the string.", { input: jsonString });
            return fallback;
        }

        const jsonPart = jsonString.substring(start, end + 1);
        return JSON.parse(jsonPart) as T;
    } catch (error) {
        console.error("Failed to parse JSON from model:", error);
        console.error("Original string:", jsonString);
        return fallback;
    }
}


// --- General Purpose & Helpers ---
export type ApiKeyStatus = 'valid' | 'invalid_key' | 'not_set' | 'network_error';

export async function checkApiKeyStatus(): Promise<ApiKeyStatus> {
    if (!process.env.API_KEY) {
        return 'not_set';
    }
    try {
        const ai = getAIClient();
        // A simple, low-cost call to check validity
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "test"
        });
        return 'valid';
    } catch (error: any) {
        if (error.message.includes('API key not valid')) {
            return 'invalid_key';
        }
        // Could be a network error or other issue
        console.error("API key status check failed:", error);
        return 'network_error';
    }
}

export const testGeminiConnection = checkApiKeyStatus;

// --- News & Search ---

export async function fetchNews(filters: Filters, instruction: string, articlesPerColumn: number, showImages: boolean): Promise<{ articles: NewsArticle[], suggestions: string[] }> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}
        Find the top ${articlesPerColumn} news articles matching these criteria:
        - Query: "${filters.query}"
        - Categories: ${filters.categories.join(', ')}
        - Regions: ${filters.regions.join(', ')}
        - Sources: ${filters.sources.join(', ')}
        - Images: ${showImages ? 'Required' : 'Not required'}
        Generate some related search suggestions as well.
        Your entire response MUST be a single, valid JSON object with two keys: "articles" and "suggestions".
        Each article object must have these keys: title, summary, link, source, publicationTime (in Persian Jalali format), credibility, category, imageUrl.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    return safeJsonParse(response.text, { articles: [], suggestions: [] });
}

export async function fetchLiveNews(tabId: string, sources: any, instruction: string, showImages: boolean, specifics: any): Promise<NewsArticle[]> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}
        Find the latest top 5 news articles for the category: "${tabId}".
        Prioritize sources from this list if relevant: ${JSON.stringify(specifics.selectedSources)}.
        Images: ${showImages ? 'Required' : 'Not required'}.
        Your entire response MUST be a single, valid JSON array of article objects.
        Each article object must have these keys: title, summary, link, source, publicationTime (in Persian Jalali format), credibility, category, imageUrl.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    return safeJsonParse(response.text, []);
}


export async function fetchTickerHeadlines(categories: string[], instruction: string): Promise<any[]> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}. Find 10 top headlines from these categories: ${categories.join(', ')}.
        Your entire response MUST be a single, valid JSON array of objects. Each object must have "title" and "link" properties.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });
    return safeJsonParse(response.text, []);
}

export async function generateDynamicFilters(query: string, listType: 'categories' | 'regions' | 'sources', count: number): Promise<string[]> {
    const ai = getAIClient();
    const prompt = `
        Based on the search query "${query}", suggest ${count} relevant ${listType} for filtering news.
        Your entire response MUST be a single, valid JSON array of strings.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }] 
        }
    });
    return safeJsonParse(response.text, []);
}

export async function checkForUpdates(sources: any): Promise<boolean> {
    // This is a simplified simulation. A real implementation would be more complex.
    console.log("Checking for updates...", sources);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return Math.random() > 0.7; // 30% chance of finding an update
}

export async function fetchNewsFromFeeds(feeds: RSSFeed[], instruction: string, query?: string): Promise<NewsArticle[]> {
    const ai = getAIClient();
    const feedUrls = feeds.map(f => f.url);
    const prompt = `
        ${instruction}
        Search the web for the latest 10 news articles from the news sources associated with these RSS feed URLs: ${JSON.stringify(feedUrls)}.
        Do not try to parse the RSS feeds directly. Instead, search for the latest news from their respective websites.
        ${query ? `Filter the search results by this query: "${query}"` : ''}
        Your entire response MUST be a single, valid JSON array of article objects. All text values in the JSON, including title, summary, source, credibility, and category, MUST be in Persian.
        Each article object must have these keys: title, summary, link, source, publicationTime (in Persian Jalali format), credibility, category, and an optional imageUrl.
        The 'credibility' field is mandatory and MUST be one of these exact Persian strings: "بسیار معتبر", "معتبر", or "نیازمند بررسی". Do not use English terms.
        Ensure every field is populated. If an image is not found, the imageUrl can be null.
        Do not include any other text or markdown formatting outside of the JSON array.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }] // Use search to access live RSS feeds
        }
    });
    return safeJsonParse(response.text, []);
}

// --- Fact Check & Analysis ---

export async function factCheckNews(text: string, file: { data: string, mimeType: string } | null, url?: string, instruction?: string): Promise<FactCheckResult> {
    const ai = getAIClient();
    const contentParts: any[] = [];
    
    let prompt = `
        ${instruction}\nAnalyze the following content for fact-checking.
        Your entire response MUST be a single, valid JSON object matching the FactCheckResult structure.
        The JSON should have keys: "overallCredibility", "summary", and "sources" (an array).
        Each source object in the array must have "name", "link", "publicationDate" (in Persian Jalali format), "credibility", and "summary".
        Do not include any other text or markdown formatting.
    `;
    if (text) prompt += `\nText: "${text}"`;
    if (url) prompt += `\nURL: "${url}"`;
    contentParts.push({ text: prompt });

    if (file) {
        contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contentParts },
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    const parsedResult: FactCheckResult = safeJsonParse(response.text, { overallCredibility: "Error", summary: "Failed to parse model response.", sources: [] });
    
    // Add grounding metadata if available
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        parsedResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
    }

    return parsedResult;
}

export async function analyzeMedia(
    url: string | null,
    file: { data: string, mimeType: string } | null,
    userPrompt: string,
    instruction: string
): Promise<MediaAnalysisResult> {
    const ai = getAIClient();
    const contentParts: any[] = [];
    
    let prompt = `
        ${instruction}
        تحلیل را بر اساس این درخواست کاربر انجام بده: "${userPrompt}"
        ${url ? `محتوای اصلی در این آدرس قرار دارد: ${url}` : 'محتوای اصلی یک فایل ضمیمه شده است.'}
    `;
    contentParts.push({ text: prompt });

    if (file) {
        contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contentParts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: 'خلاصه‌ای جامع از محتوای رسانه به زبان فارسی.' },
                    transcript: { type: Type.STRING, description: 'متن کامل و دقیق گفتگوهای موجود در ویدئو به زبان فارسی. اگر تصویر است، این فیلد را خالی بگذار.' },
                    analyzedClaims: {
                        type: Type.ARRAY,
                        description: 'لیستی از ادعاها، موضوعات و استدلال‌های اصلی مطرح شده در رسانه.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                claimText: { type: Type.STRING, description: 'متن دقیق ادعای مطرح شده.' },
                                timestamp: { type: Type.STRING, description: 'زمان دقیق بیان ادعا در ویدئو (مثال: "02:35"). اگر تصویر است "N/A" بگذار.' },
                                credibility: { type: Type.INTEGER, description: 'امتیاز اعتبار ادعا از ۰ تا ۱۰۰.' },
                                analysis: { type: Type.STRING, description: 'تحلیل کوتاه و بی‌طرفانه از صحت و اعتبار این ادعا.' },
                            },
                        },
                    },
                    critique: {
                        type: Type.OBJECT,
                        description: 'نقد و بررسی محتوا از جنبه‌های مختلف.',
                        properties: {
                            logic: { type: Type.STRING, description: 'نقد ایرادات منطقی.' },
                            science: { type: Type.STRING, description: 'نقد ایرادات علمی.' },
                            argumentation: { type: Type.STRING, description: 'نقد ایرادات استدلالی.' },
                            rhetoric: { type: Type.STRING, description: 'نقد ایرادات کلامی و فن بیان.' },
                            grammar: { type: Type.STRING, description: 'نقد ایرادات دستوری.' },
                            evidence: { type: Type.STRING, description: 'نقد ایرادات سندی و مدارک ارائه شده.' },
                            philosophy: { type: Type.STRING, description: 'نقد ایرادات فلسفی.' },
                        },
                    },
                },
            },
        },
    });

    const parsedResult = safeJsonParse(response.text, {} as MediaAnalysisResult);
    // Grounding metadata is not available when using responseSchema
    return parsedResult;
}

// ... Add all other geminiService functions here following the same pattern ...
export async function generateAIInstruction(taskLabel: string): Promise<string> {
    const ai = getAIClient();
    const prompt = `Create a detailed, expert-level system instruction prompt in Persian for an AI model. The task is: "${taskLabel}". The prompt should be clear, concise, and guide the model to produce high-quality, structured output.`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return response.text;
}

export async function testAIInstruction(instruction: string): Promise<boolean> {
    try {
        const ai = getAIClient();
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Test prompt",
            config: { systemInstruction: instruction, maxOutputTokens: 5 }
        });
        return true;
    } catch (e) {
        console.error("Instruction test failed:", e);
        return false;
    }
}

export async function findSourcesWithAI(category: SourceCategory, existingSources: Source[], options: FindSourcesOptions): Promise<Partial<Source>[]> {
    const ai = getAIClient();
    const prompt = `
        Find ${options.count} new, high-quality news sources for the category "${category}".
        - Region: ${options.region}
        - Language: ${options.language}
        - Credibility: ${options.credibility}
        - Exclude these already known sources: ${existingSources.map(s => s.url).join(', ')}
        Your entire response MUST be a single, valid JSON array of objects.
        Each object must have these keys: name, field, url, activity, credibility, region.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });
    return safeJsonParse(response.text, []);
}


export async function fetchPodcasts(query: string, instruction: string): Promise<PodcastResult[]> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}\nFind podcasts related to: "${query}"
        Your entire response MUST be a single, valid JSON array of PodcastResult objects.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    const parsedResult = safeJsonParse(response.text, []);

    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        if(parsedResult.length > 0){
             parsedResult[0].groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
        }
    }

    return parsedResult;
}

export async function fetchWebResults(searchType: string, filters: Filters, instruction: string): Promise<{ results: WebResult[], sources: GroundingSource[], suggestions: string[] }> {
    const ai = getAIClient();
    const prompt = `
      ${instruction}\nSearch for ${searchType} about "${filters.query}" with these filters: ${JSON.stringify(filters)}. Also provide related suggestions.
      Your entire response MUST be a single, valid JSON object with two keys: "results" (an array of WebResult objects) and "suggestions" (an array of strings).
      Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });
    
    const parsedResult = safeJsonParse(response.text, { results: [], suggestions: [] });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];
    
    return { ...parsedResult, sources };
}


// --- Content Generation ---

export async function generateSeoKeywords(topic: string, instruction: string): Promise<string[]> {
    const ai = getAIClient();
    const prompt = `${instruction}\nGenerate SEO keywords for: "${topic}"`;
    const response = await ai.models.generateContent({ 
        model: "gemini-2.5-flash", 
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    return response.text.split(',').map(k => k.trim());
}

export async function suggestWebsiteNames(topic: string, instruction: string): Promise<string[]> {
     const ai = getAIClient();
    const prompt = `${instruction}\nSuggest website names for: "${topic}"`;
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return response.text.split('\n').map(k => k.trim().replace(/^- /, ''));
}

export async function suggestDomainNames(topic: string, instruction: string): Promise<string[]> {
    const ai = getAIClient();
    const prompt = `${instruction}\nSuggest domain names for: "${topic}"`;
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return response.text.split('\n').map(k => k.trim());
}

export async function generateArticle(topic: string, wordCount: number, instruction: string): Promise<{articleText: string, groundingSources: GroundingSource[]}> {
    const ai = getAIClient();
    const prompt = `${instruction}\nWrite an article about "${topic}" with approximately ${wordCount} words.`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];

    return { articleText: response.text, groundingSources };
}

export async function generateImagesForArticle(prompt: string, count: number, style: string): Promise<string[]> {
    const ai = getAIClient();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: count }
    });
    return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
}

export async function generateAboutMePage(description: string, siteUrl: string, platform: string, images: {data: string, mimeType: string}[], pageConfig: PageConfig, instruction: string): Promise<string> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}
        Description: ${description}
        Site URL: ${siteUrl}
        Platform: ${platform}
        Page Config: ${JSON.stringify(pageConfig)}
        Number of images provided: ${images.length}
        Generate a complete, single HTML file.
    `;
    const contentParts: any[] = [{ text: prompt }, ...images.map(img => ({ inlineData: img }))]

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: contentParts }
    });

    return response.text.replace(/^```html\s*|```\s*$/g, '').trim();
}

// ... stubs for the rest of the functions
export async function fetchStatistics(query: string, instruction: string): Promise<StatisticsResult> {
    const ai = getAIClient();
    const prompt = `
      ${instruction}\nFind statistics for: "${query}"
      Your entire response MUST be a single, valid JSON object matching the StatisticsResult structure.
      The JSON should have keys: title, summary, keywords, chart, sourceDetails, analysis, relatedSuggestions.
      Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: prompt, 
        config: { 
            tools: [{googleSearch: {}}]
        }
    });
    return safeJsonParse(response.text, {} as StatisticsResult);
}
export async function fetchScientificArticle(query: string, instruction: string): Promise<ScientificArticleResult> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}\nFind scientific articles for: "${query}"
        Your entire response MUST be a single, valid JSON object matching the ScientificArticleResult structure.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt, 
        config: { 
            tools: [{googleSearch: {}}]
        }
    });
    return safeJsonParse(response.text, {} as ScientificArticleResult);
}
export async function fetchReligiousText(query: string, instruction: string): Promise<ScientificArticleResult> {
     const ai = getAIClient();
    const prompt = `
        ${instruction}\nFind religious text for: "${query}"
        Your entire response MUST be a single, valid JSON object matching the ScientificArticleResult structure.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            tools: [{googleSearch: {}}]
        }
    });
    return safeJsonParse(response.text, {} as ScientificArticleResult);
}
export async function generateContextualFilters(listType: string, context: any): Promise<string[]> {
    const ai = getAIClient();
    const prompt = `
        Based on this context: ${JSON.stringify(context)}, generate 5 relevant filters for "${listType}".
        Your entire response MUST be a single, valid JSON array of strings.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: prompt, 
        config: { 
            tools: [{ googleSearch: {} }]
        }
    });
    return safeJsonParse(response.text, []);
}
export async function analyzeVideoFromUrl(url: string, type: string, keywords: string, instruction: string): Promise<any> {
    // This is a placeholder, video analysis is more complex.
    const ai = getAIClient();
    const prompt = `
        ${instruction}\nAnalyze video from URL: ${url}\nAnalysis type: ${type}\nKeywords: ${keywords}
        Your entire response MUST be a single, valid JSON object.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: prompt, 
        config: { 
            tools: [{ googleSearch: {} }] 
        }
    });
    return safeJsonParse(response.text, {});
}
export async function formatTextContent(text: string | null, url: string | null, instruction: string): Promise<string> {
    const ai = getAIClient();
    const prompt = `${instruction}\nFormat this content:\n${text || `Content from URL: ${url}`}`;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt});
    return response.text;
}
export async function analyzeAgentRequest(topic: string, request: string, instruction: string): Promise<AgentClarificationRequest> {
     const ai = getAIClient();
    const prompt = `
        ${instruction}\nAnalyze this agent request.\nTopic: ${topic}\nRequest: ${request}
        Your entire response MUST be a single, valid JSON object matching the AgentClarificationRequest structure.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json" }});
    return safeJsonParse(response.text, { isClear: true });
}
export async function executeAgentTask(prompt: string, instruction: string): Promise<AgentExecutionResult> {
     const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
            ${instruction}\n${prompt}
            Your entire response MUST be a single, valid JSON object matching the AgentExecutionResult structure.
            Do not include any other text or markdown formatting.
        `,
        config: { tools:[{googleSearch:{}}] }
    });
    return safeJsonParse(response.text, {} as AgentExecutionResult);
}
export async function generateKeywordsForTopic(mainTopic: string, comparisonTopic: string): Promise<string[]> {
     const ai = getAIClient();
    const prompt = `
        Generate keywords for topic "${mainTopic}" ${comparisonTopic ? `and comparison topic "${comparisonTopic}"` : ''}
        Your entire response MUST be a single, valid JSON array of strings.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: prompt, 
        config: { 
            tools: [{ googleSearch: {} }]
        }
    });
    return safeJsonParse(response.text, []);
}
export async function fetchGeneralTopicAnalysis(mainTopic: string, comparisonTopic: string, keywords: string[], domains: string[], instruction: string): Promise<GeneralTopicResult> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}\nTopic: ${mainTopic}\nComparison: ${comparisonTopic}\nKeywords: ${keywords.join(', ')}\nDomains: ${domains.join(', ')}
        Your entire response MUST be a single, valid JSON object matching the GeneralTopicResult structure.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}]}});
    return safeJsonParse(response.text, {} as GeneralTopicResult);
}
export async function fetchCryptoData(type: string, timeframe: string, count: number, instruction: string, ids?: string[]): Promise<CryptoCoin[]> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}\nFetch ${count} crypto coins. Type: ${type}. Timeframe: ${timeframe}. ${ids ? `IDs: ${ids.join(', ')}` : ''}
        Your entire response MUST be a single, valid JSON array of CryptoCoin objects.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}]}});
    return safeJsonParse(response.text, []);
}
export async function fetchCoinList(instruction: string): Promise<SimpleCoin[]> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}\nFetch a list of all major crypto coins.
        Your entire response MUST be a single, valid JSON array of SimpleCoin objects.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: prompt, 
        config: { 
            tools: [{ googleSearch: {} }]
        }
    });
    return safeJsonParse(response.text, []);
}
export async function searchCryptoCoin(query: string, instruction: string): Promise<CryptoSearchResult> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}\nSearch for crypto coin: "${query}"
        Your entire response MUST be a single, valid JSON object matching the CryptoSearchResult structure.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}] }});
    return safeJsonParse(response.text, {} as CryptoSearchResult);
}
export async function fetchCryptoAnalysis(coinName: string, instruction: string): Promise<CryptoAnalysisResult> {
    const ai = getAIClient();
    const prompt = `
        ${instruction}\nAnalyze crypto coin: "${coinName}"
        Your entire response MUST be a single, valid JSON object matching the CryptoAnalysisResult structure.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}] }});
    return safeJsonParse(response.text, {} as CryptoAnalysisResult);
}
export async function analyzeContentDeeply(topic: string, file: any, instruction: string): Promise<AnalysisResult> {
    const ai = getAIClient();
    const contentParts: any[] = [{ text: `
        ${instruction}\nAnalyze topic: ${topic}
        Your entire response MUST be a single, valid JSON object matching the AnalysisResult structure.
        Do not include any other text or markdown formatting.
    ` }];
    if(file) contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: { parts: contentParts }, config: { tools:[{googleSearch:{}}] }});
    return safeJsonParse(response.text, {} as AnalysisResult);
}
export async function findFallacies(topic: string, file: any, instruction: string): Promise<FallacyResult> {
    const ai = getAIClient();
    const contentParts: any[] = [{ text: `
        ${instruction}\nFind fallacies in: ${topic}
        Your entire response MUST be a single, valid JSON object matching the FallacyResult structure.
        Do not include any other text or markdown formatting.
    ` }];
    if(file) contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: { parts: contentParts }, config: { tools:[{googleSearch:{}}] }});
    return safeJsonParse(response.text, {} as FallacyResult);
}
export async function generateWordPressThemePlan(themeType: string, url: string, desc: string, imgDesc: string, instruction: string): Promise<WordPressThemePlan> {
    const ai = getAIClient();
    const prompt = `${instruction}\nType: ${themeType}\nInspiration URL: ${url}\nDescription: ${desc}\nImage Desc: ${imgDesc}`;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json" }});
    return safeJsonParse(response.text, {} as WordPressThemePlan);
}
export async function generateWordPressThemeCode(plan: WordPressThemePlan, file: string): Promise<string> {
    const ai = getAIClient();
    const prompt = `Based on this plan: ${JSON.stringify(plan)}\nGenerate the code for the file: ${file}`;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt});
    return response.text.replace(/^```(php|css|js)?\s*|```\s*$/g, '').trim();
}
export async function getDebateTurnResponse(transcript: TranscriptEntry[], role: DebateRole, turn: number, config: DebateConfig, isFinal: boolean, instruction: string, provider: AIModelProvider): Promise<GenerateContentResponse> {
    const ai = getAIClient();

    const transcriptText = transcript.map(t => `${t.participant.name} (${debateRoleLabels[t.participant.role]}): ${t.text}`).join('\n\n');
    
    let prompt = `${instruction}\n
    **Debate Configuration:**
    - Topic: ${config.topic}
    - Quality Level: ${config.qualityLevel}
    - Tone: ${config.tone}
    - Response Length: ${config.responseLength}
    
    **Current Transcript:**
    ${transcriptText}
    
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    return response;
}
export async function getAIOpponentResponse(
    transcript: ConductDebateMessage[],
    config: ConductDebateConfig,
    instruction: string
): Promise<GenerateContentResponse> {
    const ai = getAIClient();
    const transcriptText = transcript.map(t => `${t.role === 'user' ? 'شما' : 'هوش مصنوعی'}: ${t.text}`).join('\n\n');

    const prompt = `
        ${instruction}
        **Debate Topic:** ${config.topic}
        **Your Role:** ${debateRoleLabels[config.aiRole]}

        **Debate Transcript so far:**
        ${transcriptText}

        ---
        **Your turn:** Based on the user's last message and your role, provide a concise and relevant response in Persian.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    return response;
}

export async function analyzeUserDebate(
    transcript: ConductDebateMessage[],
    topic: string,
    instruction: string
): Promise<DebateAnalysisResult> {
    const ai = getAIClient();
    const transcriptText = transcript.map(t => `${t.role === 'user' ? 'User' : 'AI'}: ${t.text}`).join('\n\n');

    const prompt = `
        Analyze the following debate transcript on the topic "${topic}".
        Focus exclusively on the **User's** performance.
        The entire transcript is provided below for context.
        Your entire output must be in Persian.

        **Transcript:**
        ${transcriptText}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: 'A brief, neutral summary of the entire debate in Persian.' },
                    performanceAnalysis: {
                        type: Type.OBJECT,
                        properties: {
                            knowledgeLevel: { type: Type.INTEGER, description: 'User\'s knowledge level on the topic (1-10).' },
                            eloquence: { type: Type.INTEGER, description: 'User\'s eloquence and fluency (1-10).' },
                            argumentStrength: { type: Type.INTEGER, description: 'Strength and logic of user\'s arguments (1-10).' },
                            feedback: { type: Type.STRING, description: 'Constructive feedback for the user in Persian.' },
                        },
                    },
                    fallacyDetection: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                fallacyType: { type: Type.STRING, description: 'The type of logical fallacy used by the user.' },
                                userQuote: { type: Type.STRING, description: 'The exact quote from the user that contains the fallacy.' },
                                explanation: { type: Type.STRING, description: 'A brief explanation of why this is a fallacy in Persian.' },
                            },
                        },
                    },
                    overallScore: { type: Type.INTEGER, description: 'An overall score for the user\'s performance (0-100).' },
                },
            },
        },
    });

    return safeJsonParse(response.text, {} as DebateAnalysisResult);
}

export async function findFeedsWithAI(category: SourceCategory, existing: RSSFeed[]): Promise<Partial<RSSFeed>[]> {
     const ai = getAIClient();
    const prompt = `
        Find 5 new RSS feeds for category "${category}", excluding these URLs: ${existing.map(f => f.url).join(', ')}
        Your entire response MUST be a single, valid JSON array of objects. Each object MUST have "name" and "url" properties.
        Do not include any other text or markdown formatting.
    `;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt, config: { tools:[{googleSearch:{}}] }});
    return safeJsonParse(response.text, []);
}

export async function generateEditableListItems(listName: string, listType: string, count: number): Promise<string[]> {
    const ai = getAIClient();
    const prompt = `Generate a list of ${count} items for a settings page. The list is for "${listName}". Return a JSON array of strings.`;
    const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }});
    return safeJsonParse(response.text, []);
}

export async function generateResearchKeywords(topic: string, field: string): Promise<string[]> {
    const ai = getAIClient();
    const prompt = `Based on the research topic "${topic}" in the field of "${field}", generate 5 to 7 highly relevant academic and scientific keywords for database searches. Your response MUST be a single, valid JSON array of strings. Do not include any other text or markdown formatting.`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
    });
    return safeJsonParse(response.text, []);
}

export async function fetchResearchData(topic: string, field: string, keywords: string[]): Promise<ResearchResult> {
    const ai = getAIClient();
    const prompt = `
        Conduct a deep academic analysis on the following topic for a Persian-speaking audience.
        - Topic: "${topic}"
        - Field: "${field}"
        - Keywords: ${keywords.join(', ')}

        Your task is to search academic databases and the web to provide a structured report.
        The entire response must be in Persian.
        Your entire response MUST be a single, valid JSON object. Do not include any other text, explanations, or markdown formatting like \`\`\`json. The JSON object must have the following structure:
        {
          "understanding": "string",
          "comprehensiveSummary": "string",
          "credibilityScore": number,
          "viewpointDistribution": { "proponentPercentage": number, "opponentPercentage": number, "neutralPercentage": number },
          "proponents": [ { "name": "string", "argument": "string", "scientificLevel": number } ],
          "opponents": [ { "name": "string", "argument": "string", "scientificLevel": number } ],
          "academicSources": [ { "title": "string", "link": "string", "snippet": "string" } ]
        }
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            // Removed responseMimeType and responseSchema which are incompatible with the googleSearch tool
        }
    });

    const parsedResult = safeJsonParse(response.text, {} as ResearchResult);
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        parsedResult.webSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
    }
    return parsedResult;
}

export async function fetchStatisticalResearch(
    topic: string,
    comparisonTopics: string[],
    keywords: string[]
): Promise<StatisticalResearchResult> {
    const ai = getAIClient();
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
        Conduct a deep statistical research analysis on the primary topic: "${topic}".
        ${comparisonTopics.filter(t => t.trim() !== '').length > 0 ? `Compare it statistically against: "${comparisonTopics.join(' and ')}".` : ''}
        Use these keywords to guide your search: ${keywords.join(', ')}.
        Search only reputable academic, scientific, university, and top-tier English-language sources.
        Your entire response must be a single, valid JSON object in PERSIAN. Do not include any text, markdown, or explanations outside of the JSON object.
        The JSON object must strictly follow this structure:
        ${jsonStructure}
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    const parsedResult = safeJsonParse(response.text, {} as StatisticalResearchResult);
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        parsedResult.groundingSources = response.candidates[0].groundingMetadata.groundingChunks.map((c: any) => c.web);
    }
    return parsedResult;
}