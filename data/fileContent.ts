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
    bot.sendMessage(chatId, 'سلام! ربات هوشمند اخبار آماده است. برای دریافت آخرین اخبار /news را ارسال کنید.');
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
    
    schemaSql: `-- Basic SQL schema for the Smart News Search application
-- This can be used with PostgreSQL, MySQL, or SQLite.

-- Table to store news sources, categorized for better management.
CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK(category IN ('fact-check', 'news-agencies', 'social-media', 'financial', 'analytical')),
    field TEXT,
    activity TEXT,
    credibility TEXT,
    region TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store fetched news articles to avoid duplicates and for archiving.
CREATE TABLE IF NOT EXISTS articles (
    link TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    source_id TEXT,
    publication_time TEXT,
    category TEXT,
    image_url TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- Table to store application settings as key-value pairs.
-- This allows for flexible storage of settings without changing the schema.
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example of inserting a source:
-- INSERT INTO sources (id, name, url, category, field, credibility, region)
-- VALUES ('uuid-1234', 'خبرگزاری ایسنا', 'https://www.isna.ir', 'news-agencies', 'سیاسی، اجتماعی', 'بالا', 'ایران');

-- Example of inserting an article:
-- INSERT INTO articles (link, title, summary, source_id, publication_time, category)
-- VALUES ('https://www.isna.ir/news/1234', 'عنوان خبر مهم', 'خلاصه خبر...', 'uuid-1234', '۱۴۰۴/۰۱/۰۱ - ۱۲:۰۰', 'سیاسی');

-- Example of storing a setting:
-- INSERT INTO settings (key, value)
-- VALUES ('theme', '{"id":"neon-dreams","name":"رویای نئونی","className":"theme-neon-dreams"}');
`,
    
    wranglerToml: `# Cloudflare Worker configuration file
# This file is used by the Wrangler CLI to deploy your worker.
# See https://developers.cloudflare.com/workers/wrangler/configuration/

name = "smart-news-telegram-bot" # You can change this to your preferred worker name
main = "cloudflare/worker.js"   # Path to your main worker script
compatibility_date = "2024-05-15"
`,

    workerJs: `/**
 * Cloudflare Worker for a Telegram Bot
 *
 * How to use:
 * 1. Create a new Worker in your Cloudflare dashboard.
 * 2. Copy and paste this code into the Worker's editor.
 * 3. Go to the Worker's settings and add the following secrets:
 *    - \`TELEGRAM_BOT_TOKEN\`: Your token from BotFather.
 *    - \`GEMINI_API_KEY\`: Your Google Gemini API key.
 * 4. Deploy the Worker.
 * 5. Set the Telegram webhook to point to your Worker's URL. You can do this by visiting the following URL in your browser:
 *    https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<YOUR_WORKER_NAME>.<YOUR_SUBDOMAIN>.workers.dev/
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'POST') {
    try {
      const update = await request.json();
      await handleUpdate(update);
      return new Response('OK', { status: 200 });
    } catch (e) {
      console.error('Error processing update:', e);
      return new Response('Error', { status: 500 });
    }
  }
  return new Response('This worker only accepts POST requests for Telegram webhooks.', { status: 405 });
}

async function handleUpdate(update) {
  if (update.message) {
    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text;

    if (text === '/start') {
      await sendMessage(chatId, 'سلام! ربات هوشمند اخبار آماده است. برای دریافت آخرین اخبار /news را ارسال کنید.');
    } else if (text === '/news') {
      await sendMessage(chatId, 'در حال جستجوی آخرین اخبار جهان...');
      const news = await fetchNewsFromGemini();
      if (news && news.length > 0) {
        const firstArticle = news[0];
        const formattedMessage = \`*\${firstArticle.title}*\\n\\n*منبع:* \${firstArticle.source}\\n\\n\${firstArticle.summary}\\n\\n[مشاهده خبر](\${firstArticle.link})\`;
        await sendMessage(chatId, formattedMessage, 'Markdown');
      } else {
        await sendMessage(chatId, 'متاسفانه در حال حاضر مشکلی در دریافت اخبار وجود دارد.');
      }
    }
  }
}

async function sendMessage(chatId, text, parseMode = '') {
  const url = \`https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage\`;
  const payload = {
    chat_id: chatId,
    text: text,
  };
  if (parseMode) {
    payload.parse_mode = parseMode;
  }
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function fetchNewsFromGemini() {
  // This is a simplified call to the Gemini API.
  // In a real scenario, you'd use the full schema and prompt structure from the main app.
  const prompt = "Find the single most important recent world news article for a Persian-speaking user. Provide title, summary, source, and link.";
  
  const body = {
    contents: [{
      parts: [{ "text": prompt }]
    }],
    "generationConfig": {
        "response_mime_type": "application/json",
    }
  };
  
  const url = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${GEMINI_API_KEY}\`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    // The response structure might be complex. This is a simplified extraction.
    const jsonString = data.candidates[0].content.parts[0].text;
    // The model might return a single object or an array. Let's handle both.
    const result = JSON.parse(jsonString);
    return Array.isArray(result) ? result : [result];
    
  } catch (error) {
    console.error("Error fetching news from Gemini:", error);
    return null;
  }
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

### ۴. نوار اخبار متحرک (News Ticker)
- **نمایش پویا:** نمایش مهم‌ترین عناوین خبری به صورت متحرک در بالای صفحه.
- **شخصی‌سازی کامل:** تنظیم سرعت، جهت حرکت (چپ به راست و بالعکس) و رنگ متن.

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

### ۴. تنظیمات هوش مصنوعی
- **شخصی‌سازی رفتار AI:** تعریف دستورالعمل‌های متنی دقیق برای وظایف مختلف (فکت-چک، جستجو، نوار اخبار و...).
- **تست دستورالعمل:** قابلیت تست کارایی دستورالعمل‌ها قبل از استفاده نهایی.
- **مدیریت مدل‌ها:** تنظیمات مربوط به API Key برای سرویس‌دهنده‌های مختلف AI (Gemini, OpenAI و...).

### ۵. اتصالات و پلتفرم‌ها (Integrations)
- **ارسال به شبکه‌های اجتماعی:** اتصال به تلگرام، دیسکورد و توییتر برای ارسال خودکار اخبار.
- **اتصال به وب‌سایت:** یکپارچه‌سازی با پلتفرم چت Grupo.
- **اتصال به BaaS:** تنظیمات اولیه برای اتصال به پلتفرم‌های Appwrite و Supabase.

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
`
};