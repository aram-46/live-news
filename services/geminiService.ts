

import { GoogleGenAI, Type } from "@google/genai";
import type { NewsArticle, Filters, FactCheckResult, Credibility, TickerArticle, AIInstructions, Source, SourceCategory, Sources, TickerSettings } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const newsArticleSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "عنوان خبر به زبان فارسی روان و دقیق" },
    summary: { type: Type.STRING, description: "خلاصه کوتاه و جامع خبر به زبان فارسی" },
    source: { type: Type.STRING, description: "منبع اصلی خبر (مثال: خبرگزاری فارس)" },
    publicationTime: { type: Type.STRING, description: "زمان انتشار (مثال: ۲۵ مرداد ۱۴۰۴ - ۱۰:۳۰)" },
    credibility: { type: Type.STRING, description: "درجه اعتبار منبع (مثال: بسیار معتبر، معتبر، نیازمend بررسی)" },
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
            As an expert fact-checker, analyze the following content. If there is media (image, video, audio) provided, analyze it as the primary subject. If there is also text, use it as context for the media analysis. If there is only text, analyze the text. All your output must be in Persian.
            - Determine the content's credibility.
            - Provide a brief justification for your assessment.
            - Find up to 3 external reputable sources that either confirm or debunk the claims.
            - The provided text context is: "${text}"
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
                        credibility: { type: Type.STRING, enum: ['بسیار معتبر', 'معتبر', 'نیازمند بررسی'] },
                        justification: { type: Type.STRING, description: "Justification for the credibility rating in Persian." },
                        sources: {
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
                    required: ["credibility", "justification", "sources"]
                }
            }
        });
        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString);
        return {
            ...parsedResult,
            credibility: parsedResult.credibility as Credibility,
        };
    } catch (error) {
        console.error("Error fact-checking content from Gemini:", error);
        throw new Error("Failed to fact-check content.");
    }
}

export async function findSourcesWithAI(category: SourceCategory, existingSources: Source[]): Promise<Omit<Source, 'id'>[]> {
    try {
        const prompt = `
            Find 3 new, reputable sources for the category "${category}". Do not include any of the following existing sources: ${existingSources.map(s => s.name).join(', ')}.
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

export async function fetchLiveNews(tab: string, sources: Sources, instructions: string, showImages: boolean): Promise<NewsArticle[]> {
    try {
        const sourceNames = Object.values(sources).flat().map(s => s.name).join(', ');
        const prompt = `
            ${instructions}
            IMPORTANT: All output text (titles, summaries, etc.) MUST be in Persian. If a source is in another language, translate its content to natural-sounding Persian.
            Find the 8 latest and most important news articles related to "${tab}". 
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
        const prompt = `You are a helpful assistant specialized in creating AI system prompts. The user wants a system instruction for an AI that performs the following task: "${taskDescription}". Generate a concise, clear, and effective system instruction in English that guides the AI to perform this task optimally. The output should be ONLY the generated instruction text, without any preamble or explanation.`;
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

export async function testGeminiConnection(): Promise<boolean> {
    try {
        if (!process.env.API_KEY) {
            console.error("Gemini API key not found in environment variables.");
            return false;
        }
        // The 'ai' instance is already initialized.
        // Make a very cheap/fast API call to verify the key and connection.
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "test",
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        // Check if there is a text response. This confirms the API call was successful.
        return typeof response.text === 'string';
    } catch (error) {
        console.error("Gemini connection test failed:", error);
        return false;
    }
}