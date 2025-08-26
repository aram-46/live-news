

import { GoogleGenAI, Type } from "@google/genai";
import type { AppSettings, NewsArticle, Filters, FactCheckResult, Credibility, TickerArticle, TickerSettings, LiveNewsSpecificSettings, Source, SourceCategory, Sources, StatisticsResult, ScientificArticleResult } from '../types';

// Helper function to get the API key from localStorage and initialize the client.
// It prioritizes a non-empty key from settings, falling back to the environment variable.
function getAiClient(): GoogleGenAI {
    try {
        const settingsString = localStorage.getItem('app-settings');
        if (settingsString) {
            const settings = JSON.parse(settingsString) as AppSettings;
            const apiKey = settings.aiModelSettings?.gemini?.apiKey;
            // Only use the key from local storage if it's a valid, non-empty string.
            if (apiKey && apiKey.trim()) {
                return new GoogleGenAI({ apiKey });
            }
        }
    } catch (e) {
        console.error("Could not parse settings from localStorage", e);
    }
    
    // Fallback if local storage key is missing, empty, or invalid.
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

export async function fetchNews(filters: Filters, instructions: string, articlesPerColumn: number, showImages: boolean): Promise<NewsArticle[]> {
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
      Provide a diverse set of results.
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


export async function factCheckNews(text: string, file: { data: string; mimeType: string } | null, instructions: string): Promise<FactCheckResult> {
    const ai = getAiClient();
    try {
        const textPrompt = `
            ${instructions}
            As a world-class investigative journalist specializing in digital misinformation and social media rumor tracing, conduct a deep analysis of the following content. Your entire output MUST be in Persian and structured according to the JSON schema.

            **Your Mission:**
            1.  **Trace the Origin:** Your top priority is to find the EARLIEST verifiable instance of this claim/media online. Dig through social media, forums, and news archives.
            2.  **Analyze the Source:** Evaluate the credibility of the original source. Do they have a history of spreading misinformation? Are they a reliable source on this topic?
            3.  **Verify the Content:** Fact-check the claim itself using at least two independent, high-credibility sources.
            4.  **Summarize Findings:** Provide a clear, concise verdict and summary.

            **JSON Output Structure:**
            1.  **Overall Credibility:** Determine the final credibility ('بسیار معتبر', 'معتبر', 'نیازمند بررسی').
            2.  **Summary:** A concise summary of your findings, including the verdict on the claim's authenticity.
            3.  **Original Source:**
                -   'name': The name of the website, social media account, or person that first published it.
                -   'link': A direct link to the very first publication you could find.
                -   'publicationDate': The exact date and time of the original post.
                -   'author': The author/account name.
                -   'authorCredibility': An assessment of the original author/source's general reliability and history.
                -   'evidenceType': The type of evidence used (e.g., 'عکس', 'فیلم', 'ادعای متنی').
                -   'evidenceCredibility': An assessment of the evidence's credibility.
                -   'credibility': An assessment of the source's credibility *for this specific topic*.
            4.  **Public Reception:** Estimate the claim's acceptance rate (0-100).
            5.  **Arguments:** Identify key proponents and opponents and their main arguments.
            6.  **Further Reading:** Provide related suggestions and links to reputable sources discussing the claim.

            **Content for Analysis:**
            - Text Context: "${text}"
        `;

        const contentParts: any[] = [{ text: textPrompt }];

        if (file) {
            contentParts.push({
                inlineData: {
                    data: file.data,
                    mimeType: file.mimeType,
                }
            });
        }
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contentParts },
            config: {
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
            }
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

export async function testGeminiConnection(apiKey?: string): Promise<boolean> {
    try {
        let keyToTest = apiKey;

        // If no key is passed, try to get it from localStorage as a fallback.
        if (!keyToTest) {
             try {
                const settingsString = localStorage.getItem('app-settings');
                if (settingsString) {
                    const settings = JSON.parse(settingsString) as AppSettings;
                    keyToTest = settings.aiModelSettings?.gemini?.apiKey;
                }
            } catch (e) {
                console.error("Could not parse settings from localStorage for test", e);
            }
        }
        
        // Final fallback to the environment variable.
        const finalApiKey = keyToTest || process.env.API_KEY;

        if (!finalApiKey) {
            console.error("Gemini connection test failed: No API Key provided.");
            return false;
        }

        const client = new GoogleGenAI({ apiKey: finalApiKey });
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