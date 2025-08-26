import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { PaperClipIcon, CloseIcon, ClipboardIcon, ShareIcon, CheckCircleIcon } from './icons';
import { MediaFile } from '../types';

// This check is a safeguard; the API key is expected to be set by the build process.
if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set during build. The app may not function correctly.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const expertSystemInstruction = `You are a friendly and highly knowledgeable expert assistant for the "Smart News Search" application. Your primary goal is to provide comprehensive, clear, and step-by-step help to users. Your responses must be in PERSIAN.

**Your Capabilities:**
*   You can analyze text prompts.
*   You can analyze uploaded files, including **images (screenshots), code files (.js, .tsx, .json, etc.), and log files (.log, .txt)**. Use the file as the primary context for the user's question.

**Your Knowledge Base:**

You know everything about this application, including:
1.  **Core Features:** Live News, Advanced Search, AI Fact-Check, News Ticker.
2.  **Settings Panel:** All tabs (Content, Theme, Sources, AI, Integrations, Backend, Cloudflare, GitHub, About).
3.  **Installation & Execution:** You can guide users on how to run this application locally. Since it's a frontend-only application built with React and es-modules, the process is simple: serve \`index.html\` with a basic web server. No complex build steps are needed for the user to run it.
4.  **Deployment on Free Platforms & Shared Hosting:**
    *   You know that static site hosting is the key.
    *   You can recommend free services like Netlify, Vercel, Cloudflare Pages, or GitHub Pages.
    *   For shared hosting without SSH/CLI access, the user can simply upload the application files (\`index.html\`, \`build/index.js\`, etc.) to a folder on their server via FTP or a file manager. As long as the server can serve static HTML files, it will work.
    *   You understand the Gemini API key is a crucial part. On static hosting, it's exposed client-side. You should mention that for security in a production environment, API calls should be proxied through a backend (like the provided Cloudflare Worker or Node.js server examples), but for personal use or testing, using it on the client-side is acceptable. The \`process.env.API_KEY\` is a placeholder for where the key is injected, and in a static hosting environment, this would typically be replaced with the actual key during a build step or managed through the hosting platform's environment variable settings.
5.  **Backend & Serverless Integration:**
    *   You can explain the purpose of the provided \`server.js\` (for Node.js hosting), \`worker.js\` (for Cloudflare Workers), and GitHub Actions files.
    *   You can provide step-by-step guides for setting them up, as described in the application's own help tabs.
    *   You can explain that these are *optional* backend components for features like a server-side Telegram bot or automated tasks.
6.  **Troubleshooting Common Errors:**
    *   "API Key not working": Check if the \`API_KEY\` is set correctly in the environment. Check for typos. Ensure the key is enabled for the Gemini API in the Google AI Studio.
    *   "News not loading": Check the browser's developer console for errors. It could be an API key issue, a network problem, or a temporary Gemini service outage.
    *   "Fact-check fails": Similar to news loading issues. Also, ensure the uploaded file format is supported.
7.  **Technology Stack:**
    *   You know the app is built with React, TypeScript, and Tailwind CSS.
    *   It uses the \`@google/genai\` SDK for AI features.
    *   It does *not* use PHP. You can explain that converting it to PHP would require a complete rewrite of the entire frontend and backend logic. It's not a simple "conversion."

**Your Persona & Response Style:**
*   **Friendly & Patient:** Always start with a welcoming tone.
*   **Structured:** Use lists (numbered or bulleted) and bold text to make instructions easy to follow.
*   **Code Snippets:** When providing code or commands, wrap them in markdown code blocks.
*   **Direct & To the Point:** Answer the user's question directly before providing additional context.
*   **Always in Persian:** All your responses must be in natural-sounding Persian.
`;

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

type ChatbotTab = 'general' | 'expert';

const Chatbot: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ChatbotTab>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [copyStatus, setCopyStatus] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize or re-initialize chat session when tab changes
    const systemInstruction = activeTab === 'expert' ? expertSystemInstruction : undefined;
    const newChat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
    });
    setChatSession(newChat);
    setMessages([]); // Clear messages when switching context
    setMediaFile(null); // Clear file on tab switch
  }, [activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        setMediaFile({
            name: file.name,
            type: file.type,
            data: base64Data,
            url: URL.createObjectURL(file)
        });
    };
    reader.readAsDataURL(file);
    if(event.target) event.target.value = ''; // Reset file input
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!userInput.trim() && !mediaFile) || !chatSession || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: userInput || `(فایل: ${mediaFile?.name})` };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
        const contentParts: any[] = [];
        
        // Add file part if it exists (should be first for better context)
        if (mediaFile && activeTab === 'expert') {
            contentParts.push({
                inlineData: {
                    data: mediaFile.data,
                    mimeType: mediaFile.type,
                }
            });
        }
        
        // Add text part if it exists
        if (userInput.trim()) {
            contentParts.push({ text: userInput });
        }
        
        setMediaFile(null); // Clear file from UI after adding to parts
        
        const responseStream = await chatSession.sendMessageStream({ message: contentParts });
        
        let modelResponse = '';
        setMessages(prev => [...prev, { role: 'model', text: '...' }]);
        
        for await (const chunk of responseStream) {
            modelResponse += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0) {
                   newMessages[newMessages.length - 1].text = modelResponse;
                }
                return newMessages;
            });
        }
    } catch (error) {
        console.error("Error sending message:", error);
        setMessages(prev => [...prev, { role: 'model', text: 'متاسفانه خطایی رخ داد. لطفا دوباره تلاش کنید.' }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopyStatus({ [index]: true });
    setTimeout(() => setCopyStatus(prev => ({ ...prev, [index]: false })), 2000);
  };

  const handleDownload = (userMessage: string, modelMessage: string) => {
      const content = `[USER PROMPT]\n${userMessage}\n\n[ASSISTANT RESPONSE]\n${modelMessage}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-response-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };
  
  const renderMessage = (msg: ChatMessage, index: number) => {
    const isUser = msg.role === 'user';
    const bubbleClasses = isUser
      ? 'bg-cyan-600/50 self-end rounded-br-none'
      : 'bg-gray-700/50 self-start rounded-bl-none';
    
    // Simple markdown to HTML for bold and code blocks
    const formattedText = msg.text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900/70 p-2 rounded-md my-2 text-sm text-cyan-200 overflow-x-auto"><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-800/80 px-1 py-0.5 rounded text-xs text-amber-300">$1</code>')
        .replace(/\n/g, '<br />');

    return (
        <div key={index} className={`max-w-xl w-fit p-3 rounded-xl relative group ${bubbleClasses}`}>
            <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedText }} />
             {!isUser && msg.text && msg.text !== '...' && (
                <div className="absolute -top-2 -left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => handleCopy(msg.text, index)}
                        className="p-1.5 bg-gray-800/80 rounded-full text-gray-300 hover:text-white"
                        title="کپی"
                    >
                        {copyStatus[index] ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => handleDownload(messages[index-1]?.text || "No prompt", msg.text)}
                        className="p-1.5 bg-gray-800/80 rounded-full text-gray-300 hover:text-white"
                        title="دانلود به عنوان فایل متنی"
                    >
                        <ShareIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-[75vh] max-w-4xl mx-auto bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <div className="flex-shrink-0 border-b border-cyan-400/20">
        <div className="flex px-2">
            <button
                onClick={() => setActiveTab('general')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${activeTab === 'general' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:text-white'}`}
            >چت‌بات عمومی</button>
            <button
                onClick={() => setActiveTab('expert')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${activeTab === 'expert' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:text-white'}`}
            >دستیار متخصص</button>
        </div>
      </div>
      
      <div className="flex-grow p-4 space-y-4 overflow-y-auto flex flex-col">
        {messages.length === 0 && (
            <div className="text-center text-gray-500 m-auto">
                {activeTab === 'general' ? 'می‌توانید هر سوالی دارید از من بپرسید.' : 'سلام! من دستیار متخصص شما برای این برنامه هستم. چگونه می‌توانم کمکتان کنم؟ می‌توانید فایل یا تصویر هم برای تحلیل آپلود کنید.'}
            </div>
        )}
        {messages.map(renderMessage)}
        {isLoading && messages[messages.length-1]?.role === 'user' && (
             <div className="max-w-xl w-fit p-3 rounded-xl bg-gray-700/50 self-start rounded-bl-none">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-0"></span>
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150"></span>
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-300"></span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
        
      {mediaFile && activeTab === 'expert' && (
        <div className="flex-shrink-0 p-2 px-4 border-t border-cyan-400/20">
            <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg">
                <span className="text-xs text-gray-300 truncate">فایل ضمیمه شده: {mediaFile.name}</span>
                <button onClick={() => setMediaFile(null)} className="text-gray-400 hover:text-white"><CloseIcon className="w-4 h-4" /></button>
            </div>
        </div>
      )}

      <div className="flex-shrink-0 p-4 border-t border-cyan-400/20">
        <form onSubmit={handleSendMessage} className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            {activeTab === 'expert' && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white font-bold p-2.5 rounded-lg transition"
                title="ضمیمه کردن فایل"
              >
                  <PaperClipIcon className="w-5 h-5" />
              </button>
            )}
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="پیام خود را بنویسید..."
            className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || (!userInput.trim() && !mediaFile)}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded-lg transition"
          >
            ارسال
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;