


import { GoogleGenAI, Type } from "@google/genai";
import type { AppSettings, NewsArticle, Filters, FactCheckResult, Credibility, TickerArticle, TickerSettings, LiveNewsSpecificSettings, Source, SourceCategory, Sources, StatisticsResult, ScientificArticleResult, WebResult, GroundingSource, VideoFactCheckResult, VideoTimestampResult, ClarificationResponse, AnalysisResult, FallacyResult, AgentClarificationRequest, AgentExecutionResult } from '../types';

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
    imageUrl: { type: Type.STRING, description: "یک URL مستقیم به یک تصویر مرتبط با کیفیت بالا برای خبر" },
  },
  required: ["title", "summary", "source", "publicationTime", "credibility", "link", "category"]
};

// FIX: Define a schema that includes both articles and suggestions to match component usage.
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
      ${showImages ? 'For each article, you MUST provide a relevant image URL.' : 'Do not include image URLs.'}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // FIX: Use the new schema that returns articles and suggestions.
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
                    summary: { type: Type.STRING, description: "A concise summary of the fact-check findings in Persian." },
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
            ${showImages ? 'For each article, you MUST provide a relevant image URL.' : 'Do not include image URLs.'}
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
// FIX: Update function to return suggestions and parse them from the response.
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
    - \`references\`: Provide up to 3 links to other papers that cite or are cited by this work.
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

export async function fetchReligiousText(query: string, instructions: string): Promise<ScientificArticleResult> {
    const ai = getAiClient();
    const prompt = `${instructions}
    **Task:** Find a key religious text, interpretation, or scholarly article for the user's query and format it as a JSON object. Prioritize primary religious texts (like verses, chapters) or well-regarded commentaries and academic studies on religion. The entire output must be in Persian.
    **Query:** "${query}"
    
    **Instructions for JSON fields:**
    - \`title\`: The title of the text, verse, or article (e.g., 'تفسیر آیه 5 سوره مائده').
    - \`summary\`: A summary of the content, meaning, or key findings.
    - \`keywords\`: Extract the main keywords.
    - \`sourceDetails\`: The primary source. Include name (e.g., 'قرآن کریم', 'صحیح بخاری', 'Journal of Religious Studies'), link (to an online version if available), author(s) (e.g., 'علامه طباطبایی', 'پیامبر اسلام (ص)' if applicable), publication date (if it's an article), credibility (e.g., 'متواتر', 'معتبر', 'مورد اختلاف'), the type of research (e.g., 'آیه قرآن', 'حدیث', 'مقاله تفسیری'), and the target audience.
    - \`analysis\`: Provide a balanced view with different interpretations or views if they exist (proponents/opponents can represent different schools of thought), its acceptance in the relevant religious community, and its current validity or interpretation.
    - \`relatedSuggestions\`: Offer 3 suggestions for related topics or verses.
    - \`references\`: Provide up to 3 links to other texts or commentaries that reference this work.
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

// --- NEW VIDEO CONVERTER FUNCTION ---

export async function analyzeVideoFromUrl(
    url: string, 
    task: 'summary' | 'analysis' | 'fact-check' | 'timestamp', 
    keywords: string, 
    instructions: string
): Promise<any> {
    const ai = getAiClient();
    let prompt = `${instructions}\n\n**Video URL for analysis:** ${url}\n\n`;
    let schema: any;

    switch (task) {
        case 'summary':
            prompt += "Task: Provide a concise summary of the video in a few lines.";
            schema = { type: Type.OBJECT, properties: { summary: { type: Type.STRING } } };
            break;
        case 'analysis':
            prompt += "Task: Provide a comprehensive but relatively short report analyzing the topics, content, and claims made in the video.";
            schema = { type: Type.OBJECT, properties: { comprehensiveReport: { type: Type.STRING } } };
            break;
        case 'fact-check':
            prompt += "Task: Conduct a deep fact-check of the video. Analyze claims based on logical, philosophical, and grammatical rules. Verify any presented documents or references for their reality, credibility, and relevance. Provide a final verdict, a list of analyzed claims with their evidence, and links to the sources of evidence.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    overallVerdict: { type: Type.STRING },
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
                                            sourceLink: { type: Type.STRING },
                                        },
                                        required: ["evidenceText", "isReal", "isCredible", "isRelevant", "sourceLink"]
                                    }
                                }
                            },
                             required: ["claimText", "analysis", "evidence"]
                        }
                    }
                },
                 required: ["overallVerdict", "claims"]
            };
            break;
        case 'timestamp':
            prompt += `Task: Find all occurrences of the following keywords/phrases in the video: "${keywords}". For each occurrence, provide the exact sentence and the timestamp in HH:MM:SS format. If none are found, indicate that.`;
            schema = {
                type: Type.OBJECT,
                properties: {
                    found: { type: Type.BOOLEAN },
                    timestamps: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                keyword: { type: Type.STRING },
                                sentence: { type: Type.STRING },
                                timestamp: { type: Type.STRING },
                            },
                             required: ["keyword", "sentence", "timestamp"]
                        }
                    }
                },
                required: ["found", "timestamps"]
            };
            break;
    }
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error analyzing video with Gemini:", error);
        throw new Error("Failed to analyze video.");
    }
}


// --- NEW ANALYZER FUNCTIONS ---

export async function askForClarification(prompt: string, files: any[]): Promise<ClarificationResponse> {
    const ai = getAiClient();
    const clarificationPrompt = `
        Review the user's analysis request below. Is it clear, specific, and unambiguous enough for a deep, academic-level analysis?
        If it is clear, respond with '{"clarificationNeeded": false, "question": ""}'.
        If it is ambiguous, vague, or too broad, formulate a SINGLE, concise question in PERSIAN that will best clarify the user's intent. The question should help narrow down the scope or specify the core of the request.
        Respond in this strict JSON format: '{"clarificationNeeded": true, "question": "Your question in Persian..."}'.

        --- USER'S REQUEST ---
        ${prompt}
    `;

    try {
        const contentParts = [{ text: clarificationPrompt }, ...files];
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contentParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        clarificationNeeded: { type: Type.BOOLEAN },
                        question: { type: Type.STRING }
                    },
                    required: ["clarificationNeeded", "question"]
                }
            }
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error asking for clarification:", error);
        return { clarificationNeeded: false, question: "" }; // Fail safe
    }
}

const analysisResultSchema = {
    type: Type.OBJECT,
    properties: {
        understanding: { type: Type.STRING, description: "A short summary of your understanding of the user's final request in Persian." },
        analysis: { type: Type.STRING, description: "The main, detailed, and structured analysis in Persian, using markdown for formatting." },
        proponents: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    argument: { type: Type.STRING },
                    scientificLevel: { type: Type.INTEGER, description: "A rating from 1 (low) to 5 (high) of the scientific/academic rigor of the argument." }
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
                    scientificLevel: { type: Type.INTEGER }
                },
                required: ["name", "argument", "scientificLevel"]
            }
        },
        proponentPercentage: { type: Type.NUMBER, description: "Estimated percentage of proponents' view acceptance (0-100)." },
        sources: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING }
                },
                required: ["title", "url"]
            }
        },
        techniques: { type: Type.ARRAY, items: { type: Type.STRING } },
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING }
                },
                required: ["title", "url"]
            }
        },
        examples: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                },
                required: ["title", "content"]
            }
        }
    },
    required: ["understanding", "analysis", "proponents", "opponents", "proponentPercentage", "sources", "techniques", "suggestions", "examples"]
};

export async function performAnalysis(prompt: string, files: any[], instructions: string): Promise<AnalysisResult> {
    const ai = getAiClient();
    try {
        const fullPrompt = `${instructions}\n\n**User Request:**\n${prompt}\n\nProduce a comprehensive analysis based on the user's request, using the provided files as context. Your response must be in Persian and conform strictly to the JSON schema.`;
        const contentParts = [{ text: fullPrompt }, ...files];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contentParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisResultSchema
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error performing analysis:", error);
        throw new Error("Failed to perform analysis.");
    }
}


export async function findFallacies(text: string, instructions: string, fallacyList: string[]): Promise<FallacyResult> {
    const ai = getAiClient();
    const prompt = `
        ${instructions}
        Analyze the following text for logical fallacies. Your entire output must be in Persian and structured as JSON.
        Reference Fallacy List: ${fallacyList.join(', ')}.

        For each fallacy you identify, provide:
        1.  The type of fallacy.
        2.  The exact quote from the text containing the fallacy.
        3.  A brief explanation of why it is a fallacy in this context.
        4.  A corrected, fallacy-free version of the statement.

        If no fallacies are found, return an empty array for 'identifiedFallacies'.

        Text for Analysis: "${text}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        identifiedFallacies: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    quote: { type: Type.STRING },
                                    explanation: { type: Type.STRING },
                                    correctedStatement: { type: Type.STRING }
                                },
                                required: ["type", "quote", "explanation", "correctedStatement"]
                            }
                        }
                    },
                    required: ["identifiedFallacies"]
                }
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error finding fallacies:", error);
        throw new Error("Failed to find fallacies.");
    }
}

// --- NEW WEB AGENT FUNCTIONS ---

// FIX: Implement missing analyzeAgentRequest function
export async function analyzeAgentRequest(topic: string, request: string, instructions: string): Promise<AgentClarificationRequest> {
    const ai = getAiClient();
    const prompt = `
        ${instructions}
        
        **User's Goal:**
        - Topic/URL: "${topic}"
        - Task: "${request}"

        **Your Task:**
        1. Analyze the user's request. Is it perfectly clear, specific, and actionable for you to proceed with web browsing and task execution?
        2. If YES (the request is clear): Respond with \`{"isClear": true, "questions": [], "refinedPrompt": "A single, refined prompt that you will use for execution..."}\`. The refined prompt should combine the topic and task into a clear, actionable instruction for yourself.
        3. If NO (the request is vague, ambiguous, or missing key information): Respond with \`{"isClear": false, "questions": [...]}\`. Formulate 1-3 concise, multiple-choice or text-input questions in PERSIAN to clarify the user's intent. Do not refine the prompt yet.
        
        The entire output must be a single, valid JSON object matching the specified schema.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            isClear: { type: Type.BOOLEAN },
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionText: { type: Type.STRING },
                        questionType: { type: Type.STRING, enum: ['multiple-choice', 'text-input'] },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["questionText", "questionType"]
                }
            },
            refinedPrompt: { type: Type.STRING }
        },
        required: ["isClear", "questions"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error analyzing agent request:", error);
        throw new Error("Failed to analyze agent request.");
    }
}

// FIX: Implement missing executeAgentTask function
export async function executeAgentTask(finalPrompt: string, instructions: string): Promise<AgentExecutionResult> {
    const ai = getAiClient();
    const prompt = `
        ${instructions}

        **Final, Approved Task:**
        ${finalPrompt}

        **Execution Plan:**
        1.  Use Google Search to browse the web and gather all necessary information to complete the task.
        2.  Synthesize the information you find.
        3.  Formulate a step-by-step breakdown of how you completed the task.
        4.  Provide a concise summary of the final result.
        5.  Your entire output MUST be a single JSON object string. Do NOT include markdown backticks (\`\`\`) around the JSON. The JSON should have the following structure:
            \`{ "summary": "...", "steps": [{ "title": "...", "description": "..." }], "sources": [] }\`
        6.  The 'sources' array will be populated automatically from grounding metadata, so you can leave it as an empty array \`[]\` in your JSON output.
        
        Begin execution and provide the final JSON output.
    `;

    try {
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

        const jsonString = response.text.trim();
        // Clean potential markdown wrappers
        const cleanedJsonString = jsonString.replace(/^```json\s*|```$/g, '');
        const parsedResult = JSON.parse(cleanedJsonString) as Omit<AgentExecutionResult, 'sources'>;

        return {
            ...parsedResult,
            sources: sources
        };
    } catch (error) {
        console.error("Error executing agent task:", error);
        throw new Error("Failed to execute agent task. The model may have returned an invalid JSON format.");
    }
}
