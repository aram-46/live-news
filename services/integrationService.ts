

import { NewsArticle, IntegrationSettings } from '../types';

interface TelegramSettings {
    botToken: string;
    chatId: string;
}

interface DiscordSettings {
    webhookUrl: string;
}

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

export async function testAppwriteConnection(settings: IntegrationSettings['appwrite']): Promise<boolean> {
    if (!settings.endpoint || !settings.projectId || !settings.apiKey) return false;
    console.log("Testing Appwrite connection (placeholder)...");
    try {
        new URL(settings.endpoint);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
    } catch {
        return false;
    }
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
