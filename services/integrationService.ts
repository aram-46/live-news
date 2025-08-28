import { AppSettings, IntegrationSettings, NewsArticle, AppwriteSettings } from '../types';
import { INITIAL_SETTINGS } from '../data/defaults';
import { Client, Databases, ID, Query } from 'appwrite';

const SETTINGS_DOCUMENT_ID = "main-settings";

interface TelegramSettings {
    botToken: string;
    chatId: string;
}

interface DiscordSettings {
    webhookUrl: string;
}

// --- Appwrite Helper ---
function getAppwriteClient(settings: AppwriteSettings): { client: Client, databases: Databases } | null {
    if (settings.endpoint && settings.projectId) {
        const client = new Client();
        client
            .setEndpoint(settings.endpoint)
            .setProject(settings.projectId);
        const databases = new Databases(client);
        return { client, databases };
    }
    return null;
}

// --- Appwrite Settings Functions ---
async function getSettingsFromAppwrite(settings: AppwriteSettings): Promise<AppSettings | null> {
    const appwrite = getAppwriteClient(settings);
    if (!appwrite || !settings.databaseId || !settings.settingsCollectionId) {
        return null;
    }

    try {
        const document = await appwrite.databases.getDocument(
            settings.databaseId,
            settings.settingsCollectionId,
            SETTINGS_DOCUMENT_ID
        );
        // Assuming the settings are stored in a field named 'content' as a stringified JSON
        if (document && typeof document.content === 'string') {
            return JSON.parse(document.content);
        }
    } catch (error: any) {
        // Appwrite throws an error with code 404 if the document is not found.
        // This is expected on the first run.
        if (error.code !== 404) {
             console.error("Failed to fetch settings from Appwrite:", error);
        }
    }
    return null;
}

async function saveSettingsToAppwrite(appSettings: AppSettings): Promise<boolean> {
    const { appwrite: appwriteSettings } = appSettings.integrations;
    const appwrite = getAppwriteClient(appwriteSettings);
     if (!appwrite || !appwriteSettings.databaseId || !appwriteSettings.settingsCollectionId) {
        return false;
    }
    
    const settingsString = JSON.stringify(appSettings);
    
    try {
        // First, try to get the document to see if it exists
        await appwrite.databases.getDocument(
            appwriteSettings.databaseId,
            appwriteSettings.settingsCollectionId,
            SETTINGS_DOCUMENT_ID
        );
        // If it exists, update it
        await appwrite.databases.updateDocument(
            appwriteSettings.databaseId,
            appwriteSettings.settingsCollectionId,
            SETTINGS_DOCUMENT_ID,
            { content: settingsString }
        );
        console.log("Settings updated in Appwrite successfully.");
        return true;

    } catch (error: any) {
        if (error.code === 404) {
            // If it doesn't exist, create it
            try {
                await appwrite.databases.createDocument(
                    appwriteSettings.databaseId,
                    appwriteSettings.settingsCollectionId,
                    SETTINGS_DOCUMENT_ID,
                    { content: settingsString }
                );
                 console.log("Settings created in Appwrite successfully.");
                return true;
            } catch (createError) {
                 console.error("Failed to create settings document in Appwrite:", createError);
                 return false;
            }
        } else {
             console.error("Failed to save settings to Appwrite:", error);
             return false;
        }
    }
}


// --- Communication Functions ---

export async function sendToTelegram(settings: TelegramSettings, article: NewsArticle): Promise<boolean> {
    if (!settings.botToken || !settings.chatId) {
        console.error("Telegram settings are incomplete.");
        return false;
    }

    const API_URL = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
    
    const message = `
*${article.title}*

*منبع:* ${article.source}
*اعتبار:* ${article.credibility}

${article.summary}

[مشاهده خبر اصلی](${article.link})
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: settings.chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();
        if (data.ok) {
            console.log("Message sent to Telegram successfully");
            return true;
        } else {
            console.error("Failed to send message to Telegram:", data.description);
            return false;
        }
    } catch (error) {
        console.error("Error sending message to Telegram:", error);
        return false;
    }
}


export async function sendToDiscord(settings: DiscordSettings, article: NewsArticle): Promise<boolean> {
    if (!settings.webhookUrl) {
        console.error("Discord webhook URL is not set.");
        return false;
    }

    const payload = {
        embeds: [{
            title: article.title,
            description: article.summary,
            url: article.link,
            color: 5814783, // A nice blue color
            fields: [
                { name: "منبع", value: article.source, inline: true },
                { name: "اعتبار", value: article.credibility, inline: true },
                { name: "دسته‌بندی", value: article.category, inline: true },
            ],
            thumbnail: {
                url: article.imageUrl
            },
            timestamp: new Date().toISOString()
        }]
    };

    try {
        const response = await fetch(settings.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("Message sent to Discord successfully");
            return true;
        } else {
            console.error("Failed to send message to Discord:", response.statusText);
            return false;
        }
    } catch (error) {
        console.error("Error sending message to Discord:", error);
        return false;
    }
}

// --- Connection Test Functions ---

export async function testTelegramConnection(settings: TelegramSettings): Promise<boolean> {
    if (!settings.botToken) return false;
    const API_URL = `https://api.telegram.org/bot${settings.botToken}/getMe`;
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        return data.ok === true;
    } catch (error) {
        console.error("Telegram connection test failed:", error);
        return false;
    }
}

export async function testDiscordConnection(settings: DiscordSettings): Promise<boolean> {
    if (!settings.webhookUrl) return false;
    try {
        const response = await fetch(settings.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: "تست اتصال از برنامه جستجوی هوشمند اخبار موفقیت‌آمیز بود." })
        });
        return response.ok;
    } catch (error) {
        console.error("Discord connection test failed:", error);
        return false;
    }
}

export async function testWebsiteConnection(settings: IntegrationSettings['website']): Promise<boolean> {
    if (!settings.apiUrl || !settings.apiKey) return false;
    console.log("Testing Website (Grupo) connection (placeholder)...", settings);
    try {
        new URL(settings.apiUrl);
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (settings.apiKey.length > 10) {
            // In a real app, you'd send a test message here.
            return true;
        }
        return false;
    } catch (error) {
        console.error("Website connection test failed:", error);
        return false;
    }
}

export async function testTwitterConnection(settings: IntegrationSettings['twitter']): Promise<boolean> {
    if (!settings.apiKey || !settings.apiSecretKey || !settings.accessToken || !settings.accessTokenSecret) return false;
    console.log("Testing Twitter connection (placeholder)...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return true; // Placeholder
}

export async function testAppwriteConnection(settings: AppwriteSettings): Promise<boolean> {
    const appwrite = getAppwriteClient(settings);
    if (!appwrite) return false;

    const { databases } = appwrite;
    const { databaseId, settingsCollectionId, newsArticlesCollectionId, chatHistoryCollectionId } = settings;

    if (!databaseId) return false;

    // Helper to test a collection. Returns true if it exists (even if empty).
    const checkCollection = async (collectionId: string): Promise<boolean> => {
        if (!collectionId) return true; // If ID is not provided, we don't test it and don't fail.
        try {
            // listDocuments is a good way to check read access and existence. Limit to 1 for efficiency.
            await databases.listDocuments(databaseId, collectionId, [Query.limit(1)]);
            return true;
        } catch (error: any) {
            // 404 means collection exists but is empty, which is a valid state for the connection test.
            if (error.code === 404) {
                 console.log(`Appwrite connection check: Collection '${collectionId}' exists but is empty. (Success)`);
                 return true;
            }
            console.error(`Appwrite connection test failed for collection '${collectionId}':`, error);
            return false;
        }
    };
    
    // Check all collections in parallel.
    const results = await Promise.all([
        checkCollection(settingsCollectionId),
        checkCollection(newsArticlesCollectionId),
        checkCollection(chatHistoryCollectionId),
    ]);

    // If all checks passed, the connection is considered successful.
    const allSuccessful = results.every(Boolean);
    if(allSuccessful) {
        console.log("Appwrite connection and all specified collections verified successfully.");
    }
    return allSuccessful;
}

export async function testSupabaseConnection(settings: IntegrationSettings['supabase']): Promise<boolean> {
    if (!settings.projectUrl || !settings.anonKey) return false;
    console.log("Testing Supabase connection (placeholder)...");
     try {
        new URL(settings.projectUrl);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
    } catch {
        return false;
    }
}


export async function testOpenAIConnection(apiKey: string): Promise<boolean> {
    if (!apiKey) {
        return false;
    }
    console.log("Testing OpenAI connection (placeholder)...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (apiKey.startsWith('sk-') && apiKey.length > 20) {
        console.log("OpenAI connection test successful (placeholder).");
        return true;
    } else {
        console.error("OpenAI connection test failed: Invalid API key format (placeholder).");
        return false;
    }
}

export async function testOpenRouterConnection(apiKey: string): Promise<boolean> {
    if (!apiKey) {
        return false;
    }
    console.log("Testing OpenRouter connection (placeholder)...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (apiKey.startsWith('sk-or-') && apiKey.length > 20) {
        console.log("OpenRouter connection test successful (placeholder).");
        return true;
    } else {
        console.error("OpenRouter connection test failed: Invalid API key format (placeholder).");
        return false;
    }
}

export async function testGroqConnection(apiKey: string): Promise<boolean> {
    if (!apiKey) {
        return false;
    }
    console.log("Testing Groq connection (placeholder)...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (apiKey.startsWith('gsk_') && apiKey.length > 20) {
        console.log("Groq connection test successful (placeholder).");
        return true;
    } else {
        console.error("Groq connection test failed: Invalid API key format (placeholder).");
        return false;
    }
}

async function getRemoteSettingsFromCloudflare(integrations: IntegrationSettings): Promise<AppSettings | null> {
    const { cloudflareWorkerUrl, cloudflareWorkerToken } = integrations;
    if (cloudflareWorkerUrl && cloudflareWorkerToken) {
        try {
            const response = await fetch(`${cloudflareWorkerUrl}/settings`, {
                headers: { 'Authorization': `Bearer ${cloudflareWorkerToken}` }
            });
            if (response.ok) {
                const remoteSettings = await response.json();
                return remoteSettings as AppSettings;
            }
        } catch (e) {
            console.error("Failed to fetch from worker", e);
        }
    }
    return null;
}

// --- Main Settings Fetch/Save Logic ---

export async function fetchSettings(): Promise<AppSettings> {
    let tempSettings = INITIAL_SETTINGS;
    // 1. Try loading from localStorage first for immediate UI response
    try {
        const settingsString = localStorage.getItem('app-settings');
        if (settingsString) {
            tempSettings = { ...INITIAL_SETTINGS, ...JSON.parse(settingsString) };
        }
    } catch (e) {
        console.error("Failed to parse settings from localStorage", e);
    }
    
    // 2. Try fetching from Appwrite and override if successful
    const appwriteSettings = await getSettingsFromAppwrite(tempSettings.integrations.appwrite);
    if (appwriteSettings) {
        console.log("Loaded settings from Appwrite.");
        const mergedSettings = { ...INITIAL_SETTINGS, ...appwriteSettings };
        localStorage.setItem('app-settings', JSON.stringify(mergedSettings));
        return mergedSettings;
    }

    // 3. If Appwrite fails, try Cloudflare Worker
    const cloudflareSettings = await getRemoteSettingsFromCloudflare(tempSettings.integrations);
    if (cloudflareSettings) {
        console.log("Loaded settings from Cloudflare.");
        const mergedSettings = { ...INITIAL_SETTINGS, ...cloudflareSettings };
        localStorage.setItem('app-settings', JSON.stringify(mergedSettings));
        return mergedSettings;
    }
    
    // 4. If all remotes fail, return the localStorage/initial settings
    return tempSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
    // Always save to localStorage immediately for offline reliability
    localStorage.setItem('app-settings', JSON.stringify(settings));

    // 1. Attempt to save to Appwrite first
    const appwriteSuccess = await saveSettingsToAppwrite(settings);
    if (appwriteSuccess) {
        return; // Successfully saved to primary remote, we're done.
    }

    // 2. If Appwrite is not configured or fails, attempt to save to the Cloudflare worker
    const { cloudflareWorkerUrl, cloudflareWorkerToken } = settings.integrations;
    if (cloudflareWorkerUrl && cloudflareWorkerToken) {
        try {
            const response = await fetch(`${cloudflareWorkerUrl}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cloudflareWorkerToken}`
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error(`Worker returned status ${response.status}`);
            }
            console.log("Settings saved to Cloudflare Worker successfully.");
        } catch (e) {
            console.error("Failed to save settings to worker. They are saved locally.", e);
            throw new Error("Failed to save settings to Cloudflare.");
        }
    }
}

export async function testCloudflareDbConnection(url: string, token: string): Promise<boolean> {
    if (!url || !token) return false;
    try {
        const testUrl = new URL('/settings', url).toString();
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        // A success is OK (200) for existing settings, or Not Found (404) for a new DB.
        // Unauthorized (401/403) or other errors are failures.
        return response.ok || response.status === 404;
    } catch (error) {
        console.error("Cloudflare DB connection test failed:", error);
        return false;
    }
}