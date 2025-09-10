import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { 
    Filters, 
    NewsArticle, 
    TickerArticle, 
    FactCheckResult, 
    Source, 
    SourceCategory, 
    FindSourcesOptions, 
    WebResult, 
    GroundingSource, 
    PodcastResult, 
    StatisticsResult, 
    ScientificArticleResult,
    AgentClarificationRequest,
    AgentExecutionResult,
    PageConfig,
    VideoFactCheckResult,
    VideoTimestampResult,
    TranscriptionResult,
    CryptoCoin,
    SimpleCoin,
    CryptoSearchResult,
    CryptoAnalysisResult,
    GeneralTopicResult,
    WordPressThemePlan,
    AnalysisResult,
    FallacyResult,
    DebateConfig,
    TranscriptEntry,
    DebateRole,
    debateRoleLabels,
    AIModelProvider,
    RSSFeed,
} from "../types";

// This is a placeholder for a real API key which MUST be provided by an environment variable.
const API_KEY = process.env.API_KEY;

function getAiInstance(): GoogleGenAI | null {
    if (!API_KEY) {
        console.error("Gemini API key is not set in environment variables (process.env.API_KEY)");
        return null;
    }
    return new GoogleGenAI({ apiKey: API_KEY });
}

// --- General API Status Check ---
export type ApiKeyStatus = 'valid' | 'invalid_key' | 'network_error' | 'not_set';

export async function checkApiKeyStatus(): Promise<ApiKeyStatus> {
    if (!API_KEY) {
        return 'not_set';
    }
    const ai = getAiInstance();
    if (!ai) return 'not_set';
    try {
        // A minimal, low-cost call to check API key validity.
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'ping',
        });
        return 'valid';
    } catch (error: any) {
        const errorMessage = error.toString();
        // Check for various forms of API key errors
        if (
            errorMessage.includes('API key not valid') || 
            errorMessage.includes('API_KEY_INVALID') ||
            errorMessage.includes('permission to access')
        ) {
            return 'invalid_key';
        }
        console.error("Gemini connection test failed:", error);
        return 'network_error';
    }
}

export async function testGeminiConnection(): Promise<boolean> {
    const status = await checkApiKeyStatus();
    return status === 'valid';
}


// --- API Functions ---

export async function fetchTickerHeadlines(tickerSettings: any, instruction: string): Promise<TickerArticle[]> {
    const ai = getAiInstance();
    if (!ai) return [];
    
    const prompt = `
        User Request: Find 5 top breaking news headlines suitable for a news ticker.
        Focus on these categories: ${tickerSettings.categories.join(', ')}.
        Each headline must be very short and in Persian.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        link: { type: Type.STRING }
                    }
                }
            }
        }
    });

    return JSON.parse(response.text.trim());
}

// FIX: Widened the listType parameter to accept 'newsGroups' to support its use in LiveNewsSettings.
export async function generateDynamicFilters(query: string, listType: 'categories' | 'regions' | 'sources' | 'newsGroups', count: number): Promise<string[]> {
    const ai = getAiInstance();
    if (!ai) return [];

    const prompt = `Based on the search query "${query}", suggest ${count} relevant ${listType} for filtering news. The response must be a JSON array of strings in Persian.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });

    try {
        return JSON.parse(response.text.trim());
    } catch (e) {
        console.error("Failed to parse dynamic filters:", e);
        return [];
    }
}

export async function factCheckNews(text: string, file: { data: string; mimeType: string } | null, url?: string, instruction?: string): Promise<FactCheckResult> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");

     const promptText = `
        Your task is to act as an expert fact-checker. Your entire output MUST be in Persian and conform to the JSON schema.
        1.  **Overall Credibility:** Provide a credibility assessment in Persian (e.g., 'بسیار معتبر', 'معتبر', 'نیازمند بررسی').
        2.  **Detailed Summary:** Write a comprehensive summary in Persian explaining your findings, analysis, and final conclusion.
        3.  **Find Sources:** Find and list MULTIPLE (at least 3 if possible) credible sources that either support or debunk the claim.
        4.  **Source Details:** For EACH source, you MUST provide:
            *   its name.
            *   a direct, specific, and working link to the article/page (NOT a homepage).
            *   its publication date.
            *   its credibility level.
            *   a brief summary in Persian of what that specific source says about the claim.
        
        Content to Analyze:
        - Text: "${text}"
        - URL: ${url || 'Not provided'}
    `;

    const textPart = { text: promptText };
    const contentParts: any[] = [textPart];
    
    if (file) {
        contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
    }
    
    const config: any = {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                overallCredibility: { type: Type.STRING },
                summary: { type: Type.STRING },
                sources: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            link: { type: Type.STRING },
                            publicationDate: { type: Type.STRING },
                            credibility: { type: Type.STRING },
                            summary: { type: Type.STRING }
                        },
                         required: ["name", "link", "summary", "credibility"]
                    }
                }
            }
        }
    };

    if (instruction) {
        config.systemInstruction = instruction;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contentParts },
        config: config
    });

    return JSON.parse(response.text.trim());
}

export async function generateAIInstruction(taskLabel: string): Promise<string> {
    const ai = getAiInstance();
    if (!ai) return "";

    const prompt = `Create a detailed, expert-level system instruction prompt in PERSIAN for an AI model performing the task of "${taskLabel}". The instruction should define the persona, goals, constraints, and desired output format.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text;
}

export async function testAIInstruction(instruction: string): Promise<boolean> {
    const ai = getAiInstance();
    if (!ai) return false;
    try {
        // A simple test call to ensure the instruction is syntactically valid for the API.
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "test prompt",
            config: {
                systemInstruction: instruction,
            }
        });
        return true;
    } catch (e) {
        console.error("Instruction test failed:", e);
        return false;
    }
}

export async function fetchLiveNews(category: string, allSources: any, instruction: string, showImages: boolean, specifics: any): Promise<NewsArticle[]> {
     const ai = getAiInstance();
    if (!ai) return [];

    const prompt = `
        User Request: Fetch 10 recent and important live news articles.
        Primary Category: ${category}
        Additional Filters:
        - News Groups: ${specifics.newsGroups.join(', ')}
        - Regions: ${specifics.regions.join(', ')}
        - Important: Include an image URL for each article if 'showImages' is true.
        - showImages: ${showImages}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        link: { type: Type.STRING },
                        source: { type: Type.STRING },
                        publicationTime: { type: Type.STRING },
                        credibility: { type: Type.STRING },
                        category: { type: Type.STRING },
                        imageUrl: { type: Type.STRING },
                    },
                },
            },
        },
    });

    return JSON.parse(response.text.trim());
}

// FIX: Added missing function `fetchNewsFromFeeds` to fix import error in LiveNews.tsx.
export async function fetchNewsFromFeeds(feeds: RSSFeed[], instruction: string, query?: string): Promise<NewsArticle[]> {
    const ai = getAiInstance();
    if (!ai) return [];

    const feedUrls = feeds.map(f => f.url).join(', ');
    
    let prompt = `
        User Request: Fetch the top 15 most important and recent news articles from the last 24 hours from these RSS feeds: [${feedUrls}].
        Merge the results, remove duplicates, and return them as a JSON array of NewsArticle objects.
        The entire output must be in Persian.
    `;

    if (query) {
        prompt += `\nAdditionally, filter the results to only include articles related to this query: "${query}"`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        link: { type: Type.STRING },
                        source: { type: Type.STRING },
                        publicationTime: { type: Type.STRING },
                        credibility: { type: Type.STRING },
                        category: { type: Type.STRING },
                        imageUrl: { type: Type.STRING },
                    },
                    required: ["title", "link", "summary", "source"]
                },
            },
        },
    });

    try {
        return JSON.parse(response.text.trim());
    } catch (e) {
        console.error("Failed to parse news from feeds:", e);
        return [];
    }
}

export async function checkForUpdates(sources: any): Promise<boolean> {
    console.log("Checking for updates (mock)...");
    await new Promise(res => setTimeout(res, 2000));
    // In a real app, this would query sources or a backend.
    return Math.random() > 0.7; // 30% chance of finding an update
}

export async function findSourcesWithAI(category: SourceCategory, existingSources: Source[], options: FindSourcesOptions): Promise<Partial<Source>[]> {
    const ai = getAiInstance();
    if (!ai) return [];
    
    const existingUrls = existingSources.map(s => s.url).join(', ');
    const prompt = `
        Find ${options.count} new news sources for the category "${category}".
        Constraints:
        - Region: ${options.region}
        - Language: ${options.language}
        - Credibility: ${options.credibility}
        - DO NOT include any of these existing URLs: ${existingUrls}
        Provide the response in Persian.
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
                        region: { type: Type.STRING },
                    }
                }
            }
        }
    });

    return JSON.parse(response.text.trim());
}

// FIX: Added missing function `findFeedsWithAI` to fix import error in RSSFeedManager.tsx.
export async function findFeedsWithAI(category: SourceCategory, existingFeeds: RSSFeed[]): Promise<Partial<RSSFeed>[]> {
    const ai = getAiInstance();
    if (!ai) return [];

    const existingUrls = existingFeeds.map(f => f.url).join(', ');
    const prompt = `
        Find 5 new RSS feed URLs for news sources in the category "${category}".
        For each, provide its name and the full URL.
        - DO NOT include any of these existing URLs: ${existingUrls}
        - The response must be in Persian and conform to the JSON schema.
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
                        url: { type: Type.STRING },
                    },
                    required: ["name", "url"]
                }
            }
        }
    });

    try {
        return JSON.parse(response.text.trim());
    } catch (e) {
        console.error("Failed to parse found RSS feeds:", e);
        return [];
    }
}


export async function fetchNews(filters: Filters, instruction: string, maxResults: number, showImages: boolean): Promise<{ articles: NewsArticle[], suggestions: string[] }> {
    const ai = getAiInstance();
    if (!ai) return { articles: [], suggestions: [] };

    const prompt = `
        User Request: Find ${maxResults} top news articles based on the following filters. Also provide 3 related search suggestions.
        - Query: ${filters.query}
        - Categories: ${filters.categories.join(', ')}
        - Regions: ${filters.regions.join(', ')}
        - Sources: ${filters.sources.join(', ')}
        - Important: Provide an image URL for each article if 'showImages' is true.
        - showImages: ${showImages}
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
                    articles: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                link: { type: Type.STRING },
                                source: { type: Type.STRING },
                                publicationTime: { type: Type.STRING },
                                credibility: { type: Type.STRING },
                                category: { type: Type.STRING },
                                imageUrl: { type: Type.STRING },
                            },
                        },
                    },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                }
            }
        }
    });

    return JSON.parse(response.text.trim());
}

export async function fetchPodcasts(query: string, instruction: string): Promise<PodcastResult[]> {
    const ai = getAiInstance();
    if (!ai) return [];
    
    const prompt = `User Query: "${query}"`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        publisher: { type: Type.STRING },
                        topic: { type: Type.STRING },
                        publicationYear: { type: Type.STRING },
                        link: { type: Type.STRING },
                        audioUrl: { type: Type.STRING },
                        proponents: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { name: { type: Type.STRING }, argument: { type: Type.STRING } }
                            }
                        },
                        opponents: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { name: { type: Type.STRING }, argument: { type: Type.STRING } }
                            }
                        },
                         hostingSites: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { name: { type: Type.STRING }, url: { type: Type.STRING } }
                            }
                        },
                    }
                }
            }
        }
    });

    return JSON.parse(response.text.trim());
}

export async function fetchStatistics(query: string, instruction: string): Promise<StatisticsResult> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");
    const prompt = `User Query: "${query}"`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    chart: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'table'] },
                            title: { type: Type.STRING },
                            labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                            datasets: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        label: { type: Type.STRING },
                                        data: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                                    }
                                }
                            }
                        }
                    },
                    sourceDetails: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            link: { type: Type.STRING },
                            publicationDate: { type: Type.STRING },
                            author: { type: Type.STRING },
                            credibility: { type: Type.STRING },
                        }
                    },
                    analysis: {
                        type: Type.OBJECT,
                        properties: {
                            acceptancePercentage: { type: Type.NUMBER },
                            currentValidity: { type: Type.STRING },
                            alternativeResults: { type: Type.STRING }
                        }
                    },
                    relatedSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
}

export async function fetchScientificArticle(query: string, instruction: string): Promise<ScientificArticleResult> {
    // This can re-use the Statistics schema, just without the chart.
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");
    const prompt = `User Query: "${query}"`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    sourceDetails: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            link: { type: Type.STRING },
                            publicationDate: { type: Type.STRING },
                            author: { type: Type.STRING },
                            credibility: { type: Type.STRING },
                        }
                    },
                    analysis: {
                        type: Type.OBJECT,
                        properties: {
                            acceptancePercentage: { type: Type.NUMBER },
                            currentValidity: { type: Type.STRING },
                            alternativeResults: { type: Type.STRING }
                        }
                    },
                    relatedSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
}

export const fetchReligiousText = fetchScientificArticle; // They share the same structure

export async function generateContextualFilters(listType: 'fields' | 'regions' | 'sources', context: { topic: string, fields: string[], regions: string[] }): Promise<string[]> {
    const ai = getAiInstance();
    if (!ai) return [];
    
    const prompt = `Based on the religious topic "${context.topic}", and the currently selected filters (Fields: ${context.fields.join(', ') || 'none'}, Regions: ${context.regions.join(', ') || 'none'}), suggest up to 5 relevant ${listType}. Response must be a JSON array of strings in Persian.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
    });
    return JSON.parse(response.text.trim());
}

export async function fetchWebResults(searchType: string, filters: Filters, instruction: string): Promise<{ results: WebResult[], sources: GroundingSource[], suggestions: string[] }> {
    const ai = getAiInstance();
    if (!ai) return { results: [], sources: [], suggestions: [] };
    
    const prompt = `User Query: "${filters.query}"\nFilters: ${JSON.stringify(filters)}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            tools: [{ googleSearch: {} }],
        }
    });
    
    // Manual parsing since schema is not allowed with Google Search
    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Use another AI call to structure the text result
    const structuringResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Structure the following text into a JSON object with 'results' (an array of objects with title, link, description, source, imageUrl) and 'suggestions' (an array of strings). The text is: ${text}`,
        config: { responseMimeType: "application/json" }
    });
    
    const structuredResult = JSON.parse(structuringResponse.text.trim());
    return {
        results: structuredResult.results || [],
        sources: sources.map((s:any) => s.web).filter(Boolean),
        suggestions: structuredResult.suggestions || []
    };
}

export async function analyzeVideoFromUrl(url: string, type: string, keywords: string, instruction: string): Promise<VideoFactCheckResult | VideoTimestampResult | TranscriptionResult | any> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");

    const prompt = `Video URL: ${url}\nAnalysis Type: ${type}\nKeywords: ${keywords || 'N/A'}`;
    let schema: any = {};

    if (type === 'fact-check') {
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
                                        sourceLink: { type: Type.STRING } 
                                    } 
                                } 
                            } 
                        } 
                    } 
                } 
            } 
        };
    } else if (type === 'timestamp') {
        schema = { 
            type: Type.OBJECT, 
            properties: { 
                found: { type: Type.BOOLEAN }, 
                timestamps: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            timestamp: { type: Type.STRING }, 
                            sentence: { type: Type.STRING } 
                        } 
                    } 
                } 
            } 
        };
    } else if (type === 'transcription') {
        schema = { 
            type: Type.OBJECT, 
            properties: { 
                transcription: { type: Type.STRING } 
            } 
        };
    } else { // summary, analysis (default)
        schema = { 
            type: Type.OBJECT, 
            properties: { 
                summary: { type: Type.STRING }, 
                comprehensiveReport: { type: Type.STRING } 
            } 
        };
    }
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: instruction, responseMimeType: "application/json", responseSchema: schema }
    });

    return JSON.parse(response.text.trim());
}

export const generateEditableListItems = generateDynamicFilters;

export async function analyzeAgentRequest(topic: string, request: string, instruction: string): Promise<AgentClarificationRequest> {
    // This is a mock implementation. A real one would have more complex logic.
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");

    const prompt = `Analyze this user request for ambiguity.\nTopic: "${topic}"\nRequest: "${request}"\nIf it's clear, set isClear to true and refine the prompt. If not, set isClear to false and ask clarifying questions.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isClear: { type: Type.BOOLEAN },
                    refinedPrompt: { type: Type.STRING },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                questionText: { type: Type.STRING },
                                questionType: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            }
                        }
                    }
                }
            }
        }
    });

    return JSON.parse(response.text.trim());
}

export async function executeAgentTask(prompt: string, instruction: string): Promise<AgentExecutionResult> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Execute the following refined prompt using a web search: ${prompt}`,
        config: {
            systemInstruction: instruction,
            tools: [{ googleSearch: {} }],
        }
    });
    
    const structuringResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on this text, create a JSON object with 'summary' and 'steps' (array of {title, description}). Text: ${response.text}`,
        config: { responseMimeType: "application/json" }
    });

    const structuredResult = JSON.parse(structuringResponse.text.trim());
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((s:any) => s.web).filter(Boolean) || [];

    return { ...structuredResult, sources };
}


export async function generateKeywordsForTopic(mainTopic: string, comparisonTopic?: string): Promise<string[]> {
    const ai = getAiInstance();
    if (!ai) return [];
    const prompt = `Generate 5 relevant search keywords for the topic: "${mainTopic}" ${comparisonTopic ? `and its comparison with "${comparisonTopic}"` : ''}. Return a JSON array of strings in Persian.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text.trim());
}

export async function fetchGeneralTopicAnalysis(mainTopic: string, comparisonTopic: string | undefined, keywords: string[], domains: string[], instruction: string): Promise<GeneralTopicResult> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");

    const prompt = `
        User Request:
        - Main Topic: ${mainTopic}
        - Comparison Topic: ${comparisonTopic || 'None'}
        - Keywords: ${keywords.join(', ')}
        - Domains: ${domains.join(', ')}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: instruction, tools: [{ googleSearch: {} }] }
    });

     // Manual parsing since schema is not allowed with Google Search
    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Use another AI call to structure the text result
    const structuringResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Structure the following text into a JSON object for a GeneralTopicResult. The text is: ${text}`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    keyPoints: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING }
                            }
                        }
                    },
                    comparison: {
                        type: Type.OBJECT,
                        properties: {
                            topicA: { type: Type.STRING },
                            topicB: { type: Type.STRING },
                            points: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        aspect: { type: Type.STRING },
                                        analysisA: { type: Type.STRING },
                                        analysisB: { type: Type.STRING },
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    
    const structuredResult = JSON.parse(structuringResponse.text.trim());

    return { ...structuredResult, sources: sources.map((s:any) => s.web).filter(Boolean) };
}

// Online Tools Services
export const generateSeoKeywords = generateKeywordsForTopic;
export const suggestWebsiteNames = generateKeywordsForTopic;
export const suggestDomainNames = generateKeywordsForTopic;

// FIX: Modified function to return an object with articleText and groundingSources, as expected by ContentCreator.tsx. Added the googleSearch tool to fetch sources.
export async function generateArticle(topic: string, wordCount: number, instruction: string): Promise<{ articleText: string, groundingSources: GroundingSource[] }> {
    const ai = getAiInstance();
    if (!ai) return { articleText: "", groundingSources: [] };
    const prompt = `User Request: Write a ${wordCount}-word article about "${topic}".`;
    const response = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash', 
        contents: prompt, 
        config: { 
            systemInstruction: instruction,
            tools: [{ googleSearch: {} }] 
        } 
    });
    
    const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((s:any) => s.web).filter(Boolean) || [];
    
    return {
        articleText: response.text,
        groundingSources: groundingSources
    };
}

// FIX: Replaced mock function with a real implementation using the 'imagen-4.0-generate-001' model.
export async function generateImagesForArticle(prompt: string, count: number, aspectRatio: string): Promise<string[]> {
    const ai = getAiInstance();
    if (!ai) return [];

    // Ensure aspectRatio is one of the supported values, default to 1:1 if not.
    const supportedAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const validAspectRatio = supportedAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: count,
                outputMimeType: 'image/png',
                aspectRatio: validAspectRatio,
            },
        });

        return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
    } catch (error) {
        console.error("Error generating images:", error);
        // Return placeholder images on error to avoid breaking the UI
        const images = [];
        for (let i = 0; i < count; i++) {
            images.push(`https://via.placeholder.com/300x200.png?text=Image+Generation+Error`);
        }
        return images;
    }
}

export async function generateAboutMePage(description: string, siteUrl: string, platform: string, images: {data: string, mimeType: string}[], config: PageConfig, instruction: string): Promise<string> {
    const ai = getAiInstance();
    if (!ai) return "";

    const prompt = `
        User Details:
        - Description: ${description}
        - Site URL: ${siteUrl}
        - Target Platform: ${platform}
        - Page Config: ${JSON.stringify(config)}
        - Number of images provided: ${images.length}
        Please generate the full HTML code for the page.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction: instruction } });
    return response.text.replace(/```html|```/g, '').trim();
}

export async function formatTextContent(text: string | null, url: string | null, instruction: string): Promise<string> {
    const ai = getAiInstance();
    if (!ai) return "";
    const content = text ? `Text content: "${text}"` : `URL to fetch content from: ${url}`;
    const prompt = `User Request: Format the following content into clean, well-structured HTML with headings, paragraphs, and lists. ${content}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction: instruction } });
    return response.text.replace(/```html|```/g, '').trim();
}

// Crypto Services
export async function fetchCryptoData(mode: string, timeframe: string, count: number, instruction: string, ids: string[] = []): Promise<CryptoCoin[]> {
    const ai = getAiInstance();
    if (!ai) return [];
    const idList = ids.length > 0 ? ` for these specific coin IDs: ${ids.join(', ')}` : '';
    const prompt = `User Request: Get crypto data. Mode: ${mode}, Timeframe: ${timeframe}, Count: ${count}${idList}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: instruction, responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, symbol: { type: Type.STRING }, name: { type: Type.STRING }, price_usd: { type: Type.NUMBER }, price_toman: { type: Type.NUMBER }, price_change_percentage_24h: { type: Type.NUMBER }, image: { type: Type.STRING } } } } }
    });
    return JSON.parse(response.text.trim());
}

export async function fetchCoinList(instruction: string): Promise<SimpleCoin[]> {
    const ai = getAiInstance();
    if (!ai) return [];
    const prompt = `User Request: Provide a list of top 100 cryptocurrencies with their id, symbol, and name.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: instruction, responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, symbol: { type: Type.STRING }, name: { type: Type.STRING } } } } }
    });
    return JSON.parse(response.text.trim());
}

export async function searchCryptoCoin(query: string, instruction: string): Promise<CryptoSearchResult> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");
    const prompt = `User Request: Search for crypto coin "${query}".`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: instruction, responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { coin: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, symbol: { type: Type.STRING }, name: { type: Type.STRING }, price_usd: { type: Type.NUMBER }, price_toman: { type: Type.NUMBER }, price_change_percentage_24h: { type: Type.NUMBER }, image: { type: Type.STRING } } }, summary: { type: Type.STRING }, sources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, link: { type: Type.STRING }, credibility: { type: Type.STRING } } } } } } }
    });
    return JSON.parse(response.text.trim());
}

export async function fetchCryptoAnalysis(query: string, instruction: string): Promise<CryptoAnalysisResult> {
     const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");
    const prompt = `User Request: Analyze crypto coin "${query}".`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    coinName: { type: Type.STRING },
                    symbol: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    technicalAnalysis: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, keyLevels: { type: Type.OBJECT, properties: { support: { type: Type.ARRAY, items: { type: Type.STRING } }, resistance: { type: Type.ARRAY, items: { type: Type.STRING } } } } } },
                    fundamentalAnalysis: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, keyMetrics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING } } } } } },
                    sentimentAnalysis: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, score: { type: Type.NUMBER } } },
                    futureOutlook: { type: Type.STRING }
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
}

export async function generateWordPressThemePlan(themeType: string, inspirationUrl: string, description: string, imageDesc: string, instruction: string): Promise<WordPressThemePlan> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");
    const prompt = `User Request:\n- Theme Type: ${themeType}\n- Inspiration URL: ${inspirationUrl}\n- Description: ${description}\n- Image Description: ${imageDesc}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: instruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    understanding: { type: Type.STRING },
                    themeName: { type: Type.STRING },
                    features: { type: Type.ARRAY, items: { type: Type.STRING } },
                    colorPalette: { type: Type.OBJECT, properties: { primary: { type: Type.STRING }, secondary: { type: Type.STRING }, accent: { type: Type.STRING }, background: { type: Type.STRING }, text: { type: Type.STRING } } },
                    typography: { type: Type.OBJECT, properties: { headings: { type: Type.OBJECT, properties: { fontFamily: { type: Type.STRING }, fontWeight: { type: Type.NUMBER } } }, body: { type: Type.OBJECT, properties: { fontFamily: { type: Type.STRING }, fontSize: { type: Type.STRING } } } } }
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
}

export async function generateWordPressThemeCode(plan: WordPressThemePlan, fileType: string): Promise<string> {
    const ai = getAiInstance();
    if (!ai) return "";
    const prompt = `Based on this WordPress theme plan:\n${JSON.stringify(plan)}\nGenerate the complete code for the \`${fileType}\` file. The code should be well-commented and follow WordPress development best practices. Return only the raw code.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.replace(/```(php|css|js)?|```/g, '').trim();
}

// FIX: Added missing function `analyzeContentDeeply` to fix import error in DeepAnalysis.tsx
export async function analyzeContentDeeply(topic: string, file: { data: string; mimeType:string } | null, instruction: string): Promise<AnalysisResult> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");

    const contentParts: any[] = [{ text: `User Content:\nTopic/Text: "${topic}"` }];
    if (file) {
        contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contentParts },
        config: {
            systemInstruction: instruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    understanding: { type: Type.STRING },
                    analysis: { type: Type.STRING },
                    proponentPercentage: { type: Type.NUMBER },
                    proponents: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { name: { type: Type.STRING }, argument: { type: Type.STRING }, scientificLevel: { type: Type.NUMBER } }
                        }
                    },
                    opponents: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { name: { type: Type.STRING }, argument: { type: Type.STRING }, scientificLevel: { type: Type.NUMBER } }
                        }
                    },
                    examples: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }
                        }
                    },
                    sources: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { title: { type: Type.STRING }, url: { type: Type.STRING } }
                        }
                    },
                    techniques: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { title: { type: Type.STRING }, url: { type: Type.STRING } }
                        }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
}

// FIX: Added missing function `findFallacies` to fix import error in DeepAnalysis.tsx
export async function findFallacies(topic: string, file: { data: string; mimeType: string } | null, instruction: string): Promise<FallacyResult> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");

    const contentParts: any[] = [{ text: `User Content to analyze for fallacies:\nText: "${topic}"` }];
    if (file) {
        contentParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contentParts },
        config: {
            systemInstruction: instruction,
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
                                correctedStatement: { type: Type.STRING },
                            }
                        }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
}

export async function getDebateTurnResponse(
    history: TranscriptEntry[],
    currentSpeakerRole: DebateRole,
    turnCount: number,
    config: DebateConfig,
    isFinalTurn: boolean,
    instruction: string,
    modelProvider: AIModelProvider
): Promise<GenerateContentResponse> {
    const ai = getAiInstance();
    if (!ai) throw new Error("AI not initialized");
    
    const participantMap = config.participants.map(p => `${debateRoleLabels[p.role]}: ${p.name}`).join('\n');
    const historyText = history.map(t => `${t.participant.name} (${debateRoleLabels[t.participant.role]}):\n${t.text}`).join('\n\n---\n\n');
    
    let actionPrompt = '';
    const currentParticipant = config.participants.find(p => p.role === currentSpeakerRole)!;

    if (history.length === 0) {
        actionPrompt = `شما به عنوان "${currentParticipant.name}" (${debateRoleLabels[currentSpeakerRole]}), مناظره را با معرفی موضوع و طرح اولین سوال یا نکته آغاز کنید.`;
    } else if (isFinalTurn && currentSpeakerRole === 'moderator') {
        actionPrompt = `شما به عنوان مدیر جلسه، مناظره را با یک خلاصه نهایی از دیدگاه‌های مطرح شده به پایان برسانید.`;
    } else {
         actionPrompt = `حالا نوبت شماست. به عنوان "${currentParticipant.name}" (${debateRoleLabels[currentSpeakerRole]}), به آخرین گفته‌ها واکنش نشان دهید و استدلال خود را مطرح کنید.`;
    }
    
    const fullPrompt = `
        تاریخچه مناظره تا اینجا:
        ${historyText}

        ${actionPrompt}
    `;

    // The model provider logic would be implemented here. For now, we default to Gemini.
    console.log(`Generating response using model provider: ${modelProvider}`);

    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: { systemInstruction: instruction }
    });
}
