import React, 'react';
import { backendFiles } from '../../data/fileContent';
import { CloudIcon, DatabaseIcon, CheckCircleIcon, CloseIcon, TelegramIcon } from '../icons';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const DownloadButton: React.FC<{ content: string; filename: string; mimeType?: string }> = ({ content, filename, mimeType = 'text/plain;charset=utf-8' }) => {
    const handleDownload = () => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleDownload}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm"
        >
            دانلود {filename}
        </button>
    );
};


// Note: To make this component fully interactive with AppSettings,
// it would need props for settings and onSettingsChange.
// The state management is localized here for demonstration of the new features.
const CloudflareSettings: React.FC = () => {
    // State for D1 Database connection
    const [dbWorkerUrl, setDbWorkerUrl] = React.useState('');
    const [dbWorkerToken, setDbWorkerToken] = React.useState('');
    const [dbStatus, setDbStatus] = React.useState<TestStatus>('idle');
    const [isGuideOpen, setIsGuideOpen] = React.useState(false);
    
    // State for Telegram Webhook tool
    const [tgBotToken, setTgBotToken] = React.useState('');
    const [tgWorkerUrl, setTgWorkerUrl] = React.useState('');
    const [testChatId, setTestChatId] = React.useState('');
    const [tgTestStatus, setTgTestStatus] = React.useState<TestStatus>('idle');
    const [testMessage, setTestMessage] = React.useState<string | null>(null);


    const handleDbTestConnection = async () => {
        setDbStatus('testing');
        // This is a placeholder. Real implementation would call a service function.
        // const success = await testCloudflareDbConnection(dbWorkerUrl, dbWorkerToken);
        const success = dbWorkerUrl.startsWith('https://') && dbWorkerToken.length > 5;
        await new Promise(res => setTimeout(res, 1500));
        setDbStatus(success ? 'success' : 'error');
        setTimeout(() => setDbStatus('idle'), 5000);
    };
    
    const handleSendTestMessage = async () => {
        if (!tgWorkerUrl || !testChatId) {
            setTestMessage('لطفاً آدرس ورکر و شناسه چت را وارد کنید.');
            setTgTestStatus('error');
            return;
        }
        setTgTestStatus('testing');
        setTestMessage(null);
        try {
            const response = await fetch(tgWorkerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    test_message: {
                        chat_id: testChatId,
                        text: 'این یک پیام تست از برنامه "جستجوی هوشمند اخبار" است. اتصال شما با موفقیت برقرار شد.'
                    }
                }),
            });
            if (response.ok) {
                setTgTestStatus('success');
                setTestMessage('پیام تست با موفقیت ارسال شد! لطفاً ربات تلگرام خود را بررسی کنید.');
            } else {
                throw new Error(`Worker returned status: ${response.status}`);
            }
        } catch (error) {
            console.error("Failed to send test message:", error);
            setTgTestStatus('error');
            setTestMessage(`خطا در ارسال پیام. آیا آدرس ورکر صحیح است و ورکر شما به درستی کار می‌کند؟ (${error.message})`);
        }
    };

    const renderStatusIcon = (status: TestStatus) => {
        if (status === 'testing') return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>;
        if (status === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        if (status === 'error') return <CloseIcon className="w-5 h-5 text-red-400" />;
        return null;
    }
    
    const webhookUrl = tgBotToken && tgWorkerUrl ? `https://api.telegram.org/bot${tgBotToken}/setWebhook?url=${encodeURIComponent(tgWorkerUrl)}` : '';

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
            <div className="flex items-center gap-3">
                <CloudIcon className="w-8 h-8 text-cyan-300" />
                <div>
                    <h2 className="text-xl font-bold text-cyan-300">یکپارچه‌سازی با Cloudflare</h2>
                    <p className="text-sm text-gray-400">
                        از زیرساخت قدرتمند کلودفلر برای ذخیره‌سازی تنظیمات و اجرای ربات‌ها به صورت Serverless استفاده کنید.
                    </p>
                </div>
            </div>

            {/* Section 1: Database Connection */}
            <div className="space-y-4 p-6 bg-gray-900/30 rounded-lg border border-cyan-400/20">
                <div className="flex items-center gap-3 mb-2">
                    <DatabaseIcon className="w-6 h-6 text-cyan-200" />
                    <h3 className="text-lg font-semibold text-cyan-200">اتصال به دیتابیس D1 (برای ذخیره تنظیمات)</h3>
                </div>
                 <p className="text-sm text-gray-400 border-l-4 border-cyan-500 pl-4 bg-gray-800/50 p-3 rounded-r-lg">
                    **توضیح مهم:** این فرآیند دو مرحله‌ای است. ابتدا باید با دنبال کردن **مرحله ۱**، بک‌اند خود را در کلودفلر بسازید. سپس با اطلاعات به دست آمده، **مرحله ۲** را برای اتصال برنامه به آن انجام دهید.
                </p>

                {/* Step 1: Deploy Backend */}
                <div className="space-y-4">
                    <h4 className="font-bold text-cyan-200">مرحله ۱: استقرار بک‌اند در کلودفلر (راه‌اندازی یکباره)</h4>
                     <p className="text-sm text-gray-300">این فایل‌ها و راهنما به شما کمک می‌کنند تا یک ورکر و دیتابیس D1 شخصی در اکانت کلودفلر خود بسازید. این کار فقط یک بار نیاز به انجام دارد.</p>
                     <div className="text-sm">
                        <button onClick={() => setIsGuideOpen(!isGuideOpen)} className="font-semibold text-cyan-300 hover:underline">
                            {isGuideOpen ? 'بستن راهنما' : 'نمایش راهنمای کامل راه‌اندازی'}
                        </button>
                        {isGuideOpen && (
                            <div className="mt-4 space-y-4 bg-gray-900/50 p-4 rounded-lg">
                                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                                    <li>ابتدا فایل‌های مورد نیاز را دانلود کنید:
                                        <div className="flex flex-wrap gap-2 my-2">
                                             <DownloadButton content={backendFiles.cloudflareDbWorkerJs} filename="db-worker.js" />
                                             <DownloadButton content={backendFiles.cloudflareDbWranglerToml} filename="wrangler.toml" />
                                             <DownloadButton content={backendFiles.cloudflareDbSchemaSql} filename="schema.sql" />
                                        </div>
                                    </li>
                                    <li>ابزار <code className="text-amber-300">Wrangler</code> را با دستور `npm install -g wrangler` نصب و با `wrangler login` به حساب خود متصل شوید.</li>
                                    <li>یک دیتابیس D1 جدید بسازید. نام دیتابیس را به یاد بسپارید (مثلا `smart-news-db`):<br/><code className="text-amber-300 text-xs">wrangler d1 create smart-news-db</code></li>
                                    <li>فایل `wrangler.toml` را باز کرده و در بخش `database_id`، شناسه دیتابیسی که در مرحله قبل ساخته شد را وارد کنید.</li>
                                    <li>جداول دیتابیس را با اجرای فایل SQL ایجاد کنید:<br/><code className="text-amber-300 text-xs">wrangler d1 execute smart-news-db --file=./schema.sql</code></li>
                                    <li>یک توکن امن برای ورکر خود بسازید و آن را در ورکر به عنوان Secret ذخیره کنید:<br/><code className="text-amber-300 text-xs">wrangler secret put WORKER_TOKEN</code><br/>(از شما خواسته می‌شود مقدار توکن را وارد کنید. یک رمز قوی انتخاب کنید.)</li>
                                    <li>ورکر را با دستور `wrangler deploy` مستقر کنید.</li>
                                    <li>پس از استقرار موفق، به مرحله ۲ بروید.</li>
                                </ol>
                            </div>
                        )}
                    </div>
                </div>
                 {/* Step 2: Connect App */}
                <div className="space-y-4 pt-4 border-t border-cyan-400/20">
                    <h4 className="font-bold text-cyan-200">مرحله ۲: اتصال برنامه به بک‌اند شما</h4>
                    <p className="text-sm text-gray-300">آدرس ورکر و توکن امنیتی که در مرحله قبل ساختید را اینجا وارد کنید تا تنظیمات برنامه به صورت ابری ذخیره شوند.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-2">آدرس Worker</label>
                            <input type="text" value={dbWorkerUrl} onChange={e => setDbWorkerUrl(e.target.value)} placeholder="https://your-worker.workers.dev" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-2">توکن امنیتی (Bearer Token)</label>
                            <input type="password" value={dbWorkerToken} onChange={e => setDbWorkerToken(e.target.value)} placeholder="توکن امنی که در مرحله قبل ساختید" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleDbTestConnection} disabled={dbStatus === 'testing' || !dbWorkerUrl || !dbWorkerToken} className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 rounded-lg transition duration-300 text-sm disabled:opacity-50">
                            ذخیره و تست اتصال
                        </button>
                        <div className="w-5 h-5">{renderStatusIcon(dbStatus)}</div>
                    </div>
                </div>
            </div>

            {/* Section 2: Telegram Bot */}
            <div className="space-y-6 p-6 bg-gray-900/30 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-3 mb-2">
                    <TelegramIcon className="w-6 h-6 text-cyan-200" />
                    <h3 className="text-lg font-semibold text-cyan-200">ابزار راه‌اندازی وبهوک ربات تلگرام</h3>
                </div>
                <p className="text-sm text-gray-400">اطلاعات زیر را وارد کنید تا لینک فعال‌سازی وبهوک برای شما ساخته شود. ابتدا باید یک ورکر تلگرام (طبق راهنمای زیر) مستقر کرده باشید.</p>
                
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">توکن ربات تلگرام</label>
                        <input type="password" value={tgBotToken} onChange={e => setTgBotToken(e.target.value)} placeholder="توکن دریافتی از BotFather" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">آدرس ورکر کلودفلر</label>
                        <input type="text" value={tgWorkerUrl} onChange={e => setTgWorkerUrl(e.target.value)} placeholder="https://telegram-bot.your-name.workers.dev" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                </div>

                {webhookUrl && (
                     <div className="space-y-2">
                        <label className="block text-sm font-medium text-cyan-300">لینک فعال‌سازی وبهوک</label>
                        <p className="text-xs text-gray-400">روی لینک زیر کلیک کنید. اگر تلگرام پیام `{"ok":true,"result":true,"description":"Webhook was set"}` را نمایش داد، وبهوک با موفقیت فعال شده است.</p>
                        <a href={webhookUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-400 break-all bg-gray-800 p-2 rounded-lg text-sm hover:underline">{webhookUrl}</a>
                    </div>
                )}
                
                <div className="pt-4 border-t border-gray-700/50 space-y-4">
                     <h4 className="font-semibold text-cyan-200">تست نهایی اتصال</h4>
                     <p className="text-sm text-gray-400">پس از فعال‌سازی وبهوک، شناسه چت خود (آیدی عددی کاربر، گروه یا کانال) را وارد کرده و یک پیام تست ارسال کنید.</p>
                      <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">شناسه چت برای تست</label>
                        <input type="text" value={testChatId} onChange={e => setTestChatId(e.target.value)} placeholder="شناسه عددی چت" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                     <div className="flex items-center gap-3">
                        <button onClick={handleSendTestMessage} disabled={tgTestStatus === 'testing' || !webhookUrl || !testChatId} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm disabled:opacity-50">
                            ارسال پیام تست
                        </button>
                         <div className="w-5 h-5">{renderStatusIcon(tgTestStatus)}</div>
                    </div>
                    {testMessage && (
                        <p className={`text-xs p-2 rounded-lg ${tgTestStatus === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                            {testMessage}
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CloudflareSettings;
