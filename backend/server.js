// Simple Express server for Smart News Search backend
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
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'سلام! ربات هوشمند اخبار آماده است. برای دریافت آخرین اخبار /news را ارسال کنید.');
});

bot.onText(/\/news/, (msg) => {
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
    console.log(`Server listening on http://localhost:${port}`);
    console.log('To set a webhook for the Telegram bot, run the following curl command in your terminal:');
    console.log(`// curl -F "url=https://YOUR_PUBLIC_SERVER_URL/telegram-webhook" https://api.telegram.org/bot${token}/setWebhook`);
});
