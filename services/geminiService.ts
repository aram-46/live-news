


import { GoogleGenAI, Type } from "@google/genai";
import type { NewsArticle, Filters, FactCheckResult, Credibility, TickerArticle, AIInstructions, Source, SourceCategory, Sources, TickerSettings, LiveNewsSpecificSettings } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    try {
        const textPrompt = `
            ${instructions}
            As a world-class investigative journalist and expert fact-checker, conduct a deep analysis of the following content. If media is provided, analyze it as the primary subject with the text as context. If only text is provided, analyze the text. Your entire output MUST be in Persian and structured according to the JSON schema.

            **Analysis Steps:**
            1.  **Overall Credibility:** Determine the overall credibility of the claim ('بسیار معتبر', 'معتبر', 'نیازمند بررسی').
            2.  **Summary:** Provide a concise summary of your findings.
            3.  **Original Source:** Identify the earliest verifiable source that published this claim. Provide:
                - The source's name.
                - The source's credibility level.
                - The exact publication date and time (e.g., '۱۴۰۳/۰۵/۲۶ - ۱۸:۴۵').
                - The author or publisher's name.
                - The type of evidence they used (e.g., 'عکس', 'فیلم', 'سند تاریخی', 'صدا', 'آثار باستانی', 'کتاب', 'مجله', 'روزنامه', 'تاریخ شفاهی', 'بدون مدرک').
                - An assessment of the evidence's credibility.
                - An assessment of the author's credibility on this topic.
                - A direct link to the original publication.
            4.  **Public Reception:** Estimate the claim's acceptance rate as a percentage number (e.g., 75).
            5.  **Arguments:**
                - Identify up to 2 key proponents (supporters) and their main arguments.
                - Identify up to 2 key opponents (dissenters) and their main arguments/refutations.
            6.  **Further Reading:**
                - Provide up to 3 related suggestions as simple strings for further reading to help the user understand the context better.
                - Find up to 3 external reputable sources that discuss the claim, providing a title and URL for each.

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
        // A check for process.env.API_KEY is not needed here because esbuild replaces it.
        // If it's undefined, the GoogleGenAI constructor will receive an undefined key and the API call will fail gracefully.
        const response = await ai.models.generateContent({
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