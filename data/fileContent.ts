// This file centralizes the content for downloadable files to keep components clean.

export const backendFiles = {
    packageJson: `{
  "name": "smart-news-backend",
  "version": "1.0.0",
  "description": "Backend server for the Smart News Search application.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "node-telegram-bot-api": "^0.61.0"
  }
}`,

    serverJs: `// Simple Express server for Smart News Search backend
// To run:
// 1. Install dependencies: npm install
// 2. Create a .env file with your TELEGRAM_BOT_TOKEN
// 3. Run the server: node server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 3001;

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error("FATAL ERROR: TELEGRAM_BOT_TOKEN is not set in your .env file.");
    process.exit(1);
}

// In production, you would set a webhook. For development, polling is easier.
const bot = new TelegramBot(token, { polling: true });

app.use(cors());
app.use(express.json());

// Basic route to check if server is running
app.get('/', (req, res) => {
    res.send('Smart News Search Backend is running!');
});

// --- Telegram Bot Logic ---
bot.onText(/\\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'سلام! ربات هوشمند اخبار آماده است. برای دریافت آخرین اخبار /news، برای اخبار از خبرخوان‌ها /rss و برای قیمت ارزهای دیجیتال /crypto را ارسال کنید.');
});

bot.onText(/\\/news/, (msg) => {
    const chatId = msg.chat.id;
    // In a real application, you would call the Gemini API here to fetch news
    // and then format it to send back to the user.
    bot.sendMessage(chatId, 'در حال حاضر در حال دریافت آخرین اخبار هستیم... (این یک عملکرد نمونه است)');
    // Example:
    // const news = await fetchLiveNews(...);
    // bot.sendMessage(chatId, formatNewsForTelegram(news));
});

bot.onText(/\\/rss/, (msg) => {
    const chatId = msg.chat.id;
    // This is a simplified call. A real implementation would fetch settings.
    // For now, it relies on an AI instruction that contains some default feeds.
    bot.sendMessage(chatId, 'در حال دریافت آخرین اخبار از خبرخوان‌ها...');
    // In a real app, call a function like:
    // const articles = await fetchNewsFromFeeds([], settings.aiInstructions['rss-feeds']);
    // bot.sendMessage(chatId, formatArticlesForTelegram(articles));
});


bot.onText(/\\/crypto/, (msg) => {
    const chatId = msg.chat.id;
    // In a real application, you would call the Gemini API here to fetch crypto prices
    bot.sendMessage(chatId, 'در حال دریافت قیمت ارزهای دیجیتال... (این یک عملکرد نمونه است)');
});


console.log('Telegram bot is polling for messages...');


// You can also set up a webhook endpoint if you prefer that over polling
// The URL would be: https://your-server-address.com/telegram-webhook
app.post('/telegram-webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});


app.listen(port, () => {
    console.log(\`Server listening on http://localhost:\${port}\`);
    console.log('To set a webhook for the Telegram bot, run the following curl command in your terminal:');
    console.log(\`// curl -F "url=https://YOUR_PUBLIC_SERVER_URL/telegram-webhook" https://api.telegram.org/bot\${token}/setWebhook\`);
});
`,
    
    schemaSql: `-- Smart News Search - Comprehensive Database Schema
-- Supports storing all settings, credentials, history, and results.

-- Table to store the entire application settings object as a single JSON string.
CREATE TABLE IF NOT EXISTS app_settings (
    key_id VARCHAR(50) PRIMARY KEY,
    settings_json LONGTEXT NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for credentials. Storing sensitive data here is less secure than environment variables.
CREATE TABLE IF NOT EXISTS credentials (
    service_name VARCHAR(50) PRIMARY KEY,
    api_key TEXT,
    api_secret TEXT,
    access_token TEXT,
    access_token_secret TEXT,
    other_config_json TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table to store different types of user activities and searches.
CREATE TABLE IF NOT EXISTS search_history (
    id VARCHAR(36) PRIMARY KEY,
    item_type VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    result_summary TEXT,
    result_data_json LONGTEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for RSS Feeds URLs.
CREATE TABLE IF NOT EXISTS rss_feeds (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(512) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store articles fetched from RSS feeds to avoid duplicates.
CREATE TABLE IF NOT EXISTS rss_articles (
    id VARCHAR(36) PRIMARY KEY,
    feed_id VARCHAR(36) NOT NULL,
    title VARCHAR(512) NOT NULL,
    link VARCHAR(1024) NOT NULL UNIQUE,
    summary TEXT,
    publication_time VARCHAR(100),
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_sent BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE
);

-- Table to manage chatbot conversations/sessions.
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store individual messages within a chat session.
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role VARCHAR(10) NOT NULL,
    content TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Table to store the results of the Analyzer feature.
CREATE TABLE IF NOT EXISTS analysis_results (
    id VARCHAR(36) PRIMARY KEY,
    topic TEXT NOT NULL,
    analysis_type VARCHAR(50),
    result_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`,
    
    wranglerToml: `# Cloudflare Worker configuration file
# This file is used by the Wrangler CLI to deploy your worker.
# See https://developers.cloudflare.com/workers/wrangler/configuration/

name = "smart-news-telegram-bot" # You can change this to your preferred worker name
main = "cloudflare/worker.js"   # Path to your main worker script
compatibility_date = "2024-05-15"
`,

    telegramBotWorkerJs: `/**
 * Cloudflare Worker for a Telegram Bot
 * This worker can handle both standard Telegram webhooks and custom test messages
 * from the application's settings panel for verification.
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      const payload = await request.json();
      if (payload.update_id) { // Standard Telegram webhook
        await handleUpdate(payload);
      } else if (payload.test_message) { // Custom test message from app
        await handleTestMessage(payload.test_message);
      } else {
        return new Response('Invalid payload', { status: 400, headers: corsHeaders });
      }
      return new Response('OK', { status: 200, headers: corsHeaders });
    } catch (e) {
      console.error('Error processing request:', e);
      return new Response('Error', { status: 500, headers: corsHeaders });
    }
  }
  return new Response('This worker only accepts POST requests.', { status: 405, headers: corsHeaders });
}

async function handleUpdate(update) {
  if (update.message) {
    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text;
    const command = text.split(' ')[0];
    const args = text.substring(command.length).trim();

    if (command === '/start') {
      await sendMessage(chatId, 'سلام! ربات هوشمند اخبار آماده است. از دستورات /news, /rss, /crypto, /factcheck, /analyze, /suggest استفاده کنید.');
    } else if (command === '/news') {
      await sendMessage(chatId, 'در حال جستجوی آخرین اخبار جهان...');
      const news = await fetchNewsFromGemini();
      if (news && news.length > 0) {
        const firstArticle = news[0];
        const formattedMessage = \`*\\\${firstArticle.title}*\\n\\n*منبع:* \\\${firstArticle.source}\\n\\n\\\${firstArticle.summary}\\n\\n[مشاهده خبر](\\\${firstArticle.link})\`;
        await sendMessage(chatId, formattedMessage, 'Markdown');
      } else {
        await sendMessage(chatId, 'متاسفانه در حال حاضر مشکلی در دریافت اخبار وجود دارد.');
      }
    } else if (command === '/rss') {
        await sendMessage(chatId, 'در حال دریافت آخرین اخبار از خبرخوان‌ها...');
        const articles = await fetchRssNewsFromGemini();
        if (articles && articles.length > 0) {
            const firstArticle = articles[0];
            const formattedMessage = \`*\\\${firstArticle.title}*\\n\\n*منبع:* \\\${firstArticle.source}\\n\\n\\\${firstArticle.summary}\\n\\n[مشاهده خبر](\\\${firstArticle.link})\`;
            await sendMessage(chatId, formattedMessage, 'Markdown');
        } else {
            await sendMessage(chatId, 'خطا در دریافت اخبار از خبرخوان‌ها.');
        }
    } else if (command === '/crypto') {
        await sendMessage(chatId, 'در حال دریافت قیمت لحظه‌ای ارزهای دیجیتال...');
        const coins = await fetchCryptoFromGemini();
        if (coins && coins.length > 0) {
            let cryptoMessage = '📈 *آخرین قیمت‌ها:*\\n\\n';
            coins.forEach(coin => {
                const change = coin.price_change_percentage_24h >= 0 ? '📈' : '📉';
                cryptoMessage += \`*\\\${coin.name} (\\\${coin.symbol.toUpperCase()})*\\n\`;
                cryptoMessage += \`قیمت: *\\\${coin.price_usd.toLocaleString('en-US')} $* | *\\\${coin.price_toman.toLocaleString('fa-IR')} تومان*\\n\`;
                cryptoMessage += \`تغییر ۲۴ ساعت: \\\${change} \\\${Math.abs(coin.price_change_percentage_24h).toFixed(2)}%\\n\\n\`;
            });
            await sendMessage(chatId, cryptoMessage, 'Markdown');
        } else {
            await sendMessage(chatId, 'متاسفانه مشکلی در دریافت قیمت ارزهای دیجیتال وجود دارد.');
        }
    } else if (command === '/factcheck') {
        if (!args) {
            await sendMessage(chatId, "لطفا متن ادعای خود را بعد از دستور /factcheck وارد کنید.");
            return;
        }
        await sendMessage(chatId, 'در حال بررسی اعتبار ادعای شما...');
        const result = await factCheckFromGemini(args);
        await sendMessage(chatId, result, 'Markdown');
    } else if (command === '/analyze') {
        if (!args) {
            await sendMessage(chatId, "لطفا موضوع تحلیل خود را بعد از دستور /analyze وارد کنید.");
            return;
        }
        await sendMessage(chatId, 'در حال تحلیل موضوع...');
        const result = await analyzeFromGemini(args);
        await sendMessage(chatId, result, 'Markdown');
    } else if (command === '/suggest') {
        const [type, ...topicParts] = args.split(' ');
        const topic = topicParts.join(' ');
        if (!type || !topic) {
            await sendMessage(chatId, "استفاده صحیح: /suggest <type> <topic>\\nType میتواند keywords, webname, domain باشد.");
            return;
        }
        await sendMessage(chatId, \`در حال جستجوی پیشنهاد برای \\\`\\\${topic}\\\`...\`);
        const result = await suggestFromGemini(type, topic);
        await sendMessage(chatId, result);
    }
  }
}

async function handleTestMessage(testPayload) {
    const { chat_id, text } = testPayload;
    if (chat_id && text) {
        await sendMessage(chat_id, text);
    } else {
        throw new Error('Invalid test message payload received.');
    }
}

async function sendMessage(chatId, text, parseMode = '') {
  const url = \`https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage\`;
  const payload = { chat_id: chatId, text: text, parse_mode: parseMode || undefined };
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// --- Simplified Gemini Functions for Telegram Bot ---

async function callGemini(prompt, response_mime_type = "text/plain") {
    const body = {
      contents: [{ parts: [{ "text": prompt }] }],
      ...(response_mime_type === "application/json" && { generationConfig: { response_mime_type } })
    };
    const url = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${GEMINI_API_KEY}\`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error calling Gemini:", error);
        return null;
    }
}

async function fetchNewsFromGemini() {
    const text = await callGemini("مهم‌ترین مقاله خبری اخیر جهان را برای یک کاربر فارسی‌زبان پیدا کن. یک شیء JSON با کلیدهای title, summary, source و link ارائه بده.", "application/json");
    const result = text ? JSON.parse(text.trim()) : null;
    return Array.isArray(result) ? result : [result];
}
async function fetchRssNewsFromGemini() {
    const text = await callGemini("مهم‌ترین مقاله خبری را از این فیدهای RSS واکشی کن: [\\"https://www.isna.ir/rss\\", \\"http://feeds.bbci.co.uk/persian/rss.xml\\"]. یک خروجی JSON با کلیدهای title, summary, source و link ارائه بده.", "application/json");
    const result = text ? JSON.parse(text.trim()) : null;
    return Array.isArray(result) ? result : [result];
}
async function fetchCryptoFromGemini() {
    const text = await callGemini("داده‌های قیمت زنده ۳ ارز دیجیتال برتر را پیدا کن. برای هر کدام، نام، نماد، قیمت به دلار، قیمت به تومان و درصد تغییر ۲۴ ساعته را ارائه بده. به صورت یک آرایه JSON برگردان.", "application/json");
    return text ? JSON.parse(text.trim()) : null;
}
async function factCheckFromGemini(claim) {
    const prompt = \`این ادعا را راستی‌آزمایی کن: "\\\${claim}". خلاصه‌ای کوتاه از یافته‌هایت و یک امتیاز اعتبار (بسیار معتبر، معتبر، نیازمند بررسی) به زبان فارسی ارائه بده. با فرمت Markdown.\`;
    return await callGemini(prompt) || "خطا در بررسی ادعا.";
}
async function analyzeFromGemini(topic) {
    const prompt = \`یک تحلیل کوتاه و بی‌طرفانه از این موضوع ارائه بده: "\\\${topic}". پاسخ باید به زبان فارسی باشد.\`;
    return await callGemini(prompt) || "خطا در تحلیل موضوع.";
}
async function suggestFromGemini(type, topic) {
    let prompt = '';
    if (type === 'keywords') {
        prompt = \`۵ کلمه کلیدی سئو برای این موضوع پیشنهاد بده: "\\\${topic}". آن‌ها را لیست کن.\`;
    } else if (type === 'webname') {
        prompt = \`۵ نام وب‌سایت خلاقانه برای این موضوع پیشنهاد بده: "\\\${topic}". آن‌ها را لیست کن.\`;
    } else if (type === 'domain') {
        prompt = \`۵ نام دامنه در دسترس برای این موضوع پیشنهاد بده: "\\\${topic}". آن‌ها را لیست کن.\`;
    } else {
        return "نوع پیشنهاد نامعتبر است.";
    }
    return await callGemini(prompt) || "خطا در دریافت پیشنهاد.";
}
`,

    githubActionYml: `# GitHub Actions Workflow for Smart News Search
# This workflow runs a script on a schedule to fetch daily news and commit it to the repository.

name: Daily News Fetcher

# Controls when the action will run.
# This example runs every day at 01:00 UTC.
on:
  schedule:
    - cron: '0 1 * * *'
  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - uses: actions/checkout@v3

      # Sets up Node.js
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # (Optional) If your script has dependencies, install them
      # - name: Install dependencies
      #   run: npm install @google/genai

      # Runs the main script
      - name: Run news fetching script
        run: node github/main.js
        # env:
        #   GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }} # You must add this secret to your repository settings

      # Commits the new 'daily_news.json' file to the repository
      - name: Commit and push if there are changes
        run: |
          git config --global user.name 'github-actions[bot]'
          git config --global user.email 'github-actions[bot]@users.noreply.github.com'
          git add daily_news.json
          git diff --staged --quiet || (git commit -m "Update daily news" && git push)
`,

    githubActionJs: `// Node.js script to be run by a GitHub Action.
// This script could, for example, fetch daily news and commit it to the repository as a JSON file.

const fs = require('fs');
const path = require('path');
// To use @google/genai, you would need to install it in your GitHub Action workflow.
// For simplicity, we will simulate the API call with a placeholder.

async function fetchDailyNews() {
    console.log("Fetching daily news from Gemini API...");
    // In a real workflow, you would use the Gemini API client here.
    // const { GoogleGenAI } = require("@google/genai");
    // const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // const response = await ai.models.generateContent(...);
    
    // Placeholder data for demonstration:
    const placeholderNews = [
        { title: "خبر مهم روز اول", link: "https://example.com/news1" },
        { title: "تحلیل اقتصادی هفته", link: "https://example.com/news2" },
        { title: "آخرین رویداد ورزشی", link: "https://example.com/news3" },
    ];
    
    console.log("Successfully fetched news.");
    return placeholderNews;
}

async function main() {
    try {
        const newsData = await fetchDailyNews();
        const outputPath = path.join(__dirname, '..', 'daily_news.json'); // Save to root directory
        
        fs.writeFileSync(outputPath, JSON.stringify(newsData, null, 2), 'utf-8');
        
        console.log(\`Successfully wrote \${newsData.length} news articles to \${outputPath}\`);
    } catch (error) {
        console.error("Error in GitHub Action script:", error);
        process.exit(1); // Exit with an error code to fail the Action
    }
}

main();
`,
    featuresMd: `# لیست امکانات و قابلیت‌های پروژه "جستجوی هوشمند اخبار"

این پروژه یک ابزار پیشرفته تحت وب برای جستجو، تحلیل و مدیریت هوشمند اخبار است که از قدرت هوش مصنوعی Gemini بهره می‌برد.

## ویژگی‌های اصلی

### ۱. نمایش اخبار زنده (Live News)
- **تب‌های موضوعی:** تفکیک اخبار در دسته‌بندی‌های ایران، جهان، بازار مالی و سایر.
- **بروزرسانی هوشمند:** سیستم بررسی خودکار منابع برای یافتن اخبار جدید با قابلیت تنظیم فاصله زمانی.
- **اعلان بروزرسانی:** نمایش یک دکمه چشمک‌زن در صورت وجود اخبار جدید.
- **فیلترهای پیشرفته:**
  - امکان تعریف و انتخاب چندگانه **دسته‌بندی‌ها**، **گروه‌های خبری** و **مناطق جغرافیایی** دلخواه.
  - انتخاب دقیق **منابع خبری** از لیست گروه‌بندی شده و تاشو.
- **شخصی‌سازی ظاهر:** تنظیمات کامل فونت شامل نوع، اندازه و **رنگ گرادیان**.

### ۲. جستجوی پیشرفته (Advanced Search)
- **فیلتر چندبعدی:** جستجو بر اساس کلیدواژه، دسته‌بندی، منطقه جغرافیایی و نوع منبع (داخلی، خارجی و...).
- **نتایج هوشمند:** دریافت نتایج دقیق و مرتبط با استفاده از دستورالعمل‌های اختصاصی برای هوش مصنوعی.
- **مدیریت نتایج:** قابلیت حذف موقت یک خبر از لیست نتایج برای تمرکز بیشتر.

### ۳. فکت-چک هوشمند (AI Fact-Check)
- **تحلیل چندرسانه‌ای:** قابلیت بررسی اعتبار **متن**، **تصویر**، **صدا** و **ویدئو**.
- **گزارش جامع:** ارائه نتیجه بررسی (بسیار معتبر، معتبر، نیازمند بررسی) به همراه توضیحات کامل.
- **ارائه منابع:** لیست کردن منابع معتبری که ادعای مطرح شده را تایید یا رد می‌کنند.

### ۴. ابزار آنلاین (Online Tools)
- **سایت ساز:** یک مجموعه ابزار برای کمک به ساخت و تولید محتوای وب‌سایت.
  - **محتوا ساز (Content Creator):**
    - تولید کلمات کلیدی سئو (SEO).
    - پیشنهاد نام برای وب‌سایت.
    - پیشنهاد نام دامنه.
    - تولید پیش‌نویس کامل مقاله بر اساس موضوع و تعداد کلمات.
    - تولید تصاویر مرتبط برای مقاله با هوش مصنوعی.
  - **صفحه ساز (Page Builder):**
    - تولید یک صفحه کامل "درباره من" با هوش مصنوعی.
    - قابلیت ارائه توضیحات، لینک سایت و آپلود تصاویر به عنوان ورودی.
    - دریافت خروجی به صورت کد HTML آماده یا متن خالص.
    - امکان سفارشی‌سازی خروجی برای پلتفرم‌های مختلف (مانند گیت‌هاب یا وب‌سایت شخصی).
    - پیش‌نمایش زنده صفحه ساخته شده.

### ۵. نوار اخبار متحرک (News Ticker)
- **نمایش پویا:** نمایش مهم‌ترین عناوین خبری به صورت متحرک در بالای صفحه.
- **شخصی‌سازی کامل:** تنظیم سرعت، جهت حرکت (چپ به راست و بالعکس) و رنگ متن.

### ۶. اعتبار و دسترسی به منابع
- **لینک‌های معتبر و مستقیم:** هوش مصنوعی به شدت موظف شده است که برای تمامی اخبار، منابع و نتایج جستجو، لینک‌های **مستقیم، سالم و قابل دسترس** ارائه دهد. این امر از نمایش محتوای فیک یا لینک‌های شکسته جلوگیری می‌کند.
- **تجربه کاربری بهینه:** تمامی لینک‌هایی که به منابع خارجی ارجاع می‌دهند، به صورت خودکار در یک **تب جدید** در مرورگر باز می‌شوند تا جریان کاری شما در برنامه قطع نشود.

## پنل تنظیمات جامع

### ۱. مدیریت محتوا و نمایش
- **تنظیمات اخبار زنده:** دسترسی به تمام فیلترها و تنظیمات ظاهری اختصاصی این بخش.
- **تنظیمات نوار اخبار:** کنترل کامل ظاهر و رفتار نوار اخبار.
- **تنظیمات عمومی نمایش:** تعیین تعداد ستون‌ها و تعداد کارت‌های خبری قابل نمایش.
- **مدیریت گزینه‌های فیلتر:** امکان افزودن یا حذف دسته‌بندی‌ها و مناطق مورد استفاده در کل برنامه.

### ۲. تم و استایل
- **انتخاب تم:** دارای چندین تم آماده (اقیانوس، رویای نئونی، شراره خورشیدی).
- **CSS سفارشی:** قابلیت افزودن کدهای CSS دلخواه برای شخصی‌سازی کامل ظاهر برنامه.

### ۳. مدیریت منابع خبری
- **دسته‌بندی منابع:** تفکیک منابع در گروه‌های فکت-چک، خبرگزاری‌ها، تحلیلی و... .
- **افزودن و ویرایش دستی:** مدیریت کامل لیست منابع.
- **جستجوی هوشمند منابع:** قابلیت یافتن و افزودن منابع جدید با کمک هوش مصنوعی.
- **ورود و خروج:** امکان تهیه نسخه پشتیبان از منابع در فایل Excel و بازیابی آن.

### ۴. تنظیمات هوش مصنوعی (سه تب مجزا)
- **دستورالعمل‌های AI:**
  - **شخصی‌سازی رفتار AI:** تعریف دستورالعمل‌های متنی دقیق برای وظایف مختلف (فکت-چک، جستجو، نوار اخبار و...).
  - **تست دستورالعمل:** قابلیت تست کارایی دستورالعمل‌ها قبل از استفاده نهایی.
  - **تولید با AI:** امکان تولید خودکار یک دستورالعمل پایه با هوش مصنوعی.
- **مدل‌های AI:**
  - **پشتیبانی از چند ارائه‌دهنده:** تنظیمات مربوط به کلید API برای سرویس‌دهنده‌های مختلف (Gemini, OpenAI, OpenRouter, Groq).
  - **تست اتصال:** قابلیت تست اتصال به هر سرویس برای اطمینان از صحت کلید API.
- **تخصیص مدل‌ها:**
  - **مدیریت انعطاف‌پذیر:** امکان اختصاص دادن یک مدل هوش مصنوعی خاص به هر یک از وظایف برنامه.
  - **قابلیت فال‌بک (Fallback):** به سادگی می‌توانید وظایف را به مدل دیگری منتقل کنید، برای مثال در صورت اتمام محدودیت استفاده از یک سرویس.

<!-- Placeholder for a screenshot -->
![اسکرین‌شات از تب تخصیص مدل‌ها](placeholder.png)


### ۵. اتصالات و پلتفرم‌ها (Integrations)
- **ارسال به شبکه‌های اجتماعی:** اتصال به تلگرام، دیسکورد و توییتر برای ارسال خودکار اخبار.
- **اتصال به وب‌سایت:** یکپارچه‌سازی با پلتفرم چت Grupo.
- **اتصال به BaaS:** تنظیمات اولیه برای اتصال به پلتفرم‌های Appwrite و Supabase.
- **ربات دیسکورد:** ارائه کد کامل و راهنمای راه‌اندازی یک ربات دیسکورد با تمام قابلیت‌های برنامه که روی **Cloudflare Workers** اجرا می‌شود.

## زیرساخت و قابلیت‌های استقرار

### ۱. فایل‌های بک‌اند و دیتابیس
- ارائه فایل‌های آماده برای راه‌اندازی یک سرور **Node.js/Express**.
- ارائه اسکیمای دیتابیس **SQL** برای ذخیره‌سازی داده‌ها.
- راهنمای کامل برای راه‌اندازی در تب **بک‌اند**.

### ۲. استقرار روی Cloudflare
- ارائه اسکریپت آماده **Cloudflare Worker** برای اجرای ربات تلگرام به صورت Serverless.
- راهنمای قدم به قدم برای استقرار در تب **کلودفلر**.

### ۳. یکپارچه‌سازی با GitHub
- ارائه فایل‌های نمونه برای **GitHub Actions** جهت اجرای وظایف خودکار (مانند جمع‌آوری اخبار روزانه).
- راهنمای کامل استفاده در تب **گیت‌هاب**.
`,

    // --- NEW DISCORD BOT FILES ---

    discordBotGuideMd: `# راهنمای کامل راه‌اندازی و استفاده از ربات دیسکورد

این راهنما شما را قدم به قدم برای ساخت، استقرار و استفاده از ربات دیسکورد هوشمند راهنمایی می‌کند. این ربات بر روی زیرساخت **Cloudflare Workers** اجرا می‌شود که بسیار بهینه و مقرون به صرفه است.

---

### بخش اول: ساخت اپلیکیشن ربات در دیسکورد

در این مرحله، هویت ربات خود را در دیسکورد ایجاد می‌کنیم.

1.  **ورود به پورتال توسعه‌دهندگان:** به [Discord Developer Portal](https://discord.com/developers/applications) بروید و با اکانت دیسکورد خود وارد شوید.

2.  **ساخت اپلیکیشن جدید:**
    *   روی دکمه **"New Application"** در گوشه بالا سمت راست کلیک کنید.
    *   یک نام برای اپلیکیشن خود انتخاب کنید (مثلاً "Smart News Bot") و تیک موافقت با قوانین را زده و روی **"Create"** کلیک کنید.

3.  **دریافت اطلاعات کلیدی:**
    *   در صفحه اپلیکیشن، مقادیر **\`APPLICATION ID\`** و **\`PUBLIC KEY\`** را کپی کرده و در جایی امن ذخیره کنید. این مقادیر را در مراحل بعد نیاز خواهید داشت.

4.  **تبدیل اپلیکیشن به ربات:**
    *   از منوی سمت چپ، به تب **"Bot"** بروید.
    *   روی دکمه **"Add Bot"** و سپس **"Yes, do it!"** کلیک کنید.
    *   در زیر نام ربات، روی **"Reset Token"** کلیک کنید تا توکن ربات شما نمایش داده شود. این توکن مانند رمز عبور ربات شماست. آن را کپی کرده و در جایی **بسیار امن** ذخیره کنید. **این توکن را با هیچکس به اشتراک نگذارید.**

5.  **دعوت ربات به سرور:**
    *   از منوی سمت چپ به تب **"OAuth2"** و سپس زیرمنوی **"URL Generator"** بروید.
    *   در بخش **SCOPES**، تیک **\`bot\`** و **\`applications.commands\`** را بزنید.
    *   در بخش **BOT PERMISSIONS** که ظاهر می‌شود، دسترسی‌های زیر را به ربات بدهید:
        *   \`Send Messages\`
        *   \`Embed Links\`
        *   \`Attach Files\`
        *   \`Read Message History\`
    *   یک لینک در پایین صفحه ساخته می‌شود. آن را کپی کرده، در مرورگر خود باز کنید و سروری که می‌خواهید ربات را به آن اضافه کنید، انتخاب نمایید.

---

### بخش دوم: ثبت دستورات اسلش (Slash Commands)

این مرحله را فقط **یک بار** باید انجام دهید تا دستورات ربات در دیسکورد ثبت شوند.

1.  **دانلود فایل‌ها:** فایل‌های **\`register-commands.js\`** و **\`package.json\`** را از این صفحه دانلود کنید و در یک پوشه جدید روی کامپیوتر خود قرار دهید.

2.  **ایجاد فایل .env:** در همان پوشه، یک فایل جدید با نام \`.env\` بسازید و اطلاعاتی که در بخش اول ذخیره کردید را به شکل زیر در آن وارد کنید:
    \`\`\`
    DISCORD_APP_ID=YOUR_APPLICATION_ID
    DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN
    \`\`\`

3.  **نصب وابستگی‌ها:** ترمینال را در آن پوشه باز کرده و دستور زیر را اجرا کنید:
    \`\`\`bash
    npm install
    \`\`\`

4.  **اجرای اسکریپت:** دستور زیر را در ترمینال اجرا کنید:
    \`\`\`bash
    node register-commands.js
    \`\`\`
    اگر پیام "Successfully registered commands!" را دیدید، دستورات با موفقیت ثبت شده‌اند.

---

### بخش سوم: استقرار ربات روی Cloudflare Workers

حالا کد اصلی ربات را روی اینترنت مستقر می‌کنیم.

1.  **دانلود فایل ورکر:** فایل **\`worker.js\`** را از این صفحه دانلود کنید.

2.  **ورود به کلودفلر:** وارد داشبورد [Cloudflare](https://dash.cloudflare.com/) خود شوید و از منوی سمت چپ به بخش **Workers & Pages** بروید.

3.  **ساخت سرویس ورکر:**
    *   روی **"Create application"** و سپس تب **"Workers"** کلیک کرده و **"Create worker"** را بزنید.
    *   یک نام برای ورکر خود انتخاب کنید (مثلاً \`discord-news-bot\`) و روی **"Deploy"** کلیک کنید.

4.  **بارگذاری کد:**
    *   پس از ساخت، روی **"Configure worker"** و سپس **"Quick edit"** کلیک کنید.
    *   تمام محتوای موجود در ویرایشگر را پاک کرده و محتوای فایل \`worker.js\` را که دانلود کرده‌اید، در آن جای‌گذاری کنید.
    *   روی **"Save and deploy"** کلیک کنید.

5.  **تنظیم کلیدهای محرمانه (Secrets):**
    *   به صفحه تنظیمات ورکر خود برگردید (از داشبورد اصلی روی ورکر خود کلیک کنید).
    *   به تب **"Settings"** و سپس زیربخش **"Variables"** بروید.
    *   در قسمت **"Environment Variables"**، روی **"Add variable"** کلیک کرده و سه متغیر محرمانه زیر را **با فعال کردن گزینه Encrypt** اضافه کنید:
        *   \`DISCORD_PUBLIC_KEY\` (کلید عمومی که در بخش اول ذخیره کردید)
        *   \`DISCORD_BOT_TOKEN\` (توکن رباتی که در بخش اول ذخیره کردید)
        *   \`GEMINI_API_KEY\` (کلید API جمینای خود)

6.  **دریافت آدرس ورکر:** آدرس ورکر شما در بالای صفحه داشبورد ورکر قابل مشاهده است (مثلاً \`https://your-name.workers.dev\`). آن را کپی کنید.

---

### بخش چهارم: اتصال نهایی دیسکورد به ورکر

این آخرین مرحله برای فعال‌سازی ربات است.

1.  **بازگشت به پورتال توسعه‌دهندگان:** به صفحه اپلیکیشن خود در [Discord Developer Portal](https://discord.com/developers/applications) برگردید.
2.  **وارد کردن آدرس:** در تب **"General Information"**، فیلدی با نام **\`INTERACTIONS ENDPOINT URL\`** وجود دارد. آدرس ورکر کلودفلر خود را که در مرحله قبل کپی کردید، در این فیلد جای‌گذاری کنید و روی **"Save Changes"** کلیک کنید.

**تبریک! ربات شما اکنون فعال و آماده استفاده در سرور دیسکورد است.**

---

### بخش پنجم: لیست دستورات و نحوه استفاده

در سرور دیسکورد خود می‌توانید از دستورات زیر استفاده کنید:

*   **\`/help\`**
    *   **توضیح:** نمایش لیست تمام دستورات و راهنمای استفاده از آن‌ها.

*   **\`/search [query] [category] [region] [source]\`**
    *   **توضیح:** جستجوی پیشرفته اخبار. همه پارامترها اختیاری هستند.
    *   **مثال:** \`/search query: تحولات خاورمیانه category: سیاسی\`

*   **\`/factcheck [claim] [image]\`**
    *   **توضیح:** بررسی اعتبار یک ادعا یا تصویر.
    *   **مثال ۱ (متن):** \`/factcheck claim: ادعای مربوط به رویداد اخیر\`
    *   **مثال ۲ (تصویر):** \`/factcheck image: [فایل تصویر خود را آپلود کنید]\`

*   **\`/stats [topic]\`**
    *   **توضیح:** جستجوی آمار و داده‌های معتبر در مورد یک موضوع.
    *   **مثال:** \`/stats topic: نرخ تورم در ایران در سال گذشته\`

*   **\`/science [topic]\`**
    *   **توضیح:** یافتن مقالات و تحقیقات علمی مرتبط با یک موضوع.
    *   **مثال:** \`/science topic: آخرین تحقیقات در مورد سیاهچاله‌ها\`

*   **\`/religion [topic]\`**
    *   **توضیح:** جستجو در منابع معتبر دینی در مورد یک موضوع.
    *   **مثال:** \`/religion topic: تاریخچه ماه رمضان\`
`,

    discordBotWorkerJs: `// Import the discord-interactions library
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
// Import the Gemini AI library
import { GoogleGenAI } from '@google/genai';

// --- UTILITY AND HELPER FUNCTIONS ---
function getOption(interaction, name) {
  const options = interaction.data.options;
  if (!options) return undefined;
  // Handle subcommands
  if (options[0]?.type === 1 || options[0]?.type === 2) { 
      const subOptions = options[0].options;
      if (!subOptions) return undefined;
      const option = subOptions.find((opt) => opt.name === name);
      return option?.value;
  }
  const option = options.find((opt) => opt.name === name);
  return option?.value;
}

function getAttachment(interaction, name) {
    const options = interaction.data.options;
    if (options) {
        const option = options.find((opt) => opt.name === name);
        if (option && interaction.data.resolved && interaction.data.resolved.attachments) {
            return interaction.data.resolved.attachments[option.value];
        }
    }
    return undefined;
}

async function urlToGenerativePart(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(\`Failed to fetch image: \${response.statusText}\`);
        const mimeType = response.headers.get('content-type');
        const buffer = await response.arrayBuffer();
        const data = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        return { data, mimeType };
    } catch (error) {
        console.error('Error converting URL to generative part:', error);
        return null;
    }
}

// --- GEMINI API INTERACTION FUNCTIONS ---
async function fetchNews(env, filters) {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = \`مهم: تمام متون خروجی (عناوین، خلاصه‌ها و ...) باید به زبان فارسی باشد. ۳ مقاله خبری اخیر بر اساس این معیارها برای یک کاربر فارسی‌زبان پیدا کن: - عبارت جستجو: "\\\${filters.query || 'مهمترین اخبار روز'}" - دسته‌بندی: "\\\${filters.category || 'هر دسته‌بندی'}" - منطقه: "\\\${filters.region || 'هر منطقه'}" - منبع: "\\\${filters.source || 'هر منبع معتبر'}". برای هر مقاله، باید یک URL تصویر مرتبط ارائه دهی.\`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, summary: { type: 'STRING' }, source: { type: 'STRING' }, publicationTime: { type: 'STRING' }, credibility: { type: 'STRING' }, link: { type: 'STRING' }, category: { type: 'STRING' }, imageUrl: { type: 'STRING' } } } } }
    });
    return JSON.parse(response.text.trim());
  } catch (error) { console.error("Error fetching news from Gemini:", error); return null; }
}

async function factCheck(env, claim, imageFile) {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const textPrompt = \`به عنوان یک روزنامه‌نگار تحقیقی در سطح جهانی، تحلیل عمیقی از محتوای زیر انجام بده. کل خروجی شما باید به زبان فارسی و با ساختار JSON باشد. **ماموریت:** محتوا را تأیید کرده و یک حکم و خلاصه واضح و مختصر ارائه بده. **محتوا برای تحلیل:** - متن: "\\\${claim || 'متنی ارائه نشده، تصویر را تحلیل کن.'}"\`;
    const contentParts = [{ text: textPrompt }];
    if (imageFile) contentParts.push({ inlineData: { data: imageFile.data, mimeType: imageFile.mimeType } });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: { parts: contentParts },
            config: { responseMimeType: "application/json", responseSchema: { type: 'OBJECT', properties: { overallCredibility: { type: 'STRING', enum: ['بسیار معتبر', 'معتبر', 'نیازمند بررسی'] }, summary: { type: 'STRING' }, originalSource: { type: 'OBJECT', properties: { name: { type: 'STRING' }, link: { type: 'STRING' }, publicationDate: { type: 'STRING' } } } } } }
        });
        return JSON.parse(response.text.trim());
    } catch (error) { console.error("Error during fact-check from Gemini:", error); return null; }
}

async function fetchStructuredData(env, topic, type) {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    let prompt; let schema;
    if (type === 'stats') {
        prompt = \`معتبرترین داده‌های آماری را برای عبارت "\\\${topic}" پیدا کن. آن را به صورت JSON فرمت‌بندی کن. کل خروجی باید به زبان فارسی باشد.\`;
        schema = { type: 'OBJECT', properties: { title: { type: 'STRING' }, summary: { type: 'STRING' }, sourceDetails: { type: 'OBJECT', properties: { name: { type: 'STRING' }, link: { type: 'STRING' }, publicationDate: { type: 'STRING' } } } } };
    } else {
        prompt = \`یک مقاله علمی کلیدی یا متن دینی مرتبط با "\\\${topic}" پیدا کن. منابع آکادمیک یا اصلی را در اولویت قرار بده. آن را به صورت JSON فرمت‌بندی کن. کل خروجی باید به زبان فارسی باشد.\`;
        schema = { type: 'OBJECT', properties: { title: { type: 'STRING' }, summary: { type: 'STRING' }, sourceDetails: { type: 'OBJECT', properties: { name: { type: 'STRING' }, link: { type: 'STRING' }, author: { type: 'STRING' } } } } };
    }
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema } });
        return JSON.parse(response.text.trim());
    } catch (error) { console.error(\`Error fetching structured data (\${type}) from Gemini:\`, error); return null; }
}

async function analyzeTopic(env, topic) {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const prompt = \`یک تحلیل عمیق و بی‌طرفانه از موضوع داده شده به زبان فارسی ارائه بده. خروجی باید با فرمت JSON AnalysisResult مطابقت داشته باشد، اما محتوا را برای یک embed دیسکورد ساده‌سازی کن. یک متن اصلی "analysis" و حداکثر ۳ "keyPoints" به عنوان آرایه‌ای از اشیاء با یک "title" و "description" ارائه بده. موضوع: \\\${topic}\`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: 'OBJECT', properties: { analysis: { type: 'STRING' }, keyPoints: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, description: { type: 'STRING' } } } } } } } });
        return JSON.parse(response.text.trim());
    } catch (error) { console.error("Error analyzing topic:", error); return null; }
}

async function fetchCrypto(env, coinName) {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const prompt = \`برای ارز دیجیتال "\\\${coinName}" جستجو کن. پاسخ شما باید یک شیء JSON واحد با این کلیدها باشد: name, symbol, price_usd, price_toman, price_change_percentage_24h, summary. تمام متون فارسی باشد.\`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools:[{googleSearch:{}}], responseMimeType: "application/json", responseSchema: { type: 'OBJECT', properties: { name: { type: 'STRING' }, symbol: { type: 'STRING' }, price_usd: { type: 'NUMBER' }, price_toman: { type: 'NUMBER' }, price_change_percentage_24h: { type: 'NUMBER' }, summary: { type: 'STRING' } } } } });
        return JSON.parse(response.text.trim());
    } catch (error) { console.error("Error fetching crypto data:", error); return null; }
}

async function generateToolContent(env, type, topic) {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    let prompt;
    if (type === 'keywords') prompt = \`۱۰ کلمه کلیدی سئو مرتبط برای "\\\${topic}" تولید کن. آنها را با کاما جدا کن.\`;
    else if (type === 'webname') prompt = \`۵ نام وب‌سایت خلاقانه برای "\\\${topic}" پیشنهاد بده. آنها را در خطوط جدید لیست کن.\`;
    else if (type === 'domain') prompt = \`۵ نام دامنه در دسترس (.com, .ir) برای "\\\${topic}" پیشنهاد بده. آنها را در خطوط جدید لیست کن.\`;
    else if (type === 'article') prompt = \`یک مقاله کوتاه و جذاب (حدود ۱۵۰ کلمه) در مورد موضوع "\\\${topic}" بنویس.\`;
    else return null;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: type === 'article' ? [{googleSearch:{}}] : undefined } });
        return response.text;
    } catch (error) { console.error(\`Error generating tool content (\${type}):\`, error); return null; }
}

// --- DISCORD RESPONSE FORMATTING FUNCTIONS ---
function createHelpEmbed() {
    return { type: 4, data: { embeds: [{ title: "راهنمای ربات هوشمند", description: "از دستورات زیر استفاده کنید:", color: 0x00A0E8, fields: [
        { name: "/search [query] ...", value: "جستجوی پیشرفته اخبار.", inline: false },
        { name: "/factcheck [claim] [image]", value: "بررسی اعتبار یک ادعا یا تصویر.", inline: false },
        { name: "/analyze [topic]", value: "تحلیل عمیق یک موضوع.", inline: false },
        { name: "/crypto [coin]", value: "دریافت قیمت و اطلاعات ارز دیجیتال.", inline: false },
        { name: "/tools [subcommand] [topic]", value: "ابزارهای تولید محتوا (keywords, webname, domain, article).", inline: false },
        { name: "/stats [topic]", value: "جستجوی آمار معتبر.", inline: false },
        { name: "/science [topic]", value: "یافتن مقالات علمی.", inline: false },
        { name: "/religion [topic]", value: "جستجو در منابع دینی.", inline: false },
        { name: "/help", value: "نمایش این پیام راهنما.", inline: false },
    ]}]}};
}

// --- MAIN WORKER LOGIC ---
export default {
  async fetch(request, env, ctx) {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();
    const isValidRequest = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
    if (!isValidRequest) return new Response('Invalid request signature', { status: 401 });
    const interaction = JSON.parse(body);
    if (interaction.type === InteractionType.PING) {
      return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), { headers: { 'Content-Type': 'application/json' }});
    }
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = interaction.data.name;
      ctx.waitUntil((async () => {
            let responseEmbed;
            try {
                switch (commandName) {
                    case 'search': {
                        const filters = { query: getOption(interaction, 'query'), category: getOption(interaction, 'category'), region: getOption(interaction, 'region'), source: getOption(interaction, 'source') };
                        const news = await fetchNews(env, filters);
                        responseEmbed = news && news.length > 0 ? { embeds: news.slice(0, 3).map(article => ({ title: article.title, description: article.summary, url: article.link, color: 0x06b6d4, thumbnail: { url: article.imageUrl }, fields: [{ name: 'منبع', value: article.source, inline: true }, { name: 'اعتبار', value: article.credibility, inline: true }, { name: 'دسته', value: article.category, inline: true }], footer: { text: article.publicationTime } }))} : { embeds: [{ title: 'نتیجه‌ای یافت نشد', description: 'جستجوی شما نتیجه‌ای در بر نداشت.', color: 0xFFCC00 }]};
                        break;
                    }
                    case 'factcheck': {
                        const claim = getOption(interaction, 'claim');
                        const imageAttachment = getAttachment(interaction, 'image');
                        let imageFile = imageAttachment ? await urlToGenerativePart(imageAttachment.url) : null;
                        if (!claim && !imageFile) { responseEmbed = { embeds: [{ title: 'ورودی نامعتبر', description: 'لطفاً یک ادعای متنی یا یک فایل تصویر برای بررسی ارسال کنید.', color: 0xFFCC00 }]}; break; }
                        const result = await factCheck(env, claim, imageFile);
                        const colorMap = { 'بسیار معتبر': 0x00FF00, 'معتبر': 0xFFFF00, 'نیازمند بررسی': 0xFF0000 };
                        responseEmbed = result ? { embeds: [{ title: \`نتیجه فکت چک: \${result.overallCredibility}\`, description: result.summary, color: colorMap[result.overallCredibility] || 0x808080, fields: [{ name: 'منبع اولیه', value: \`[\${result.originalSource.name}](\${result.originalSource.link})\`, inline: true }, { name: 'تاریخ انتشار', value: result.originalSource.publicationDate, inline: true }]}]} : { embeds: [{ title: 'خطا در بررسی', description: 'متاسفانه امکان بررسی این مورد وجود ندارد.', color: 0xFF0000 }]};
                        break;
                    }
                    case 'stats': case 'science': case 'religion': {
                        const topic = getOption(interaction, 'topic');
                        const result = await fetchStructuredData(env, topic, commandName);
                        if (result) {
                            const fields = [];
                            if (result.sourceDetails.name) fields.push({ name: 'منبع', value: \`[\${result.sourceDetails.name}](\${result.sourceDetails.link})\`, inline: true });
                            if (result.sourceDetails.publicationDate) fields.push({ name: 'تاریخ انتشار', value: result.sourceDetails.publicationDate, inline: true });
                            if (result.sourceDetails.author) fields.push({ name: 'نویسنده', value: result.sourceDetails.author, inline: true });
                            responseEmbed = { embeds: [{ title: result.title, description: result.summary, color: 0x8b5cf6, fields: fields }]};
                        } else { responseEmbed = { embeds: [{ title: 'نتیجه‌ای یافت نشد', description: 'جستجوی شما نتیجه‌ای در بر نداشت.', color: 0xFFCC00 }]}; }
                        break;
                    }
                    case 'analyze': {
                        const topic = getOption(interaction, 'topic');
                        const result = await analyzeTopic(env, topic);
                        responseEmbed = result ? { embeds: [{ title: \`تحلیل موضوع: \${topic}\`, description: result.analysis, color: 0xbe185d, fields: result.keyPoints.map(p => ({name: p.title, value: p.description})) }] } : { embeds: [{ title: 'خطا در تحلیل', color: 0xFF0000 }] };
                        break;
                    }
                    case 'crypto': {
                        const coin = getOption(interaction, 'coin');
                        const result = await fetchCrypto(env, coin);
                        const change = result?.price_change_percentage_24h >= 0;
                        responseEmbed = result ? { embeds: [{ title: \`قیمت \${result.name} (\${result.symbol.toUpperCase()})\`, description: result.summary, color: 0xf59e0b, fields: [ { name: 'قیمت (دلار)', value: \`$\${result.price_usd.toLocaleString('en-US')}\`, inline: true }, { name: 'قیمت (تومان)', value: \`\${result.price_toman.toLocaleString('fa-IR')} تومان\`, inline: true }, { name: 'تغییر ۲۴ ساعته', value: \`\${change ? '📈' : '📉'} \${Math.abs(result.price_change_percentage_24h).toFixed(2)}%\`, inline: true } ] }] } : { embeds: [{ title: 'ارز یافت نشد', description: 'نام یا نماد ارز مورد نظر را به درستی وارد کنید.', color: 0xFF0000 }] };
                        break;
                    }
                    case 'tools': {
                        const subcommand = interaction.data.options[0].name;
                        const topic = getOption(interaction, 'topic');
                        const result = await generateToolContent(env, subcommand, topic);
                        const titleMap = { keywords: 'کلمات کلیدی سئو', webname: 'نام‌های پیشنهادی سایت', domain: 'دامنه‌های پیشنهادی', article: 'پیش‌نویس مقاله' };
                        responseEmbed = result ? { embeds: [{ title: \`\${titleMap[subcommand]} برای: \${topic}\`, description: result, color: 0x16a34a }] } : { embeds: [{ title: 'خطا در ابزار', color: 0xFF0000 }] };
                        break;
                    }
                }
            } catch (e) {
                console.error(e);
                responseEmbed = { embeds: [{ title: 'خطای داخلی', description: 'یک خطای پیش‌بینی نشده در ربات رخ داد.', color: 0xFF0000 }] };
            }
            const followupUrl = \`https://discord.com/api/v10/webhooks/\${env.DISCORD_APP_ID}/\${interaction.token}/messages/@original\`;
            await fetch(followupUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(responseEmbed) });
      })());
      if (interaction.data.name === 'help') {
        return new Response(JSON.stringify(createHelpEmbed()), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Unhandled interaction type', { status: 400 });
  },
};
`,

    discordBotRegisterCommandsJs: `// This is a script to register your bot's slash commands with Discord.
require('dotenv').config();
const fetch = require('node-fetch');

const { DISCORD_APP_ID, DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_APP_ID || !DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_APP_ID and DISCORD_BOT_TOKEN must be set in your .env file.");
}

const commands = [
  { name: 'help', description: 'نمایش لیست تمام دستورات و راهنمای ربات' },
  { name: 'search', description: 'جستجوی پیشرفته اخبار', options: [
      { name: 'query', description: 'موضوع یا کلیدواژه جستجو', type: 3, required: true },
      { name: 'category', description: 'دسته‌بندی خبر (مثال: سیاسی)', type: 3, required: false },
      { name: 'region', description: 'منطقه جغرافیایی (مثال: خاورمیانه)', type: 3, required: false },
      { name: 'source', description: 'نوع منبع (مثال: خارجی)', type: 3, required: false },
  ]},
  { name: 'factcheck', description: 'بررسی اعتبار یک ادعا یا یک تصویر', options: [
      { name: 'claim', description: 'ادعای متنی که می‌خواهید بررسی شود', type: 3, required: false },
      { name: 'image', description: 'تصویری که می‌خواهید بررسی و ردیابی شود', type: 11, required: false },
  ]},
  { name: 'stats', description: 'جستجوی آمار و داده‌های معتبر در مورد یک موضوع', options: [
      { name: 'topic', description: 'موضوع مورد نظر برای یافتن آمار', type: 3, required: true },
  ]},
  { name: 'science', description: 'یافتن مقالات و تحقیقات علمی مرتبط با یک موضوع', options: [
      { name: 'topic', description: 'موضوع علمی مورد نظر', type: 3, required: true },
  ]},
  { name: 'religion', description: 'جستجو در منابع معتبر دینی در مورد یک موضوع', options: [
      { name: 'topic', description: 'موضوع دینی مورد نظر', type: 3, required: true },
  ]},
  { name: 'analyze', description: 'تحلیل عمیق یک موضوع با استفاده از تحلیل‌گر هوشمند', options: [
      { name: 'topic', description: 'موضوع مورد نظر برای تحلیل', type: 3, required: true },
  ]},
  { name: 'crypto', description: 'دریافت اطلاعات و قیمت ارز دیجیتال', options: [
      { name: 'coin', description: 'نام یا نماد ارز دیجیتال (مثال: Bitcoin یا BTC)', type: 3, required: true },
  ]},
  { name: 'tools', description: 'استفاده از ابزارهای آنلاین تولید محتوا', options: [
      { name: 'keywords', description: 'تولید کلمات کلیدی سئو برای یک موضوع', type: 1, options: [{ name: 'topic', description: 'موضوع اصلی', type: 3, required: true }] },
      { name: 'webname', description: 'پیشنهاد نام برای وب‌سایت', type: 1, options: [{ name: 'topic', description: 'موضوع اصلی', type: 3, required: true }] },
      { name: 'domain', description: 'پیشنهاد نام دامنه برای یک موضوع', type: 1, options: [{ name: 'topic', description: 'موضوع اصلی', type: 3, required: true }] },
      { name: 'article', description: 'تولید پیش‌نویس مقاله برای یک موضوع', type: 1, options: [{ name: 'topic', description: 'موضوع اصلی', type: 3, required: true }] },
  ]},
];

const url = \`https://discord.com/api/v10/applications/\${DISCORD_APP_ID}/commands\`;

async function registerCommands() {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': \`Bot \${DISCORD_BOT_TOKEN}\` },
      body: JSON.stringify(commands),
    });
    if (response.ok) {
      console.log('Successfully registered commands!');
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('Error registering commands:');
      const error = await response.json();
      console.error(JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

registerCommands();
`,

    discordBotPackageJson: `{
  "name": "discord-bot-command-installer",
  "version": "1.0.0",
  "description": "A script to register slash commands for the Smart News Discord bot.",
  "main": "register-commands.js",
  "scripts": {
    "register": "node register-commands.js"
  },
  "dependencies": {
    "dotenv": "^16.3.1",
    "node-fetch": "^2.6.7"
  }
}
`,

    discordBotWranglerToml: `# Cloudflare Worker configuration file for the Discord Bot
name = "smart-news-discord-bot" # You can change this to your preferred worker name
main = "discord/worker.js"   # Path to your main worker script
compatibility_date = "2024-05-20"

# [vars]
# You should set these as encrypted secrets in the Cloudflare dashboard, not here.
# See the guide for instructions.
# DISCORD_PUBLIC_KEY = "your_public_key_here"
# DISCORD_BOT_TOKEN = "your_bot_token_here"
# GEMINI_API_KEY = "your_gemini_api_key_here"
`,
    
    // --- NEW CLOUDFLARE DB WORKER FILES ---
    cloudflareDbWorkerJs: `// Cloudflare Worker for saving and retrieving application settings from a D1 database.
// This acts as a secure API endpoint for the frontend application.

export default {
  async fetch(request, env, ctx) {
    // Add CORS headers to allow requests from any origin
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== \`Bearer \${env.WORKER_TOKEN}\`) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
    
    const url = new URL(request.url);

    if (url.pathname === '/settings') {
      if (request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare(
            "SELECT value FROM settings WHERE key = 'app-settings'"
          ).all();

          if (results && results.length > 0) {
            return new Response(results[0].value, {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({ message: 'No settings found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (e) {
          return new Response(e.message, { status: 500, headers: corsHeaders });
        }
      }

      if (request.method === 'POST') {
        try {
          const settings = await request.json();
          await env.DB.prepare(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('app-settings', ?)"
          )
          .bind(JSON.stringify(settings))
          .run();

          return new Response('Settings saved successfully', { status: 200, headers: corsHeaders });
        } catch (e) {
            return new Response(e.message, { status: 500, headers: corsHeaders });
        }
      }
    }
    
    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
};
`,
    cloudflareDbSchemaSql: `-- SQL schema for the Cloudflare D1 database.
-- This creates tables for settings, RSS feeds, and RSS articles.

-- Drop tables if they exist to start fresh (optional)
DROP TABLE IF EXISTS rss_articles;
DROP TABLE IF EXISTS rss_feeds;
DROP TABLE IF EXISTS settings;

-- Create the settings table (simple key-value)
CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings (key);

-- Create the RSS feeds table
CREATE TABLE rss_feeds (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create the RSS articles table
CREATE TABLE rss_articles (
    id TEXT PRIMARY KEY NOT NULL,
    feed_id TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL UNIQUE,
    summary TEXT,
    publication_time TEXT,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_sent INTEGER DEFAULT 0,
    FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE
);
`,
    cloudflareDbWranglerToml: `# Cloudflare Worker configuration file for the settings/database API.
# This file is used by the Wrangler CLI to deploy your worker.

name = "smart-news-settings-api" # You can change this to your preferred worker name
main = "path/to/your/db-worker.js"   # IMPORTANT: Update this path to where you saved the worker script
compatibility_date = "2024-05-20"

# D1 Database Binding
# This links your D1 database to the worker script, making it available on \`env.DB\`.
[[d1_databases]]
binding = "DB"                # The name of the binding in your worker code (env.DB)
database_name = "smart-news-db" # The name of your D1 database in the Cloudflare dashboard
database_id = ""              # The ID of your D1 database. Fill this in after creating the DB.
`,
    // --- NEW APPWRITE INTEGRATION FILES ---

    appwriteGuideMd: `# راهنمای کامل راه‌اندازی بک‌اند با Appwrite (بدون نیاز به CLI)
این راهنما شما را برای استقرار یک بک‌اند کامل برای ذخیره تمام داده‌های برنامه راهنمایی می‌کند.
---
### بخش اول: ساخت پروژه و دیتابیس
1.  **ساخت پروژه:** وارد [Appwrite Cloud](https://cloud.appwrite.io/) شوید و یک پروژه جدید (Create Project) بسازید.
2.  **ذخیره اطلاعات پروژه:** از منوی سمت چپ به **Settings** بروید. مقادیر \`Project ID\` و \`API Endpoint\` را کپی کرده و در فیلدهای مربوطه در همین صفحه وارد کنید.
3.  **ساخت دیتابیس:** از منوی سمت چپ به بخش **Databases** بروید. یک دیتابیس جدید (Create Database) بسازید و نام آن را \`Main Database\` بگذارید. **Database ID** را کپی کرده و در فیلد مربوطه در این صفحه وارد کنید.
---
### بخش دوم: ساخت کالکشن‌ها (Collections)
وارد دیتابیسی که ساختید شوید و کالکشن‌های زیر را با دقت ایجاد کنید. برای هر کالکشن، پس از ساخت، به تب **Settings** آن رفته و به رول \`any\` تمام دسترسی‌های **Create, Read, Update, Delete** را بدهید.

#### 1. کالکشن **app_settings**
*   **Collection ID:** \`app_settings\` (این را در فیلد مربوطه وارد کنید)
*   **Attributes:**
    *   \`content\` (Type: String, Size: 1000000, Required: Yes)

#### 2. کالکشن **search_history**
*   **Collection ID:** \`search_history\`
*   **Attributes:**
    *   \`item_type\` (Type: String, Size: 50, Required: Yes)
    *   \`query_text\` (Type: String, Size: 10000, Required: Yes)
    *   \`result_summary\` (Type: String, Size: 10000, Required: No)
    *   \`is_favorite\` (Type: Boolean, Required: Yes, Default: false)

#### 3. کالکشن **chat_messages**
*   **Collection ID:** \`chat_history\` (این را در فیلد Chat History وارد کنید)
*   **Attributes:**
    *   \`sessionId\` (Type: String, Size: 36, Required: Yes)
    *   \`role\` (Type: String, Size: 10, Required: Yes)
    *   \`text\` (Type: String, Size: 10000, Required: Yes)
    *   \`timestamp\` (Type: Datetime, Required: Yes)
*   **Indexes:**
    *   \`sessionId_idx\` (Key: \`sessionId\`, Type: \`key\`)

#### 4. کالکشن **rss_feeds**
*   **Collection ID:** \`rss_feeds\`
*   **Attributes:**
    *   \`name\` (Type: String, Size: 255, Required: Yes)
    *   \`url\` (Type: URL, Size: 512, Required: Yes)
    *   \`category\` (Type: String, Size: 50, Required: Yes)
*   **Indexes:**
    *   \`url_unique\` (Key: \`url\`, Type: \`unique\`)

#### 5. کالکشن **rss_articles**
*   **Collection ID:** \`rss_articles\`
*   **Attributes:**
    *   \`feed_id\` (Type: String, Size: 36, Required: Yes)
    *   \`title\` (Type: String, Size: 512, Required: Yes)
    *   \`link\` (Type: URL, Size: 1024, Required: Yes)
    *   \`summary\` (Type: String, Size: 10000, Required: No)
    *   \`is_sent\` (Type: Boolean, Required: Yes, Default: false)
*   **Indexes:**
    *   \`link_unique\` (Key: \`link\`, Type: \`unique\`)
---
### بخش سوم: ساخت کلید API
1.  از منوی اصلی پروژه (گوشه پایین سمت چپ) به بخش **API Keys** بروید.
2.  یک کلید API جدید (Create API Key) بسازید.
3.  یک نام برای آن انتخاب کنید و در بخش **Scopes**، تیک **\`databases\`** را بزنید.
4.  پس از ساخت، **API Key Secret** را کپی کرده و در فیلد \`API Key\` در این صفحه وارد کنید.
---
### بخش چهارم: اتصال نهایی
پس از وارد کردن تمام اطلاعات در فرم این صفحه، روی دکمه **"ذخیره و تست اتصال"** کلیک کنید.`,

    appwriteJson: `{
  "projectId": "YOUR_PROJECT_ID",
  "projectName": "Smart News Search",
  "databases": [
    {
      "$id": "main-db",
      "name": "Main Database",
      "collections": [
        {
          "$id": "settings-collection",
          "name": "Settings",
          "documentSecurity": false,
          "permissions": ["role:all"],
          "attributes": [
            { "key": "content", "type": "string", "status": "available", "required": true, "size": 1000000 }
          ],
          "indexes": []
        },
        {
          "$id": "news-articles-collection",
          "name": "News Articles",
          "documentSecurity": false,
          "permissions": ["role:all"],
          "attributes": [
            { "key": "title", "type": "string", "status": "available", "required": true, "size": 255 },
            { "key": "link", "type": "string", "status": "available", "required": true, "size": 512 },
            { "key": "summary", "type": "string", "status": "available", "required": false, "size": 10000 },
            { "key": "sourceName", "type": "string", "status": "available", "required": false, "size": 100 },
            { "key": "category", "type": "string", "status": "available", "required": false, "size": 50 },
            { "key": "publicationTime", "type": "string", "status": "available", "required": false, "size": 50 }
          ],
          "indexes": [
            { "key": "link_unique", "type": "unique", "status": "available", "attributes": ["link"], "orders": ["ASC"] }
          ]
        },
        {
          "$id": "chat-history-collection",
          "name": "Chat History",
          "documentSecurity": false,
          "permissions": ["role:all"],
          "attributes": [
            { "key": "sessionId", "type": "string", "status": "available", "required": true, "size": 36 },
            { "key": "role", "type": "string", "status": "available", "required": true, "size": 10 },
            { "key": "text", "type": "string", "status": "available", "required": true, "size": 10000 },
            { "key": "timestamp", "type": "datetime", "status": "available", "required": true }
          ],
          "indexes": [
            { "key": "session_index", "type": "key", "status": "available", "attributes": ["sessionId"], "orders": ["ASC"] }
          ]
        }
      ]
    }
  ],
  "functions": []
}`,
    appwriteTelegramFuncJs: `const TelegramBot = require('node-telegram-bot-api');

// This is a simplified version for an Appwrite function.
// In a real scenario, you would import Gemini logic from another file.
async function getNewsFromGemini() {
    // Placeholder - In a real function, you would call the Gemini API here.
    return {
        title: "خبر نمونه از Appwrite",
        source: "تابع سرورلس",
        summary: "این یک خبر نمونه است که توسط تابع Appwrite برای شما ارسال شده است.",
        link: "https://appwrite.io"
    };
}

module.exports = async (req, res) => {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

    try {
        const update = JSON.parse(req.body);
        
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const text = message.text;

            if (text === '/start') {
                await bot.sendMessage(chatId, 'سلام! ربات هوشمند اخبار (نسخه Appwrite) آماده است. برای دریافت آخرین اخبار /news را ارسال کنید.');
            } else if (text === '/news') {
                await bot.sendMessage(chatId, 'در حال جستجوی آخرین اخبار...');
                const article = await getNewsFromGemini();
                const formattedMessage = \`*\\\${article.title}*\\n\\n*منبع:* \\\${article.source}\\n\\n\\\${article.summary}\\n\\n[مشاهده خبر](\\\${article.link})\`;
                await bot.sendMessage(chatId, formattedMessage, { parse_mode: 'Markdown' });
            }
        }
        
        res.json({ success: true, message: "Update processed." });

    } catch (error) {
        console.error('Error processing Telegram update:', error);
        res.json({ success: false, error: error.message }, 500);
    }
};
`,
    
    appwriteDiscordFuncJs: `const { InteractionResponseType, InteractionType, verifyKey } = require('discord-interactions');

// This function is an adaptation of the Cloudflare Worker for Discord.
// It is designed to run in an Appwrite Node.js environment.

// NOTE: You would need to implement the Gemini helper functions (fetchNews, etc.) here as well.
// For brevity, we will assume they exist and return placeholder data.

async function handleInteraction(interaction, env) {
    if (interaction.type === InteractionType.PING) {
        return { type: InteractionResponseType.PONG };
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const commandName = interaction.data.name;
        if (commandName === 'help') {
             return {
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: "این ربات هوشمند اخبار است. از دستور /search برای جستجو استفاده کنید." },
            };
        }
        if (commandName === 'search') {
            // Placeholder for Gemini API call
            return {
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    embeds: [{
                        title: "نتیجه جستجو (نمونه Appwrite)",
                        description: "جستجوی شما برای 'موضوع نمونه' نتیجه زیر را در بر داشت.",
                        color: 0x06b6d4,
                    }]
                },
            };
        }
    }
    return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "دستور ناشناخته." },
    };
}

module.exports = async (req, res) => {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const body = req.bodyRaw; // Appwrite provides the raw body here

    const isValidRequest = verifyKey(
        body,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
        return res.json({ error: 'Invalid request signature' }, 401);
    }
    
    const interaction = JSON.parse(body);
    const responsePayload = await handleInteraction(interaction, process.env);
    
    return res.json(responsePayload);
};
`,

    appwritePackageJson: `{
  "name": "appwrite-functions",
  "version": "1.0.0",
  "description": "Dependencies for Smart News Appwrite functions.",
  "main": "index.js",
  "dependencies": {
    "@google/genai": "^0.1.0",
    "node-telegram-bot-api": "^0.61.0",
    "discord-interactions": "^3.4.0",
    "node-fetch": "^2.6.7"
  }
}
`,

    // --- NEW CPANEL INSTALLATION FILES ---
    cpanelGuideMd: `# راهنمای نصب و راه‌اندازی در سی‌پنل (cPanel)

این راهنما شما را قدم به قدم برای استقرار کامل برنامه (شامل فرانت‌اند، بک‌اند و دیتابیس) روی یک هاست اشتراکی که از cPanel استفاده می‌کند، راهنمایی می‌کند.

---

### بخش اول: پیش‌نیازها

قبل از شروع، اطمینان حاصل کنید که هاست شما موارد زیر را پشتیبانی می‌کند:

1.  **دسترسی به File Manager:** برای آپلود فایل‌های برنامه.
2.  **دیتابیس MySQL:** برای ساخت و مدیریت دیتابیس از طریق ابزارهایی مانند "MySQL Databases" و "phpMyAdmin".
3.  **(اختیاری) پشتیبانی از Node.js:** اگر می‌خواهید بک‌اند و ربات‌های تلگرام/دیسکورد را روی هاست خود اجرا کنید، باید از طریق ابزار "Setup Node.js App" این قابلیت در هاست شما فعال باشد. اگر این قابلیت را ندارید، همچنان می‌توانید بخش فرانت‌اند برنامه را راه‌اندازی کنید.

---

### بخش دوم: راه‌اندازی دیتابیس

1.  **ساخت دیتابیس:**
    *   وارد cPanel شوید و به بخش "MySQL Databases" بروید.
    *   یک دیتابیس جدید بسازید (مثلاً \`myuser_smartnews\`). نام آن را یادداشت کنید.
    *   کمی پایین‌تر، یک کاربر جدید برای دیتابیس بسازید (مثلاً \`myuser_botuser\`) و یک رمز عبور قوی برای آن تعیین کنید. نام کاربری و رمز را یادداشت کنید.
    *   در بخش "Add User To Database"، کاربری که ساختید را به دیتابیس خود اضافه کرده و در صفحه بعد، تیک **"ALL PRIVILEGES"** را بزنید تا تمام دسترسی‌های لازم به کاربر داده شود.

2.  **وارد کردن جداول (Import Tables):**
    *   فایل \`database_schema.sql\` را از همین صفحه دانلود کنید.
    *   به صفحه اصلی cPanel برگردید و وارد "phpMyAdmin" شوید.
    *   از منوی سمت چپ، دیتابیسی که در مرحله قبل ساختید را انتخاب کنید.
    *   از تب‌های بالا، روی "Import" کلیک کنید.
    *   روی "Choose File" کلیک کرده و فایل \`database_schema.sql\` را انتخاب کنید.
    *   در پایین صفحه، روی دکمه "Go" یا "Import" کلیک کنید. جداول برنامه باید با موفقیت ساخته شوند.

---

### بخش سوم: استقرار فرانت‌اند (بخش اصلی برنامه)

1.  **آپلود فایل‌ها:**
    *   وارد "File Manager" در cPanel شوید.
    *   به پوشه \`public_html\` یا هر دامنه‌ای که می‌خواهید برنامه روی آن نصب شود، بروید.
    *   فایل‌های \`index.html\` و پوشه \`build\` (شامل \`index.js\`) را از کامپیوتر خود در این محل آپلود کنید.

2.  **تنظیم کلید API جمینای:**
    *   **مهم:** از آنجایی که این یک برنامه فرانت‌اند است، کلید API شما در کد جاوااسکریپت قابل مشاهده خواهد بود.
    *   فایل \`build/index.js\` را در File Manager باز کرده و ویرایش (Edit) کنید.
    *   به دنبال عبارت \`process.env.API_KEY\` بگردید و آن را با کلید API جمینای واقعی خود جایگزین کنید (آن را داخل گیومه "" قرار دهید).
    *   تغییرات را ذخیره کنید.

**تبریک!** بخش اصلی برنامه شما اکنون روی دامنه شما فعال است و باید کار کند.

---

### بخش چهارم: (اختیاری) راه‌اندازی بک‌اند و ربات‌ها

اگر هاست شما از Node.js پشتیبانی می‌کند، مراحل زیر را دنبال کنید:

1.  **دانلود و پیکربندی فایل‌ها:**
    *   فایل‌های \`server.js\` و \`package.json\` را از تب "بک‌اند و دیتابیس" دانلود کنید.
    *   فایل \`config.js.example\` را از همین صفحه دانلود کرده، نام آن را به \`config.js\` تغییر دهید.
    *   فایل \`config.js\` را باز کرده و اطلاعات دیتابیس (که در بخش دوم یادداشت کردید) و کلیدهای API ربات‌ها را در آن وارد کنید.

2.  **آپلود و نصب:**
    *   در File Manager، یک پوشه جدید خارج از \`public_html\` بسازید (مثلاً \`smartnews_backend\`).
    *   فایل‌های \`server.js\`, \`package.json\` و \`config.js\` را در این پوشه آپلود کنید.
    *   به صفحه اصلی cPanel برگردید و وارد "Setup Node.js App" شوید.
    *   یک اپلیکیشن جدید بسازید، مسیر آن را به پوشه‌ای که ساختید (\`smartnews_backend\`) تغییر دهید و نسخه Node.js را روی 18 یا بالاتر تنظیم کنید.
    *   پس از ساخت اپلیکیشن، روی دکمه "NPM Install" کلیک کنید تا وابستگی‌ها نصب شوند.
    *   در نهایت، روی "Start App" کلیک کنید. بک‌اند شما اکنون فعال است.

---

### توضیح در مورد نصب خودکار

یک برنامه کاملاً فرانت‌اند (مانند این پروژه) به دلایل امنیتی نمی‌تواند به صورت خودکار به هاست شما متصل شده، دیتابیس بسازد یا فایل‌ها را مدیریت کند. این کارها نیازمند دسترسی‌های سمت سرور هستند.

روش ارائه شده در این راهنما (پیکربندی دستی) **استانداردترین و امن‌ترین** روش برای استقرار چنین برنامه‌هایی در محیط cPanel است. فرمی که برای نصب خودکار درخواست کرده‌اید، نیازمند یک اسکریپت نصب جداگانه (معمولاً با PHP) است که خارج از محدوده این برنامه قرار دارد.`,

    databaseSchemaSql: `CREATE TABLE IF NOT EXISTS \`app_settings\` (
  \`setting_key\` varchar(50) NOT NULL,
  \`settings_json\` LONGTEXT NOT NULL,
  \`last_updated\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`setting_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`credentials\` (
  \`service_name\` varchar(50) NOT NULL,
  \`config_json\` TEXT NOT NULL,
  \`last_updated\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`service_name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`search_history\` (
  \`id\` varchar(36) NOT NULL,
  \`item_type\` varchar(50) NOT NULL,
  \`query_text\` text NOT NULL,
  \`result_summary\` text,
  \`is_favorite\` tinyint(1) DEFAULT 0,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`rss_feeds\` (
    \`id\` varchar(36) NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`url\` varchar(512) NOT NULL,
    \`category\` varchar(50) NOT NULL,
    \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`url\` (\`url\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`rss_articles\` (
    \`id\` varchar(36) NOT NULL,
    \`feed_id\` varchar(36) NOT NULL,
    \`title\` varchar(512) NOT NULL,
    \`link\` varchar(1024) NOT NULL,
    \`summary\` text,
    \`publication_time\` varchar(100) DEFAULT NULL,
    \`fetched_at\` timestamp NOT NULL DEFAULT current_timestamp(),
    \`is_sent\` tinyint(1) DEFAULT 0,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`link\` (\`link\`),
    KEY \`feed_id\` (\`feed_id\`),
    CONSTRAINT \`rss_articles_ibfk_1\` FOREIGN KEY (\`feed_id\`) REFERENCES \`rss_feeds\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`chat_sessions\` (
  \`id\` varchar(36) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`timestamp\` bigint(20) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`chat_messages\` (
  \`id\` varchar(36) NOT NULL,
  \`session_id\` varchar(36) NOT NULL,
  \`role\` varchar(10) NOT NULL,
  \`text\` text NOT NULL,
  \`timestamp\` bigint(20) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`session_id\` (\`session_id\`),
  CONSTRAINT \`chat_messages_ibfk_1\` FOREIGN KEY (\`session_id\`) REFERENCES \`chat_sessions\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`analysis_results\` (
  \`id\` varchar(36) NOT NULL,
  \`topic\` text NOT NULL,
  \`analysis_type\` varchar(50) DEFAULT NULL,
  \`result_json\` longtext NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
`,

    backendConfigJsExample: `// config.js.example - Rename this file to config.js and fill in your details.

module.exports = {
    // Database Configuration for cPanel
    database: {
        host: 'localhost',         // Usually 'localhost' on cPanel
        user: 'YOUR_CPANELUSER_DBUSER',
        password: 'YOUR_DB_PASSWORD',
        database: 'YOUR_CPANELUSER_DBNAME'
    },
    // Application Admin Credentials (for a potential future admin panel)
    admin: {
        username: 'admin',
        password: 'SET_A_STRONG_PASSWORD'
    },
    // API Keys and Tokens
    // It's still more secure to use environment variables if your host supports them.
    api_keys: {
        gemini: 'YOUR_GEMINI_API_KEY',
        telegram_bot_token: 'YOUR_TELEGRAM_BOT_TOKEN',
        discord_webhook_url: 'YOUR_DISCORD_WEBHOOK_URL',
    }
};
`,
    
    twitterBotWorkerJs: `/**
 * Cloudflare Worker for a Twitter Bot (run on a schedule)
 *
 * This worker fetches news and posts it as a tweet.
 * NOTE: Twitter API v1.1 for posting tweets requires complex OAuth 1.0a authentication.
 * This script provides the structure, but you must implement the \`postTweet\` function.
 *
 * How to use:
 * 1. Deploy this code to a Cloudflare Worker.
 * 2. Set the following secrets in the worker settings:
 *    - GEMINI_API_KEY
 *    - TWITTER_API_KEY
 *    - TWITTER_API_SECRET_KEY
 *    - TWITTER_ACCESS_TOKEN
 *    - TWITTER_ACCESS_TOKEN_SECRET
 * 3. Go to the worker's "Triggers" tab and add a "Cron Trigger".
 *    - For every hour: 0 * * * *
 *    - For every 6 hours: 0 */6 * * *
 */

addEventListener('scheduled', event => {
  event.waitUntil(handleSchedule(event));
});

async function handleSchedule(event) {
  console.log("Cron trigger fired. Fetching news to tweet...");
  try {
    const article = await fetchLatestNews();
    if (article) {
      const tweetText = \`\${article.title.substring(0, 250)}... #اخبار #خبر\\n\\n\${article.link}\`;
      await postTweet(tweetText);
      console.log("Successfully tweeted:", tweetText);
    } else {
      console.log("No new article found to tweet.");
    }
  } catch (error) {
    console.error("Error during scheduled tweet:", error);
  }
}

/**
 * Posts a tweet using the Twitter API v1.1.
 * !! AUTHENTICATION IMPLEMENTATION REQUIRED !!
 * @param {string} status - The text of the tweet.
 */
async function postTweet(status) {
  const endpointURL = 'https://api.twitter.com/1.1/statuses/update.json';
  
  // Twitter API v1.1 requires OAuth 1.0a, which is complex to implement from scratch.
  // This typically requires a library. In a Node.js environment, you'd use 'twitter-api-v2'.
  // In a Cloudflare Worker, you would need to implement this using the Web Crypto API,
  // which involves generating a signature from your keys and the request parameters.

  // This is a placeholder showing what the final fetch would look like.
  // The 'Authorization' header is the part you need to build.
  
  console.log("--- PLACEHOLDER: Tweet not sent ---");
  console.log("To implement this, you must build the OAuth 1.0a Authorization header.");
  console.log("Tweet content:", status);
  
  /*
  const response = await fetch(\`\${endpointURL}?status=\${encodeURIComponent(status)}\`, {
    method: 'POST',
    headers: {
      // Example: 'Authorization': 'OAuth oauth_consumer_key="...", oauth_nonce="...", ...'
      // This header is the complex part that needs to be generated.
      'Authorization': generateOAuthHeader(), 
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`Twitter API Error: \${JSON.stringify(error)}\`);
  }
  
  return response.json();
  */
  return Promise.resolve({ "message": "Tweet not sent (placeholder)" });
}

async function fetchLatestNews() {
    const prompt = "Find the single most important recent world news article for a Persian-speaking user. Provide a very short, compelling title suitable for a tweet, and a direct link. The output must be JSON with 'title' and 'link' keys.";
    
    const body = {
      contents: [{ parts: [{ "text": prompt }] }],
      "generationConfig": { "response_mime_type": "application/json" }
    };
    
    const url = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${GEMINI_API_KEY}\`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
  
      const data = await response.json();
      const jsonString = data.candidates[0].content.parts[0].text;
      const result = JSON.parse(jsonString);
      const article = Array.isArray(result) ? result[0] : result;
      // Basic validation
      if (article && article.title && article.link) {
          return article;
      }
      return null;
      
    } catch (error) {
      console.error("Error fetching news from Gemini for Twitter:", error);
      return null;
    }
}
`,
};