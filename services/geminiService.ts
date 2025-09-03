import { GoogleGenAI, Type } from "@google/genai";
import type { AppSettings, NewsArticle, Filters, FactCheckResult, Credibility, TickerArticle, TickerSettings, LiveNewsSpecificSettings, Source, SourceCategory, Sources, StatisticsResult, ScientificArticleResult, WebResult, GroundingSource, VideoFactCheckResult, VideoTimestampResult, ClarificationResponse, AnalysisResult, FallacyResult, AgentClarificationRequest, AgentExecutionResult, GeneralTopicResult, PageConfig, TranscriptionResult } from '../types';

// Helper function to get the API key and initialize the client.
// Per guidelines, the API key MUST be obtained exclusively from the environment variable.
function getAiClient(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}


const newsArticleSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "عنوان خبر به زبان فارسی روان و دقیق" },
    summary: { type: Type.STRING, description: "خلاصه کوتاه و جامع خبر به زبان فارسی" },
    source: { type: Type.STRING, description: "منبع اصلی خبر (مثال: خبرگزاری فارس)" },
    publicationTime: { type: Type.STRING, description: "زمان انتشار (مثال: ۲۵ مرداد ۱۴۰۴ - ۱۰:۳۰)" },
    credibility: { type: Type.STRING, description: "درجه اعتبار منبع (مثال: بسیار معتبر، معتبر، نیازمند بررسی)" },
    link: { type: Type.STRING, description: "لینک مستقیم به مقاله خبر اصلی" },
    category: { type: Type.STRING, description: "دسته‌بندی خبر (سیاسی، اقتصادی و...)" },
    imageUrl: { type: Type.STRING, description: "یک URL مستقیم به یک عکس با کیفیت بالا که کاملاً مرتبط بوده و محتوای خبر را به درستی نمایش می‌دهد. تصویر باید مستقیماً در مورد موضوع مقاله باشد." },
  },
  required: ["title", "summary", "source", "publicationTime", "credibility", "link", "category"]
};

const newsResultSchema = {
    type: Type.OBJECT,
    properties: {
        articles: {
            type: Type.ARRAY,
            items: newsArticleSchema,
        },
        suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Three relevant and diverse search suggestions for the user based on their query, in Persian."
        }
    },
    required: ["articles", "suggestions"]
};


export async function fetchNews(filters: Filters, instructions: string, articlesPerColumn: number, showImages: boolean): Promise<{ articles: NewsArticle[], suggestions: string[] }> {
  const ai = getAiClient();
  try {
    const prompt = `
      ${instructions}
      IMPORTANT: All output text (titles, summaries, etc.) MUST be in Persian. If a source is in another language, translate its content to natural-sounding Persian.
      Please find the top ${articlesPerColumn} recent news articles based on these criteria. The user is Persian-speaking.
      - Search Query: "${filters.query || `مهمترین اخبار روز در تاریخ ${new Date().toLocaleDateString('fa-IR')}`}"
      - Categories: "${filters.categories.length === 0 || filters.categories.includes('all') ? 'any' : filters.categories.join(', ')}"
      - Regions: "${filters.regions.length === 0 || filters.regions.includes('all') ? 'any' : filters.regions.join(', ')}"
      - Sources: "${filters.sources.length === 0 || filters.sources.includes('all') ? 'any reputable source' : filters.sources.join(', ')}"
      Provide a diverse set of results. Also, provide 3 related and diverse search suggestions in Persian.
      ${showImages ? 'Image Requirement: For each article, you MUST find and provide a direct URL to a high-quality, relevant photograph that accurately represents the news content. The image must be directly related to the subject of the article. Generic or unrelated images are not acceptable.' : 'Do not include image URLs.'}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: newsResultSchema
      },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as { articles: NewsArticle[], suggestions: string[] };

  } catch (error) {
    console.error("Error fetching news from Gemini:", error);
    throw new Error("Failed to fetch news.");
  }
}

export async function fetchTickerHeadlines(settings: TickerSettings, instructions: string): Promise<TickerArticle[]> {
    const ai = getAiClient();
    try {
        const categories = settings.categories.length > 0 ? settings.categories.join(', ') : 'ایران و جهان';
        const prompt = `${instructions}. Categories: ${categories}. Number of headlines: 5.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "The headline text in Persian" },
                            link: { type: Type.STRING, description: "A direct URL to the article" }
                        },
                        required: ["title", "link"]
                    }
                }
            }
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as TickerArticle[];

    } catch (error) {
        console.error("Error fetching ticker headlines from Gemini:", error);
        return []; 
    }
}


export async function factCheckNews(text: string, file: { data: string; mimeType: string } | null, url: string | undefined, instructions: string): Promise<FactCheckResult> {
    const ai = getAiClient();
    try {
        const prompt = `
            ${instructions}
            As a world-class investigative journalist specializing in digital misinformation and social media rumor tracing, conduct a deep analysis of the following content. Your entire output MUST be in Persian and structured according to the JSON schema.

            **Your Mission:**
            1.  **Trace the Origin:** Your top priority is to find the EARLIEST verifiable instance of this claim/media online. Dig through social media, forums, and news archives.
            2.  **Analyze the Source:** Evaluate the credibility of the original source. Do they have a history of spreading misinformation? Are they a reliable source on this topic?
            3.  **Verify the Content:** Fact-check the claim itself using at least two independent, high-credibility sources.
            4.  **Summarize Findings:** Provide a clear, concise verdict and summary.
            5.  **(If Media Provided) Check for Manipulation:**
                - For video: Analyze for signs of clipping (تقطیع), editing, or out-of-context presentation.
                - For audio: Analyze for signs of dubbing (صداگذاری) or manipulation.
                - If manipulation is detected, describe it in the summary and if possible, find a link to the original, unedited media and add it to the 'relatedSources' section.

            **Content for Analysis:**
            - Link (if provided): ${url || 'Not provided.'}
            - Text Context (user's description or claim): "${text}"
        `;

        const modelConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overallCredibility: { type: Type.STRING, enum: ['بسیار معتبر', 'معتبر', 'نیازمند بررسی'], description: "The final credibility verdict in Persian." },
                    summary: { type: Type.STRING, description: "A concise summary of the fact-check findings in Persian. If media was provided, include any findings on manipulation (clipping, dubbing, etc.) here." },
                    originalSource: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Name of the original source." },
                            credibility: { type: Type.STRING, description: "Credibility of the original source." },
                            publicationDate: { type: Type.STRING, description: "Publication date and time." },
                            author: { type: Type.STRING, description: "Name of the author or publisher." },
                            evidenceType: { type: Type.STRING, description: "Type of evidence used (e.g., 'عکس', 'سند')." },
                            evidenceCredibility: { type: Type.STRING, description: "Credibility assessment of the evidence." },
                            authorCredibility: { type: Type.STRING, description: "Credibility assessment of the author." },
                            link: { type: Type.STRING, description: "Direct URL to the original source." },
                        },
                        required: ["name", "credibility", "publicationDate", "author", "evidenceType", "evidenceCredibility", "authorCredibility", "link"],
                    },
                    acceptancePercentage: { type: Type.NUMBER, description: "Estimated percentage of public acceptance (0-100)." },
                    proponents: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "Name of the proponent (person or group)." },
                                argument: { type: Type.STRING, description: "The proponent's main argument." },
                            },
                            required: ["name", "argument"],
                        }
                    },
                    opponents: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "Name of the opponent (person or group)." },
                                argument: { type: Type.STRING, description: "The opponent's main argument or refutation." },
                            },
                            required: ["name", "argument"],
                        }
                    },
                    relatedSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Suggestions for further reading." },
                    relatedSources: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                url: { type: Type.STRING },
                                title: { type: Type.STRING }
                            },
                            required: ["url", "title"]
                        }
                    }
                },
                required: ["overallCredibility", "summary", "originalSource", "acceptancePercentage", "proponents", "opponents", "relatedSuggestions", "relatedSources"]
            }
        };

        const contentParts: any[] = [{ text: prompt }];

        if (file) {
            contentParts.push({
                inlineData: {
                    data: file.data,
                    mimeType: file.mimeType,
                },
            });
        }
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contentParts },
            config: modelConfig,
        });
        
        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString);
        return {
            ...parsedResult,
            overallCredibility: parsedResult.overallCredibility as Credibility,
        };
    } catch (error) {
        console.error("Error fact-checking content from Gemini:", error);
        throw new Error("Failed to fact-check content.");
    }
}

export interface FindSourcesOptions {
    region: 'any' | 'internal' | 'external';
    language: 'any' | 'persian' | 'non-persian';
    count: number;
    credibility: 'any' | 'high' | 'medium';
}

export async function findSourcesWithAI(category: SourceCategory, existingSources: Source[], options: FindSourcesOptions): Promise<Omit<Source, 'id'>[]> {
    const ai = getAiClient();
    try {
        const prompt = `
            Find ${options.count} new, reputable sources for the category "${category}".
            Adhere to the following criteria for the search:
            - Region: ${options.region === 'internal' ? 'Inside Iran' : options.region === 'external' ? 'Outside Iran' : 'Any region'}.
            - Language: ${options.language === 'persian' ? 'Persian language only' : options.language === 'non-persian' ? 'Any language except Persian' : 'Any language'}.
            - Credibility: Prioritize sources with ${options.credibility === 'any' ? 'any level of' : options.credibility} credibility.
            
            Do not include any of the following existing sources: ${existingSources.map(s => s.name).join(', ')}.
            For each new source, provide its name, primary field/topic, official URL, a brief description of its activity, its general credibility rating, and its country/region. All output must be in Persian where applicable.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            field: { type: Type.STRING },
                            url: { type: Type.STRING },
                            activity: { type: Type.STRING },
                            credibility: { type: Type.STRING },
                            region: { type: Type.STRING }
                        },
                        required: ["name", "field", "url", "activity", "credibility", "region"]
                    }
                }
            }
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error finding sources with AI:", error);
        throw new Error("Failed to find new sources.");
    }
}

export async function fetchLiveNews(tab: string, allSources: Sources, instructions: string, showImages: boolean, liveNewsSettings: LiveNewsSpecificSettings): Promise<NewsArticle[]> {
    const ai = getAiClient();
    try {
        const selectedSourceIds = new Set(Object.values(liveNewsSettings.selectedSources).flat());
        const sourceNames = selectedSourceIds.size > 0
            ? Object.values(allSources).flat().filter(s => selectedSourceIds.has(s.id)).map(s => s.name).join(', ')
            : 'any reputable source';
        
        const filters = [
            `- Tab Topic: "${tab}"`,
            liveNewsSettings.categories.length > 0 && `- Categories: "${liveNewsSettings.categories.join(', ')}"`,
            liveNewsSettings.newsGroups.length > 0 && `- News Groups: "${liveNewsSettings.newsGroups.join(', ')}"`,
            liveNewsSettings.regions.length > 0 && `- Regions: "${liveNewsSettings.regions.join(', ')}"`,
        ].filter(Boolean).join('\n');

        const prompt = `
            ${instructions}
            IMPORTANT: All output text (titles, summaries, etc.) MUST be in Persian. If a source is in another language, translate its content to natural-sounding Persian.
            Find the 8 latest and most important news articles based on the following criteria for a Persian-speaking user.
            ${filters}
            Prioritize results from the following user-provided sources if possible: ${sourceNames}.
            Return the results in the standard news article format.
            ${showImages ? 'Image Requirement: For each article, you MUST find and provide a direct URL to a high-quality, relevant photograph that accurately represents the news content. The image must be directly related to the subject of the article. Generic or unrelated images are not acceptable.' : 'Do not include image URLs.'}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: newsArticleSchema
                },
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as NewsArticle[];

    } catch (error) {
        console.error(`Error fetching live news for tab ${tab}:`, error);
        throw new Error(`Failed to fetch live news for ${tab}.`);
    }
}

export async function generateAIInstruction(taskDescription: string): Promise<string> {
    const ai = getAiClient();
    try {
        const prompt = `You are a helpful assistant specialized in creating AI system prompts. The user wants a system instruction for an AI that performs the following task: "${taskDescription}". Generate a concise, clear, and effective system instruction in PERSIAN that guides the AI to perform this task optimally. The output should be ONLY the generated instruction text, without any preamble or explanation.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating AI instruction:", error);
        throw new Error("Failed to generate AI instruction.");
    }
}

export async function generateEditableListItems(listName: string, existingItems: string[]): Promise<string[]> {
    const ai = getAiClient();
    try {
        const prompt = `Generate a JSON array of 5 new, relevant, and common items for a settings list named "${listName}" in Persian. Do not include any of the following already existing items: ${JSON.stringify(existingItems)}. The output must be only the JSON array of strings.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        // The model might return the JSON inside a markdown block, so we clean it up.
        const cleanedText = response.text.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleanedText) as string[];
    } catch (error) {
        console.error(`Error generating items for list "${listName}":`, error);
        throw new Error(`Failed to generate items for "${listName}".`);
    }
}

export async function generateDynamicFilters(
  query: string,
  listType: 'categories' | 'regions' | 'sources',
  count: number
): Promise<string[]> {
  const ai = getAiClient();
  const typeMap = {
    categories: 'دسته‌بندی‌های خبری',
    regions: 'مناطق جغرافیایی',
    sources: 'منابع خبری (نام خبرگزاری یا وب‌سایت)',
  };

  const prompt = `Based on the search query "${query}", generate a JSON array of ${count} relevant and specific ${typeMap[listType]} in Persian. The output must be only the JSON array of strings. For example: ["ایران", "خاورمیانه"].`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const cleanedText = response.text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanedText) as string[];
  } catch (error) {
    console.error(`Error generating dynamic filters for ${listType}:`, error);
    throw new Error(`Failed to generate dynamic filters for ${listType}.`);
  }
}

export async function testGeminiConnection(): Promise<boolean> {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("Gemini connection test failed: No API Key provided via environment variable.");
            return false;
        }

        const client = new GoogleGenAI({ apiKey });
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "test",
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return typeof response.text === 'string';
    } catch (error) {
        console.error("Gemini connection test failed:", error);
        return false;
    }
}

export async function testAIInstruction(systemInstruction: string): Promise<boolean> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "سلام",
            config: {
                systemInstruction,
                thinkingConfig: { thinkingBudget: 0 }
            },
        });
        return typeof response.text === 'string' && response.text.length > 0;
    } catch (error) {
        console.error("AI instruction test failed:", error);
        return false;
    }
}

// Placeholder function to simulate checking for updates
export async function checkForUpdates(sources: Sources): Promise<boolean> {
    console.log("Checking for updates from sources (simulation)...", sources);
    // In a real app, this would involve fetching from source URLs/APIs
    // and comparing timestamps or content hashes with previously stored data.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    return Math.random() > 0.7; // 30% chance of finding an "update"
}

// --- New Web Search Function ---
export async function fetchWebResults(searchType: 'video' | 'audio' | 'book' | 'music' | 'dollar', filters: Filters, instructions: string): Promise<{ results: WebResult[], sources: GroundingSource[], suggestions: string[] }> {
    const ai = getAiClient();
    try {
        const typeMap = {
            video: 'ویدئو',
            audio: 'صدا (پادکست، کتاب صوتی)',
            book: 'کتاب و سایت',
            music: 'موزیک و آهنگ',
            dollar: 'قیمت دلار و ارز'
        };

        const prompt = `
            ${instructions}
            You are a specialized search engine for ${typeMap[searchType]}. The user is Persian-speaking.
            Based on the user's query and filters, find the top 5 most relevant results from the web.
            - Search Query: "${filters.query}"
            - Categories: "${filters.categories.length === 0 || filters.categories.includes('all') ? 'any' : filters.categories.join(', ')}"
            - Regions: "${filters.regions.length === 0 || filters.regions.includes('all') ? 'any' : filters.regions.join(', ')}"
            - Sources: "${filters.sources.length === 0 || filters.sources.includes('all') ? 'any reputable source' : filters.sources.join(', ')}"
            
            IMPORTANT: Format each result clearly. Start each result with "--- RESULT ---".
            For each result, provide the following information on separate lines, each prefixed with the key and a colon (e.g., "title: The Title"):
            - title: [The title]
            - link: [The direct URL]
            - source: [The source name, e.g., "YouTube"]
            - description: [A brief summary in Persian]
            - imageUrl: [A direct link to a relevant thumbnail image]

            After all the results, add a line that says "--- SUGGESTIONS ---", followed by a comma-separated list of 3 relevant search suggestions in Persian. For example: "--- SUGGESTIONS ---\\nپیشنهاد اول, پیشنهاد دوم, پیشنهاد سوم"
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources: GroundingSource[] = groundingChunks
            .map((chunk: any) => ({
                uri: chunk.web?.uri,
                title: chunk.web?.title,
            }))
            .filter((source: GroundingSource) => source.uri && source.title);
        
        // --- New parsing logic ---
        const textResponse = response.text;
        const results: WebResult[] = [];
        let suggestions: string[] = [];

        const mainParts = textResponse.split('--- SUGGESTIONS ---');
        const resultsText = mainParts[0];
        const suggestionsText = mainParts[1];

        if (suggestionsText) {
            suggestions = suggestionsText.trim().split(',').map(s => s.trim()).filter(Boolean);
        }

        const resultBlocks = resultsText.split('--- RESULT ---').slice(1);

        for (const block of resultBlocks) {
            const result: Partial<WebResult> = {};
            const lines = block.trim().split('\n');
            for (const line of lines) {
                const separatorIndex = line.indexOf(':');
                if (separatorIndex > 0) { // Ensure colon is not the first character
                    const key = line.substring(0, separatorIndex).trim();
                    const value = line.substring(separatorIndex + 1).trim();

                    switch (key) {
                        case 'title': result.title = value; break;
                        case 'link': result.link = value; break;
                        case 'source': result.source = value; break;
                        case 'description': result.description = value; break;
                        case 'imageUrl': result.imageUrl = value; break;
                    }
                }
            }
            if (result.title && result.link && result.source && result.description) {
                results.push(result as WebResult);
            }
        }
        
        if (results.length === 0 && textResponse.length > 10) {
            // Fallback for when the model doesn't follow the format but gives a text response
            console.warn("Web search result parsing failed. Returning a single result based on the text.");
            return {
                results: [{
                    title: `پاسخ برای "${filters.query}"`,
                    link: '#',
                    source: 'Gemini',
                    description: resultsText.trim()
                }],
                sources,
                suggestions: [],
            };
        }

        return { results, sources, suggestions };

    } catch (error) {
        console.error(`Error fetching web results for ${searchType}:`, error);
        throw new Error(`Failed to fetch results for ${searchType}.`);
    }
}


// --- New Structured Search Functions ---

const structuredSourceSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        link: { type: Type.STRING },
        publicationDate: { type: Type.STRING },
        author: { type: Type.STRING },
        credibility: { type: Type.STRING, enum: ['بسیار معتبر', 'معتبر', 'نیازمند بررسی'] },
    },
    required: ["name", "link", "publicationDate", "author", "credibility"]
};

const structuredAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        proponents: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, argument: { type: Type.STRING } },
                required: ["name", "argument"]
            }
        },
        opponents: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, argument: { type: Type.STRING } },
                required: ["name", "argument"]
            }
        },
        acceptancePercentage: { type: Type.NUMBER },
        currentValidity: { type: Type.STRING, description: "Describe if the findings are still valid today." },
        alternativeResults: { type: Type.STRING, description: "If not valid, mention alternative findings or views." }
    },
    required: ["proponents", "opponents", "acceptancePercentage", "currentValidity"]
};

const statisticsResultSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        chart: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ['bar', 'pie', 'line', 'table'] },
                title: { type: Type.STRING },
                labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                datasets: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING },
                            data: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                            color: { type: Type.STRING, description: "Optional: A hex color code for this dataset's line or bars (e.g., '#8b5cf6')." }
                        },
                        required: ["label", "data"]
                    }
                }
            },
            required: ["type", "title", "labels", "datasets"]
        },
        sourceDetails: {
            ...structuredSourceSchema,
            properties: {
                ...structuredSourceSchema.properties,
                methodology: { type: Type.STRING },
                sampleSize: { type: Type.STRING }
            },
            required: [...structuredSourceSchema.required, "methodology", "sampleSize"]
        },
        analysis: structuredAnalysisSchema,
        relatedSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        references: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, url: { type: Type.STRING } },
                required: ["title", "url"]
            }
        }
    },
    required: ["title", "summary", "keywords", "chart", "sourceDetails", "analysis", "relatedSuggestions", "references"]
};

export async function fetchStatistics(query: string, instructions: string): Promise<StatisticsResult> {
    const ai = getAiClient();
    const prompt = `${instructions}
    **Task:** Find the most reliable statistical data for the user's query and format it as a JSON object. The entire output must be in Persian.
    **Query:** "${query}"
    
    **Instructions for JSON fields:**
    - \`title\`: A clear, descriptive title for the statistic.
    - \`summary\`: A brief, easy-to-understand summary of the main finding.
    - \`keywords\`: Generate 3-5 relevant keywords.
    - \`chart\`: Create data for a visual chart. Choose the best type ('bar', 'pie', 'line', 'table'). Use 'line' for data that changes over time (e.g., yearly statistics). Use 'table' for detailed comparisons across multiple categories. Provide a title, labels for each data point/column, and the dataset(s) itself.
    - \`sourceDetails\`: Find the original, primary source of the data. Include its name, link, author, publication date, credibility, the methodology used, and the sample size.
    - \`analysis\`: Provide a balanced view with proponents and opponents, the public acceptance rate, and the current validity of the data.
    - \`relatedSuggestions\`: Offer 3 suggestions for further reading.
    - \`references\`: Provide up to 3 links to other articles or studies that reference this data.
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: statisticsResultSchema
        }
    });
    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
}

const scientificArticleResultSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        sourceDetails: {
            ...structuredSourceSchema,
            properties: {
                ...structuredSourceSchema.properties,
                researchType: { type: Type.STRING },
                targetAudience: { type: Type.STRING }
            },
            required: [...structuredSourceSchema.required, "researchType", "targetAudience"]
        },
        analysis: structuredAnalysisSchema,
        relatedSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        references: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, url: { type: Type.STRING } },
                required: ["title", "url"]
            }
        }
    },
    required: ["title", "summary", "keywords", "sourceDetails", "analysis", "relatedSuggestions", "references"]
};


export async function fetchScientificArticle(query: string, instructions: string): Promise<ScientificArticleResult> {
    const ai = getAiClient();
    const prompt = `${instructions}
    **Task:** Find a key scientific paper or academic article for the user's query and format it as a JSON object. Prioritize sources from academic journals, universities, and research institutions. The entire output must be in Persian.
    **Query:** "${query}"
    
    **Instructions for JSON fields:**
    - \`title\`: The official title of the paper/article.
    - \`summary\`: A summary of the abstract and key findings.
    - \`keywords\`: Extract the main keywords.
    - \`sourceDetails\`: The primary source. Include name (e.g., 'Journal of Science'), link (to the article page or DOI), author(s), publication date, credibility, the type of research (e.g., 'Peer-reviewed study'), and the target audience.
    - \`analysis\`: Provide a balanced view with proponents and opponents, its acceptance in the scientific community, and its current validity.
    - \`relatedSuggestions\`: Offer 3 suggestions for related fields of study.
    - \`references\`: Provide up to 3 links to other academic works that cite or are cited by this paper.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: scientificArticleResultSchema
        }
    });
    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
}

// This function can serve for both religion and potentially other text-based academic fields
export async function fetchReligiousText(query: string, instructions: string): Promise<ScientificArticleResult> {
    const ai = getAiClient();
     const prompt = `${instructions}
    **Task:** Find a key religious text, interpretation, or academic article for the user's query and format it as a JSON object. Prioritize primary religious texts (like Quran, Bible, etc.) and reputable academic or theological sources. The entire output must be in Persian.
    **Query:** "${query}"
    
    **Instructions for JSON fields:**
    - \`title\`: The title of the text, chapter, or article.
    - \`summary\`: A summary of the content and its significance.
    - \`keywords\`: Extract the main keywords or concepts.
    - \`sourceDetails\`: The primary source. Include name (e.g., 'Quran, Surah Al-Baqarah', 'Tafsir al-Mizan'), link (if available), author(s), and its credibility/importance.
    - \`analysis\`: Provide a balanced view of different interpretations or schools of thought (proponents/opponents), its acceptance, and its current relevance.
    - \`relatedSuggestions\`: Offer 3 suggestions for related topics or texts.
    - \`references\`: Provide up to 3 links to commentaries or related studies.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: scientificArticleResultSchema // The schema is reusable
        }
    });
    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
}


export async function analyzeVideoFromUrl(url: string, analysisType: 'summary' | 'analysis' | 'fact-check' | 'timestamp' | 'transcription', keywords: string, instructions: string): Promise<any> {
    const ai = getAiClient();
    
    const commonPrompt = `
        ${instructions}
        **Video URL for analysis:** ${url}
        **Requested Task:** ${analysisType}
    `;

    let specificPrompt = '';
    let responseSchema: any = { type: Type.OBJECT, properties: {} };

    switch (analysisType) {
        case 'summary':
            specificPrompt = 'Provide a concise summary of the video content.';
            responseSchema.properties = { summary: { type: Type.STRING }};
            break;
        case 'analysis':
            specificPrompt = 'Provide a comprehensive analysis of the topics, arguments, and tone of the video.';
            responseSchema.properties = { comprehensiveReport: { type: Type.STRING }};
            break;
        case 'fact-check':
            specificPrompt = 'Deeply analyze the video. Identify key claims made. For each claim, analyze its logical soundness and verify any evidence presented. Check for context manipulation. Provide an overall verdict and detailed breakdown.';
            responseSchema.properties = {
                overallVerdict: { type: Type.STRING, description: "Final verdict (e.g., 'Mostly True', 'Misleading', 'False')." },
                claims: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            claimText: { type: Type.STRING },
                            analysis: { type: Type.STRING },
                            evidence: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        evidenceText: { type: Type.STRING },
                                        isReal: { type: Type.BOOLEAN },
                                        isCredible: { type: Type.BOOLEAN },
                                        isRelevant: { type: Type.BOOLEAN },
                                        sourceLink: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                }
            };
            break;
        case 'timestamp':
            specificPrompt = `Find all occurrences of the following keywords/phrases in the video transcript: "${keywords}". For each finding, provide the exact timestamp (HH:MM:SS) and the full sentence in which it appeared.`;
            responseSchema.properties = {
                found: { type: Type.BOOLEAN },
                timestamps: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            keyword: { type: Type.STRING },
                            sentence: { type: Type.STRING },
                            timestamp: { type: Type.STRING }
                        }
                    }
                }
            };
            break;
        case 'transcription':
            specificPrompt = 'Transcribe the entire video content into fluent Persian text. The output should be a single block of text containing the full transcription.';
            responseSchema.properties = { transcription: { type: Type.STRING }};
            break;
    }

    const fullPrompt = `${commonPrompt}\n${specificPrompt}`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });
    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
}

// --- GENERAL TOPICS SEARCH ---

export async function generateKeywordsForTopic(mainTopic: string, comparisonTopic: string): Promise<string[]> {
    const ai = getAiClient();
    try {
        let prompt = `Generate a JSON array of 5 relevant and diverse search keywords for the main topic: "${mainTopic}".`;
        if (comparisonTopic) {
            prompt += ` Also consider the comparison with "${comparisonTopic}".`;
        }
        prompt += ` The keywords should be in Persian. The output must be only the JSON array of strings.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        
        const cleanedText = response.text.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Error generating keywords for topic:", error);
        throw new Error("Failed to generate keywords.");
    }
}

export async function fetchGeneralTopicAnalysis(
    mainTopic: string,
    comparisonTopic: string,
    keywords: string[],
    domains: string[],
    instructions: string
): Promise<GeneralTopicResult> {
    const ai = getAiClient();
    try {
        let prompt = `
            ${instructions}
            **Main Topic:** ${mainTopic}
        `;
        if (comparisonTopic) {
            prompt += `\n**Comparison Topic:** ${comparisonTopic}`;
        }
        if (keywords.length > 0) {
            prompt += `\n**Keywords to focus on:** ${keywords.join(', ')}`;
        }
        if (domains.length > 0) {
            prompt += `\n**Relevant Domains/Fields:** ${domains.join(', ')}`;
        }

        prompt += `\n
            Please perform a comprehensive web search to generate a report.
            IMPORTANT: All output text must be in Persian.
            
            Structure your response using the following format, starting each section with the key on a new line. Do NOT use markdown.

            title: [A clear and concise title for the report in Persian]
            
            summary: [A detailed summary of the findings in Persian]
            
            --- KEY POINTS ---
            [Up to 5 key points. Each point should be on a new line, formatted as: point_title: point_description]
            
            --- COMPARISON ---
            [If a comparison topic was provided, give a side-by-side analysis. Format as:
            topicA: [Main Topic]
            topicB: [Comparison Topic]
            -- Point --
            aspect: [The aspect being compared]
            analysisA: [Analysis for Topic A]
            analysisB: [Analysis for Topic B]
            (Repeat for multiple points)]
            [If no comparison topic, just write "comparison: null"]
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources: GroundingSource[] = groundingChunks
            .map((chunk: any) => ({
                uri: chunk.web?.uri,
                title: chunk.web?.title,
            }))
            .filter((source: GroundingSource) => source.uri && source.title);

        // Parse the text response
        const text = response.text;
        const result: Partial<GeneralTopicResult> = { sources, keyPoints: [] };

        const titleMatch = text.match(/^title:\s*(.*)/m);
        result.title = titleMatch ? titleMatch[1].trim() : `Report on ${mainTopic}`;

        const summaryMatch = text.match(/^summary:\s*([\s\S]*?)(?=--- KEY POINTS ---)/m);
        result.summary = summaryMatch ? summaryMatch[1].trim() : 'No summary provided.';
        
        const keyPointsSection = text.split('--- KEY POINTS ---')[1]?.split('--- COMPARISON ---')[0];
        if (keyPointsSection) {
            const pointMatches = [...keyPointsSection.matchAll(/^(.*?):\s*(.*)/gm)];
            pointMatches.forEach(match => {
                if (match[1].trim() && match[2].trim()) {
                    result.keyPoints!.push({ title: match[1].trim(), description: match[2].trim() });
                }
            });
        }

        result.comparison = null;
        const comparisonSection = text.split('--- COMPARISON ---')[1];
        if (comparisonSection && !comparisonSection.includes("comparison: null")) {
            const topicAMatch = comparisonSection.match(/^topicA:\s*(.*)/m);
            const topicBMatch = comparisonSection.match(/^topicB:\s*(.*)/m);
            if (topicAMatch && topicBMatch) {
                result.comparison = {
                    topicA: topicAMatch[1].trim(),
                    topicB: topicBMatch[1].trim(),
                    points: []
                };
                const pointBlocks = comparisonSection.split('-- Point --').slice(1);
                pointBlocks.forEach(block => {
                    const aspectMatch = block.match(/^aspect:\s*(.*)/m);
                    const analysisAMatch = block.match(/^analysisA:\s*(.*)/m);
                    const analysisBMatch = block.match(/^analysisB:\s*(.*)/m);
                    if (aspectMatch && analysisAMatch && analysisBMatch) {
                        result.comparison!.points.push({
                            aspect: aspectMatch[1].trim(),
                            analysisA: analysisAMatch[1].trim(),
                            analysisB: analysisBMatch[1].trim(),
                        });
                    }
                });
            }
        }
        
        return result as GeneralTopicResult;

    } catch (error) {
        console.error("Error fetching general topic analysis from Gemini:", error);
        throw new Error("Failed to fetch general topic analysis.");
    }
}


// --- ONLINE TOOLS - CONTENT CREATOR ---

export const generateSeoKeywords = async (topic: string, instructions: string): Promise<string[]> => {
    const ai = getAiClient();
    const prompt = `${instructions}\nTopic: "${topic}"`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    return JSON.parse(response.text.trim());
};

export const suggestWebsiteNames = async (topic: string, instructions: string): Promise<string[]> => {
    const ai = getAiClient();
    const prompt = `${instructions}\nTopic: "${topic}"`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    return JSON.parse(response.text.trim());
};

export const suggestDomainNames = async (topic: string, instructions: string): Promise<string[]> => {
    const ai = getAiClient();
    const prompt = `${instructions}\nTopic: "${topic}"`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    return JSON.parse(response.text.trim());
};

export const generateArticle = async (topic: string, wordCount: number, instructions: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `${instructions}\nTopic: "${topic}"\nWord Count: Approximately ${wordCount} words.`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return response.text.trim();
};

export const generateImagesForArticle = async (prompt: string, count: number, instructions: string): Promise<string[]> => {
    const ai = getAiClient();
    // This function will need a different model, likely an image generation one.
    // Placeholder for now as the exact API might differ.
    // For now, we simulate by asking Gemini to find image URLs.
    const findImagePrompt = `Find ${count} high-quality, royalty-free image URLs that perfectly match this description: "${prompt}". Return as a JSON array of strings.`;
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: findImagePrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    return JSON.parse(response.text.trim());
};

export async function formatTextContent(text: string | null, url: string | null, instructions: string): Promise<string> {
    const ai = getAiClient();
    
    let promptContent;
    if (url) {
        promptContent = `First, fetch the main article content from this URL: ${url}. Ignore navigation, ads, and footers. Then, format the extracted content.`;
    } else {
        promptContent = `Format the following text:\n\n---\n\n${text}`;
    }

    const fullPrompt = `
        ${instructions}
        You are an expert content formatter and editor. Your task is to take the provided raw text (or the main content extracted from the provided URL) and reformat it into a clean, well-structured, and visually appealing HTML snippet.

        **Formatting Rules:**
        1.  **Structure:**
            *   Identify the main title and wrap it in an \`<h1 style="...">\` tag.
            *   Identify subheadings and wrap them in \`<h2 style="...">\` or \`<h3 style="...">\` tags.
            *   Break down long blocks of text into logical paragraphs wrapped in \`<p style="...">\`.
            *   Identify and format bulleted lists as \`<ul><li>...</li></ul>\` and numbered lists as \`<ol><li>...</li></ol>\`.
        2.  **Styling:**
            *   Apply **inline CSS styles** directly to the HTML elements.
            *   Use a professional and attractive color palette suitable for a dark theme. For example:
                *   Main title (\`h1\`): A prominent color like \`color: #67e8f9;\` (light cyan).
                *   Subheadings (\`h2\`, \`h3\`): A clear color like \`color: #93c5fd;\` (light blue).
                *   Paragraphs (\`p\`): A readable, slightly off-white color like \`color: #d1d5db;\`.
                *   Links (\`a\`): A distinct color like \`color: #818cf8;\` (indigo) and add \`text-decoration: none;\`.
            *   Ensure good readability with \`line-height: 1.6;\` on paragraphs and list items.
        3.  **Output:**
            *   The entire output MUST be in Persian.
            *   The output must be **ONLY the formatted HTML content**. Do NOT include \`<html>\`, \`<head>\`, or \`<body>\` tags.
        
        **Content to Process:**
        ${promptContent}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt
        });
        const cleanedHtml = response.text.trim().replace(/^```html\n?|```$/g, '');
        return cleanedHtml;
    } catch (error) {
        console.error("Error formatting text content from Gemini:", error);
        throw new Error("Failed to format text content.");
    }
}

// --- ANALYZER FUNCTIONS ---

export async function askForClarification(
    prompt: string,
    files: { inlineData: { data: string; mimeType: string } }[]
): Promise<ClarificationResponse> {
    const ai = getAiClient();
    const clarificationSchema = {
        type: Type.OBJECT,
        properties: {
            clarificationNeeded: { type: Type.BOOLEAN, description: 'True if the user\'s request is ambiguous or needs more detail before proceeding with a full analysis.' },
            question: { type: Type.STRING, description: 'If clarificationNeeded is true, ask a single, clear question to the user to get the necessary information. This question must be in Persian.' },
        },
        required: ['clarificationNeeded']
    };

    const fullPrompt = `
        You are an AI assistant preparing to perform a complex analysis. Your first task is to evaluate the user's request for clarity.
        User's Request: "${prompt}"
        Based on this request, determine if you have enough specific information to proceed.
        - If the request is clear and actionable, set 'clarificationNeeded' to false.
        - If the request is vague (e.g., "analyze politics"), ambiguous, or lacks key details, set 'clarificationNeeded' to true and formulate a single, concise question in Persian to ask the user. For example: "منظور شما از «سیاست» کدام حوزه است؟ سیاست داخلی ایران، روابط بین‌الملل، یا موضوعی خاص؟"
    `;

    const contentParts: any[] = [{ text: fullPrompt }];
    files.forEach(file => contentParts.push(file));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contentParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: clarificationSchema,
            },
        });
        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);
        // Ensure question is not null if needed
        if (parsed.clarificationNeeded && !parsed.question) {
            parsed.question = "لطفاً درخواست خود را با جزئیات بیشتری بیان کنید.";
        }
        return parsed;
    } catch (error) {
        console.error("Error asking for clarification:", error);
        // Fallback to proceeding without clarification on error
        return { clarificationNeeded: false, question: '' };
    }
}

export async function performAnalysis(
    prompt: string,
    files: { inlineData: { data: string; mimeType: string } }[],
    instructions: string,
): Promise<AnalysisResult> {
    const ai = getAiClient();
    const analysisSchema = {
        type: Type.OBJECT,
        properties: {
            understanding: { type: Type.STRING, description: 'A brief summary in Persian of how the AI understood the user\'s final request.' },
            analysis: { type: Type.STRING, description: 'The main, detailed analysis of the topic, written in Persian. This should be a comprehensive, well-structured text.' },
            proponents: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        argument: { type: Type.STRING },
                        scientificLevel: { type: Type.NUMBER, description: 'A rating from 1 (low) to 5 (high) of the scientific/academic rigor of the argument.' },
                    },
                    required: ["name", "argument", "scientificLevel"]
                }
            },
            opponents: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        argument: { type: Type.STRING },
                        scientificLevel: { type: Type.NUMBER, description: 'A rating from 1 (low) to 5 (high) of the scientific/academic rigor of the argument.' },
                    },
                    required: ["name", "argument", "scientificLevel"]
                }
            },
            proponentPercentage: { type: Type.NUMBER, description: 'An estimated percentage (0-100) of experts or the public who support the proponent\'s view.' },
            sources: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT, properties: { title: { type: Type.STRING }, url: { type: Type.STRING } }, required: ["title", "url"]
                }
            },
            techniques: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of analytical techniques used (e.g., "Historical Analysis", "Logical Reasoning").' },
            suggestions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT, properties: { title: { type: Type.STRING }, url: { type: Type.STRING } }, required: ["title", "url"]
                }
            },
            examples: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ["title", "content"]
                }
            },
        },
        required: ["understanding", "analysis", "proponents", "opponents", "proponentPercentage", "sources", "techniques", "suggestions", "examples"]
    };

    const fullPrompt = `
        ${instructions}
        **User Request for Analysis:**
        ${prompt}
        
        Please conduct a comprehensive analysis based on the user's request and your instructions. Your entire output must be in Persian and conform to the provided JSON schema.
    `;
    const contentParts: any[] = [{ text: fullPrompt }];
    files.forEach(file => contentParts.push(file));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contentParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error performing analysis:", error);
        throw new Error("Failed to perform analysis.");
    }
}

export async function findFallacies(
    prompt: string,
    instructions: string,
    fallacyList: string[]
): Promise<FallacyResult> {
    const ai = getAiClient();
    const fallacySchema = {
        type: Type.OBJECT,
        properties: {
            identifiedFallacies: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, description: 'The name of the logical fallacy, chosen from the provided list.' },
                        quote: { type: Type.STRING, description: 'The exact quote from the input text that contains the fallacy.' },
                        explanation: { type: Type.STRING, description: 'A clear explanation in Persian of why this is a fallacy.' },
                        correctedStatement: { type: Type.STRING, description: 'A corrected, fallacy-free version of the statement, in Persian.' },
                    },
                    required: ["type", "quote", "explanation", "correctedStatement"]
                }
            }
        },
        required: ["identifiedFallacies"]
    };

    const fullPrompt = `
        ${instructions}
        **Text to Analyze for Fallacies:**
        ${prompt}

        Please analyze the text and identify any logical fallacies from the following list: ${fallacyList.join(', ')}.
        If no fallacies are found, return an empty array for 'identifiedFallacies'.
        Your entire output must be in Persian and conform to the provided JSON schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: fallacySchema,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error finding fallacies:", error);
        throw new Error("Failed to find fallacies.");
    }
}

// --- WEB AGENT FUNCTIONS ---
export async function analyzeAgentRequest(
    topic: string,
    request: string,
    instructions: string
): Promise<AgentClarificationRequest> {
    const ai = getAiClient();
    const agentClarificationSchema = {
        type: Type.OBJECT,
        properties: {
            isClear: { type: Type.BOOLEAN, description: 'True if the request is specific enough to be executed directly.' },
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionText: { type: Type.STRING, description: 'A question in Persian to clarify the user\'s intent.' },
                        questionType: { type: Type.STRING, enum: ['multiple-choice', 'text-input'] },
                        options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Optional list of choices for multiple-choice questions.' },
                    },
                    required: ["questionText", "questionType"]
                },
                description: 'A list of questions to ask the user if the request is not clear.'
            },
            refinedPrompt: { type: Type.STRING, description: 'If the request is clear, provide a refined, detailed version of the prompt that the execution agent will use. If not clear, this can be an empty string.' },
        },
        required: ["isClear", "questions", "refinedPrompt"]
    };

    const fullPrompt = `
        ${instructions}
        **User Topic:** ${topic}
        **User Request:** ${request}

        Analyze this request. Determine if it's clear enough for a web agent to execute.
        - If clear, set isClear to true and create a detailed, refined prompt for the next step.
        - If ambiguous, set isClear to false and create 1-3 questions to ask the user for clarification.
        Your entire output must be in Persian and conform to the provided JSON schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: agentClarificationSchema,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error analyzing agent request:", error);
        throw new Error("Failed to analyze agent request.");
    }
}

export async function executeAgentTask(
    finalPrompt: string,
    instructions: string
): Promise<AgentExecutionResult> {
    const ai = getAiClient();
    const fullPrompt = `
        ${instructions}
        **Final Confirmed Task:**
        ${finalPrompt}

        Execute this task by searching the web. Provide a summary, a list of steps taken, and the sources you used.
        The entire output MUST be in Persian.
        Structure your response using the following format, starting each section with the key on a new line. Do NOT use markdown.
        
        summary: [A detailed summary of the findings in Persian]
        
        --- STEPS ---
        [Up to 5 steps. Each point should be on a new line, formatted as: step_title: step_description]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources: GroundingSource[] = groundingChunks
            .map((chunk: any) => ({
                uri: chunk.web?.uri,
                title: chunk.web?.title,
            }))
            .filter((source: GroundingSource) => source.uri && source.title);

        // Parse the text response
        const text = response.text;
        const result: Partial<AgentExecutionResult> = { sources, steps: [] };

        const summaryMatch = text.match(/^summary:\s*([\s\S]*?)(?=--- STEPS ---)/m);
        result.summary = summaryMatch ? summaryMatch[1].trim() : 'No summary provided.';
        
        const stepsSection = text.split('--- STEPS ---')[1];
        if (stepsSection) {
            const stepMatches = [...stepsSection.matchAll(/^(.*?):\s*(.*)/gm)];
            stepMatches.forEach(match => {
                if (match[1].trim() && match[2].trim()) {
                    result.steps!.push({ title: match[1].trim(), description: match[2].trim() });
                }
            });
        }
        
        return result as AgentExecutionResult;

    } catch (error) {
        console.error("Error executing agent task:", error);
        throw new Error("Failed to execute agent task.");
    }
}

// --- ONLINE TOOLS - PAGE BUILDER ---
export async function generateAboutMePage(
    description: string,
    siteUrl: string,
    platform: string,
    images: { data: string; mimeType: string }[],
    config: PageConfig,
    instructions: string
): Promise<string> {
    const ai = getAiClient();

    // Helper to format menu items for the prompt
    const formatMenuItems = (items: any[], level = 0) => {
        let prompt = '';
        items.forEach(item => {
            prompt += `${'  '.repeat(level)}- "${item.label}" -> ${item.link}\n`;
            if (item.children && item.children.length > 0) {
                prompt += formatMenuItems(item.children, level + 1);
            }
        });
        return prompt;
    };
    
    // Helper to format slideshow items
    const formatSlides = (slides: any[]) => {
        return slides.map((slide, index) => 
            `- Slide ${index + 1}:\n  - Image Name: ${slide.name}\n  - Caption: "${slide.caption}"`
        ).join('\n');
    }

    const configPrompt = `
      **Page Configuration Details:**
      - **Template:** ${config.template}
      - **Layout:** ${config.layoutColumns}-column layout.
      - **Header Enabled:** ${config.header ? 'Yes' : 'No'}
      - **Footer Enabled:** ${config.footer ? 'Yes' : 'No'}

      **Menu Configuration:**
      - **Enabled:** ${config.menu.enabled}
      - **Items:**\n${formatMenuItems(config.menu.items)}
      - **Styling:** Font: ${config.menu.fontFamily}, ${config.menu.fontSize}px, color ${config.menu.textColor}. Background: gradient from ${config.menu.gradientFrom} to ${config.menu.gradientTo} (or solid ${config.menu.bgColor}). Border: ${config.menu.borderColor} with ${config.menu.borderRadius}px radius. Dropdown icon color: ${config.menu.iconColor}.

      **Slideshow Configuration:**
      - **Enabled:** ${config.slideshow.enabled}
      - **Slides:**\n${formatSlides(config.slideshow.slides)}
      - **Style:** ${config.slideshow.style} with ${config.slideshow.animation} animation. Direction: ${config.slideshow.direction}.
      - **Timing:** Delay per slide: ${config.slideshow.delay}s. Animation speed: ${config.slideshow.speed}ms.
      - **Dimensions:** Width: ${config.slideshow.width}, Height: ${config.slideshow.height}.
      - **Caption Styling:** Font: ${config.slideshow.captionFontFamily}, ${config.slideshow.captionFontSize}px, color ${config.slideshow.captionColor}. Background: ${config.slideshow.captionBgColor}.
      - **IMPORTANT for captions:** Parse markdown links like [text](url) into HTML <a> tags. Parse bold text like **text** into <strong> tags.

      **Marquee Configuration:**
      - **Enabled:** ${config.marquee.enabled}
      - **Content (may contain HTML):** "${config.marquee.text}"
      - **Styling:** Font: ${config.marquee.fontFamily}, ${config.marquee.fontSize}px, color ${config.marquee.textColor}. Background: ${config.marquee.bgColor}.
      - **Animation:** Speed (duration): ${config.marquee.speed}s. Direction: ${config.marquee.direction}.
      - **Box Style:** Border: ${config.marquee.border}. Padding: ${config.marquee.padding}.

      Integrate the ${images.length} uploaded images creatively into the design, using them in the slideshow if enabled.
    `;

    const fullPrompt = `
      ${instructions}

      **User's Request:**
      - **Core Description:** "${description}"
      - **Target Platform:** ${platform}
      - **Personal Website (if provided):** ${siteUrl}

      ${configPrompt}

      Please generate a complete, single HTML file with modern, responsive CSS inside a <style> tag. Fulfill all configuration requirements. The final output must be ONLY the raw HTML code, starting with <!DOCTYPE html> and ending with </html>. Do not include any explanations or markdown formatting around the code.
    `;

    const contentParts: any[] = [{ text: fullPrompt }];

    images.forEach(image => {
        contentParts.push({
            inlineData: {
                data: image.data,
                mimeType: image.mimeType,
            },
        });
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contentParts },
        });

        const text = response.text.trim();
        if (text.startsWith('```html')) {
            return text.replace(/```html\n?|```/g, '').trim();
        }
        return text;
    } catch (error) {
        console.error("Error generating 'About Me' page from Gemini:", error);
        throw new Error("Failed to generate 'About Me' page.");
    }
}