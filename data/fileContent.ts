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
 * This worker can handle both standard Telegram webhooks and custom test messages
 * from the application's settings panel for verification.
 *
 * How to use:
 * 1. Create a new Worker in your Cloudflare dashboard.
 * 2. Copy and paste this code into the Worker's editor.
 * 3. Go to the Worker's settings and add the following secrets:
 *    - \`TELEGRAM_BOT_TOKEN\`: Your token from BotFather.
 *    - \`GEMINI_API_KEY\`: Your Google Gemini API key.
 * 4. Deploy the Worker.
 * 5. Use the Webhook Setup Tool in the app's Cloudflare settings tab to set the webhook.
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Add CORS headers for the test message functionality
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

      // Differentiate between a Telegram update and a custom test message
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

/**
 * Handles incoming updates from the Telegram webhook.
 * @param {object} update - The Telegram update object.
 */
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

/**
 * Handles a test message request from the application's UI.
 * @param {object} testPayload - The payload containing chat_id and text.
 */
async function handleTestMessage(testPayload) {
    const { chat_id, text } = testPayload;
    if (chat_id && text) {
        await sendMessage(chat_id, text);
    } else {
        // This will cause the worker to return a 500 error, indicating a problem.
        throw new Error('Invalid test message payload received.');
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
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send message to Telegram:", errorData);
  }
}

async function fetchNewsFromGemini() {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const jsonString = data.candidates[0].content.parts[0].text;
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

/**
 * A simple utility function to get an option value from the interaction data.
 * @param {object} interaction - The interaction object from Discord.
 * @param {string} name - The name of the option to retrieve.
 * @returns {string | undefined} The value of the option or undefined if not found.
 */
function getOption(interaction, name) {
  const options = interaction.data.options;
  if (options) {
    const option = options.find((opt) => opt.name === name);
    if (option) {
      return option.value;
    }
  }
  return undefined;
}

/**
 * A utility function to get an attachment from the interaction data.
 * @param {object} interaction - The interaction object from Discord.
 * @param {string} name - The name of the attachment option.
 * @returns {object | undefined} The attachment object or undefined.
 */
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


/**
 * Converts an image from a URL to a base64 string.
 * @param {string} url - The URL of the image.
 * @returns {Promise<{data: string, mimeType: string} | null>} Base64 data and MIME type.
 */
async function urlToGenerativePart(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(\`Failed to fetch image: \${response.statusText}\`);
        }
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

// NOTE: The prompts and schemas below are adapted from the main web application's
// geminiService.ts file to work within this JavaScript worker environment.

/**
 * Fetches news articles from Gemini based on filters.
 * @param {object} env - The Cloudflare worker environment/secrets.
 * @param {object} filters - The search filters.
 * @returns {Promise<object[]>} A promise that resolves to an array of news articles.
 */
async function fetchNews(env, filters) {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = \`
    IMPORTANT: All output text (titles, summaries, etc.) MUST be in Persian.
    Please find the top 5 recent news articles based on these criteria for a Persian-speaking user.
    - Search Query: "\${filters.query || 'مهمترین اخبار روز'}"
    - Category: "\${filters.category || 'any'}"
    - Region: "\${filters.region || 'any'}"
    - Source: "\${filters.source || 'any reputable source'}"
    For each article, you MUST provide a relevant image URL.
  \`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              summary: { type: 'STRING' },
              source: { type: 'STRING' },
              publicationTime: { type: 'STRING' },
              credibility: { type: 'STRING' },
              link: { type: 'STRING' },
              category: { type: 'STRING' },
              imageUrl: { type: 'STRING' },
            },
          },
        },
      },
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error fetching news from Gemini:", error);
    return null;
  }
}

/**
 * Performs a fact-check using Gemini.
 * @param {object} env - The Cloudflare worker environment/secrets.
 * @param {string} claim - The text claim to check.
 * @param {object} imageFile - The image file to check.
 * @returns {Promise<object>} A promise that resolves to the fact-check result.
 */
async function factCheck(env, claim, imageFile) {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const textPrompt = \`
        As a world-class investigative journalist, conduct a deep analysis of the following content. Your entire output MUST be in Persian and structured as JSON.
        **Your Mission:**
        1.  **Trace the Origin:** Find the EARLIEST verifiable instance of this claim/media.
        2.  **Analyze the Source:** Evaluate the credibility of the original source.
        3.  **Verify the Content:** Fact-check the claim using independent, high-credibility sources.
        4.  **Summarize Findings:** Provide a clear, concise verdict and summary.
        **Content for Analysis:**
        - Text Context: "\${claim || 'No text provided, analyze the image.'}"
    \`;

    const contentParts = [{ text: textPrompt }];
    if (imageFile) {
        contentParts.push({
            inlineData: {
                data: imageFile.data,
                mimeType: imageFile.mimeType,
            }
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contentParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        overallCredibility: { type: 'STRING', enum: ['بسیار معتبر', 'معتبر', 'نیازمند بررسی'] },
                        summary: { type: 'STRING' },
                        originalSource: {
                            type: 'OBJECT',
                            properties: {
                                name: { type: 'STRING' },
                                link: { type: 'STRING' },
                                publicationDate: { type: 'STRING' },
                            },
                        },
                    },
                }
            }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error during fact-check from Gemini:", error);
        return null;
    }
}


/**
 * Fetches structured data (stats, science, religion) from Gemini.
 * @param {object} env - The Cloudflare worker environment/secrets.
 * @param {string} topic - The topic to search for.
 * @param {string} type - The type of search ('stats', 'science', 'religion').
 * @returns {Promise<object>} A promise that resolves to the structured result.
 */
async function fetchStructuredData(env, topic, type) {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    let prompt;
    let schema;

    if (type === 'stats') {
        prompt = \`Find the most reliable statistical data for the query "\${topic}". Format it as JSON. The entire output must be in Persian.\`;
        schema = {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                summary: { type: 'STRING' },
                sourceDetails: {
                    type: 'OBJECT',
                    properties: {
                        name: { type: 'STRING' },
                        link: { type: 'STRING' },
                        publicationDate: { type: 'STRING' },
                    },
                },
            },
        };
    } else { // Science and Religion share a similar structure
        prompt = \`Find a key scientific paper or religious text related to "\${topic}". Prioritize academic or primary sources. Format it as JSON. The entire output must be in Persian.\`;
         schema = {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                summary: { type: 'STRING' },
                sourceDetails: {
                    type: 'OBJECT',
                    properties: {
                        name: { type: 'STRING' },
                        link: { type: 'STRING' },
                        author: { type: 'STRING' },
                    },
                },
            },
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error(\`Error fetching structured data (\${type}) from Gemini:\`, error);
        return null;
    }
}


// --- DISCORD RESPONSE FORMATTING FUNCTIONS ---

/**
 * Creates an error embed for Discord.
 * @param {string} message - The error message to display.
 * @returns {object} The Discord embed object.
 */
function createErrorEmbed(message) {
  return {
    type: 4, // Use 4 for channel message with source
    data: {
      embeds: [{
        title: 'خطا',
        description: message,
        color: 0xFF0000, // Red
      }],
    },
  };
}

/**
 * Creates a help embed listing all commands.
 * @returns {object} The Discord embed object.
 */
function createHelpEmbed() {
    return {
        type: 4,
        data: {
            embeds: [{
                title: "راهنمای ربات هوشمند اخبار",
                description: "از دستورات زیر برای استفاده از امکانات ربات استفاده کنید:",
                color: 0x00A0E8,
                fields: [
                    { name: "/search [query] [category] [region] [source]", value: "جستجوی پیشرفته اخبار. همه پارامترها اختیاری هستند.", inline: false },
                    { name: "/factcheck [claim] [image]", value: "بررسی اعتبار یک ادعا (متنی) یا یک تصویر (فایل).", inline: false },
                    { name: "/stats [topic]", value: "جستجوی آمار و داده‌های معتبر در مورد یک موضوع.", inline: false },
                    { name: "/science [topic]", value: "یافتن مقالات و تحقیقات علمی مرتبط با یک موضوع.", inline: false },
                    { name: "/religion [topic]", value: "جستجو در منابع معتبر دینی در مورد یک موضوع.", inline: false },
                    { name: "/help", value: "نمایش این پیام راهنما.", inline: false },
                ]
            }]
        }
    };
}


// --- MAIN WORKER LOGIC ---

export default {
  async fetch(request, env, ctx) {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();
    const isValidRequest = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
    
    if (!isValidRequest) {
      return new Response('Invalid request signature', { status: 401 });
    }

    const interaction = JSON.parse(body);

    if (interaction.type === InteractionType.PING) {
      return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = interaction.data.name;

        // Defer response to avoid timeout
        ctx.waitUntil((async () => {
            let responseEmbed;

            try {
                switch (commandName) {
                    case 'search': {
                        const filters = {
                            query: getOption(interaction, 'query'),
                            category: getOption(interaction, 'category'),
                            region: getOption(interaction, 'region'),
                            source: getOption(interaction, 'source'),
                        };
                        const news = await fetchNews(env, filters);
                        if (news && news.length > 0) {
                             responseEmbed = {
                                embeds: news.slice(0, 5).map(article => ({
                                    title: article.title,
                                    description: article.summary,
                                    url: article.link,
                                    color: 0x06b6d4,
                                    thumbnail: { url: article.imageUrl },
                                    fields: [
                                        { name: 'منبع', value: article.source, inline: true },
                                        { name: 'اعتبار', value: article.credibility, inline: true },
                                        { name: 'دسته‌بندی', value: article.category, inline: true },
                                    ],
                                    footer: { text: article.publicationTime }
                                }))
                            };
                        } else {
                           responseEmbed = { embeds: [{ title: 'نتیجه‌ای یافت نشد', description: 'جستجوی شما نتیجه‌ای در بر نداشت. لطفاً دوباره تلاش کنید.', color: 0xFFCC00 }]};
                        }
                        break;
                    }
                     case 'factcheck': {
                        const claim = getOption(interaction, 'claim');
                        const imageAttachment = getAttachment(interaction, 'image');
                        let imageFile = null;
                        if (imageAttachment) {
                           imageFile = await urlToGenerativePart(imageAttachment.url);
                        }
                        if (!claim && !imageFile) {
                           responseEmbed = { embeds: [{ title: 'ورودی نامعتبر', description: 'لطفاً یک ادعای متنی یا یک فایل تصویر برای بررسی ارسال کنید.', color: 0xFFCC00 }]};
                           break;
                        }

                        const result = await factCheck(env, claim, imageFile);
                        if (result) {
                            const colorMap = { 'بسیار معتبر': 0x00FF00, 'معتبر': 0xFFFF00, 'نیازمند بررسی': 0xFF0000 };
                             responseEmbed = { embeds: [{
                                title: \`نتیجه فکت چک: \${result.overallCredibility}\`,
                                description: result.summary,
                                color: colorMap[result.overallCredibility] || 0x808080,
                                fields: [
                                    { name: 'منبع اولیه', value: \`[\${result.originalSource.name}](\${result.originalSource.link})\`, inline: true },
                                    { name: 'تاریخ انتشار', value: result.originalSource.publicationDate, inline: true },
                                ]
                            }]};
                        } else {
                             responseEmbed = { embeds: [{ title: 'خطا در بررسی', description: 'متاسفانه در حال حاضر امکان بررسی این مورد وجود ندارد.', color: 0xFF0000 }]};
                        }
                        break;
                    }
                    case 'stats':
                    case 'science':
                    case 'religion': {
                        const topic = getOption(interaction, 'topic');
                        const result = await fetchStructuredData(env, topic, commandName);
                         if (result) {
                            const fields = [];
                            if (result.sourceDetails.name) fields.push({ name: 'منبع', value: \`[\${result.sourceDetails.name}](\${result.sourceDetails.link})\`, inline: true });
                            if (result.sourceDetails.publicationDate) fields.push({ name: 'تاریخ انتشار', value: result.sourceDetails.publicationDate, inline: true });
                            if (result.sourceDetails.author) fields.push({ name: 'نویسنده', value: result.sourceDetails.author, inline: true });
                            
                            responseEmbed = { embeds: [{
                                title: result.title,
                                description: result.summary,
                                color: 0x8b5cf6, // Purple
                                fields: fields,
                            }]};
                        } else {
                           responseEmbed = { embeds: [{ title: 'نتیجه‌ای یافت نشد', description: 'جستجوی شما نتیجه‌ای در بر نداشت.', color: 0xFFCC00 }]};
                        }
                        break;
                    }
                    case 'help': {
                        // This command is handled synchronously below, but we can have a case for it here too.
                        break;
                    }
                    default:
                        responseEmbed = { embeds: [{ title: 'دستور نامعتبر', description: 'این دستور شناسایی نشد.', color: 0xFF0000 }] };
                        break;
                }
            } catch (e) {
                console.error(e);
                responseEmbed = { embeds: [{ title: 'خطای داخلی', description: 'یک خطای پیش‌بینی نشده در ربات رخ داد.', color: 0xFF0000 }] };
            }

             // Edit the original deferred message with the result
            const followupUrl = \`https://discord.com/api/v10/webhooks/\${env.DISCORD_APP_ID}/\${interaction.token}/messages/@original\`;
            await fetch(followupUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(responseEmbed),
            });
        })());

        // For commands that can respond instantly like /help
        if (interaction.data.name === 'help') {
             return new Response(JSON.stringify(createHelpEmbed()), { headers: { 'Content-Type': 'application/json' } });
        }

        // Send a deferred response to show "Bot is thinking..."
        return new Response(JSON.stringify({ type: 5 }), { headers: { 'Content-Type': 'application/json' } });

    }

    return new Response('Unhandled interaction type', { status: 400 });
  },
};
`,

    discordBotRegisterCommandsJs: `// This is a script to register your bot's slash commands with Discord.
// You only need to run this ONCE from your local machine, not on the server.

// How to run:
// 1. Make sure you have Node.js installed.
// 2. Create a file named ".env" in the same directory as this script.
// 3. Add your Discord App ID and Bot Token to the .env file like this:
//    DISCORD_APP_ID=YOUR_APPLICATION_ID
//    DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN
// 4. Run 'npm install' to install dependencies.
// 5. Run 'node register-commands.js' in your terminal.

require('dotenv').config();
const fetch = require('node-fetch');

const { DISCORD_APP_ID, DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_APP_ID || !DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_APP_ID and DISCORD_BOT_TOKEN must be set in your .env file.");
}

const commands = [
  {
    name: 'help',
    description: 'نمایش لیست تمام دستورات و راهنمای ربات',
  },
  {
    name: 'search',
    description: 'جستجوی پیشرفته اخبار',
    options: [
      {
        name: 'query',
        description: 'موضوع یا کلیدواژه جستجو',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'category',
        description: 'دسته‌بندی خبر (مثال: سیاسی)',
        type: 3,
        required: false,
      },
      {
        name: 'region',
        description: 'منطقه جغرافیایی (مثال: خاورمیانه)',
        type: 3,
        required: false,
      },
      {
        name: 'source',
        description: 'نوع منبع (مثال: خارجی)',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'factcheck',
    description: 'بررسی اعتبار یک ادعا یا یک تصویر',
    options: [
      {
        name: 'claim',
        description: 'ادعای متنی که می‌خواهید بررسی شود',
        type: 3, // STRING
        required: false,
      },
      {
        name: 'image',
        description: 'تصویری که می‌خواهید بررسی و ردیابی شود',
        type: 11, // ATTACHMENT
        required: false,
      },
    ],
  },
  {
    name: 'stats',
    description: 'جستجوی آمار و داده‌های معتبر در مورد یک موضوع',
    options: [
      {
        name: 'topic',
        description: 'موضوع مورد نظر برای یافتن آمار',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'science',
    description: 'یافتن مقالات و تحقیقات علمی مرتبط با یک موضوع',
    options: [
      {
        name: 'topic',
        description: 'موضوع علمی مورد نظر',
        type: 3, // STRING
        required: true,
      },
    ],
  },
   {
    name: 'religion',
    description: 'جستجو در منابع معتبر دینی در مورد یک موضوع',
    options: [
      {
        name: 'topic',
        description: 'موضوع دینی مورد نظر',
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

const url = \`https://discord.com/api/v10/applications/\${DISCORD_APP_ID}/commands\`;

async function registerCommands() {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bot \${DISCORD_BOT_TOKEN}\`,
      },
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
    cloudflareDbSchemaSql: `-- SQL schema for the Cloudflare D1 settings database.
-- This creates a simple key-value table to store the main settings object.

-- Drop the table if it already exists to start fresh (optional)
DROP TABLE IF EXISTS settings;

-- Create the settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

-- Optional: Add an index for faster lookups on the primary key
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings (key);

-- Add a comment to describe the table's purpose
-- In some SQL dialects, this might be different. This is a generic comment.
-- Description: This table stores the entire application settings object as a JSON string
-- under a single key, 'app-settings'.
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
این راهنما شما را برای استقرار یک بک‌اند کامل شامل دیتابیس برای ذخیره تنظیمات، اخبار و تاریخچه چت، به صورت کاملاً دستی از طریق داشبورد وب‌سایت Appwrite راهنمایی می‌کند.
---
### بخش اول: ساخت پروژه و دیتابیس
1.  **ساخت پروژه:** وارد [Appwrite Cloud](https://cloud.appwrite.io/) شوید و یک پروژه جدید (Create Project) بسازید.
2.  **ذخیره اطلاعات پروژه:** از منوی سمت چپ به **Settings** بروید. مقادیر زیر را کپی کرده و در فیلدهای مربوطه در همین صفحه وارد کنید:
    *   \`Project ID\`
    *   \`API Endpoint\`
3.  **ساخت دیتابیس:** از منوی سمت چپ به بخش **Databases** بروید. یک دیتابیس جدید (Create Database) بسازید و نام آن را \`Main Database\` بگذارید. **Database ID** را کپی کرده و در فیلد مربوطه در این صفحه وارد کنید.
---
### بخش دوم: ساخت کالکشن‌ها (Collections)
وارد دیتابیسی که ساختید شوید و سه کالکشن زیر را با دقت ایجاد کنید.
#### 1. کالکشن تنظیمات (Settings)
*   **Create Collection:** نام کالکشن را \`Settings\` بگذارید. **Collection ID** را کپی کرده و در فیلد \`Settings Collection ID\` وارد کنید.
*   **Attributes Tab:** یک Attribute جدید بسازید:
    *   **Type:** String
    *   **Attribute ID:** \`content\`
    *   **Size:** \`1000000\`
    *   **Required:** Yes
*   **Settings Tab:** در بخش Permissions، یک رول جدید از نوع \`any\` اضافه کنید و تمام دسترسی‌های **Create, Read, Update, Delete** را به آن بدهید. (این برای تست است، در محیط واقعی باید دسترسی‌ها را محدود کنید).

#### 2. کالکشن آرشیو اخبار (News Articles)
*   **Create Collection:** نام کالکشن را \`News Articles\` بگذارید. **Collection ID** را کپی کرده و در فیلد \`News Articles Collection ID\` وارد کنید.
*   **Attributes Tab:** Attribute های زیر را بسازید:
    *   \`title\` (String, 255, Required)
    *   \`link\` (String, 512, Required)
    *   \`summary\` (String, 10000, Not Required)
    *   \`sourceName\` (String, 100, Not Required)
    *   \`category\` (String, 50, Not Required)
    *   \`publicationTime\` (String, 50, Not Required)
*   **Indexes Tab:** یک ایندکس جدید بسازید:
    *   **Index ID:** \`link_unique\`
    *   **Type:** \`unique\`
    *   **Attributes:** \`link\`
*   **Settings Tab:** مانند کالکشن قبل، به رول \`any\` تمام دسترسی‌ها را بدهید.

#### 3. کالکشن تاریخچه چت (Chat History)
*   **Create Collection:** نام کالکشن را \`Chat History\` بگذارید. **Collection ID** را کپی کرده و در فیلد \`Chat History Collection ID\` وارد کنید.
*   **Attributes Tab:** Attribute های زیر را بسازید:
    *   \`sessionId\` (String, 36, Required)
    *   \`role\` (String, 10, Required)
    *   \`text\` (String, 10000, Required)
    *   \`timestamp\` (Datetime, Required)
*   **Settings Tab:** به رول \`any\` تمام دسترسی‌ها را بدهید.
---
### بخش سوم: ساخت کلید API
1.  از منوی اصلی پروژه (گوشه پایین سمت چپ) به بخش **API Keys** بروید.
2.  یک کلید API جدید (Create API Key) بسازید.
3.  یک نام برای آن انتخاب کنید و در بخش **Scopes**، تیک **\`databases\`** را بزنید.
4.  پس از ساخت، **API Key Secret** را کپی کرده و در فیلد \`API Key\` در این صفحه وارد کنید.
---
### بخش چهارم: اتصال نهایی
پس از وارد کردن تمام اطلاعات (Project ID, Endpoint, Database ID, Collection ID ها و API Key) در فرم این صفحه، روی دکمه **"ذخیره و تست اتصال"** کلیک کنید تا از صحت اطلاعات وارد شده اطمینان حاصل کنید.`,

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
                const formattedMessage = \`*$\{article.title}*\\n\\n*منبع:* $\{article.source}\\n\\n$\{article.summary}\\n\\n[مشاهده خبر]($\{article.link})\`;
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

    databaseSchemaSql: `-- Smart News Search - cPanel Database Schema for MySQL
-- Version 1.0
-- This schema is designed to store all application data for a self-hosted instance.

--
-- Table structure for table \`app_settings\`
-- Stores the entire application settings JSON object for easy backup.
--
CREATE TABLE IF NOT EXISTS \`app_settings\` (
  \`setting_key\` varchar(50) NOT NULL,
  \`settings_json\` LONGTEXT NOT NULL,
  \`last_updated\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE \`app_settings\` ADD PRIMARY KEY (\`setting_key\`);
INSERT INTO \`app_settings\` (\`setting_key\`, \`settings_json\`) VALUES ('main', '{}') ON DUPLICATE KEY UPDATE \`setting_key\`=\`setting_key\`;

--
-- Table structure for table \`credentials\`
-- IMPORTANT: Storing keys in a database is less secure than environment variables.
-- Use this only if your hosting environment does not support environment variables.
--
CREATE TABLE IF NOT EXISTS \`credentials\` (
  \`credential_key\` varchar(50) NOT NULL,
  \`value\` text NOT NULL,
  \`last_updated\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE \`credentials\` ADD PRIMARY KEY (\`credential_key\`);

--
-- Table structure for table \`chat_history\`
-- Stores conversations from the Chatbot.
--
CREATE TABLE IF NOT EXISTS \`chat_history\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`session_id\` varchar(100) NOT NULL,
  \`role\` varchar(10) NOT NULL,
  \`content\` text NOT NULL,
  \`timestamp\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  KEY \`session_id\` (\`session_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table \`search_history\`
-- Logs user searches for analytics or history features.
--
CREATE TABLE IF NOT EXISTS \`search_history\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`search_type\` varchar(50) NOT NULL,
  \`query\` text NOT NULL,
  \`filters_json\` text,
  \`timestamp\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table \`archived_news\`
-- Stores important news articles found by the user or bots.
--
CREATE TABLE IF NOT EXISTS \`archived_news\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`link\` varchar(768) NOT NULL,
  \`title\` text NOT NULL,
  \`summary\` text,
  \`source\` varchar(255) DEFAULT NULL,
  \`article_json\` longtext,
  \`saved_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`link\` (\`link\`)
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
`
};