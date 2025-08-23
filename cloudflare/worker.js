/**
 * Cloudflare Worker for a Telegram Bot
 *
 * How to use:
 * 1. Create a new Worker in your Cloudflare dashboard.
 * 2. Copy and paste this code into the Worker's editor.
 * 3. Go to the Worker's settings and add the following secrets:
 *    - `TELEGRAM_BOT_TOKEN`: Your token from BotFather.
 *    - `GEMINI_API_KEY`: Your Google Gemini API key.
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
        const formattedMessage = `*${firstArticle.title}*\n\n*منبع:* ${firstArticle.source}\n\n${firstArticle.summary}\n\n[مشاهده خبر](${firstArticle.link})`;
        await sendMessage(chatId, formattedMessage, 'Markdown');
      } else {
        await sendMessage(chatId, 'متاسفانه در حال حاضر مشکلی در دریافت اخبار وجود دارد.');
      }
    }
  }
}

async function sendMessage(chatId, text, parseMode = '') {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
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
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
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
