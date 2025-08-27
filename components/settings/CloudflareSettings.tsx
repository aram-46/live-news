import React, { useState } from 'react';
import { backendFiles } from '../../data/fileContent';
import { IntegrationSettings } from '../../types';
import { testCloudflareDbConnection } from '../../services/integrationService';
import { CloudIcon, DatabaseIcon, CheckCircleIcon, CloseIcon } from '../icons';

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

const CloudflareSettings: React.FC = () => {
    // Note: To make this component truly interactive with AppSettings,
    // it would need props for settings and onSettingsChange.
    // For this request, we are building the UI and providing the logic/files.
    // The actual state management is handled in the parent `Settings` component.
    const [workerUrl, setWorkerUrl] = useState('');
    const [workerToken, setWorkerToken] = useState('');
    const [status, setStatus] = useState<TestStatus>('idle');
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    
    const handleTestConnection = async () => {
        setStatus('testing');
        const success = await testCloudflareDbConnection(workerUrl, workerToken);
        setStatus(success ? 'success' : 'error');
         setTimeout(() => setStatus('idle'), 5000);
    };
    
     const renderStatusIcon = (platformStatus: TestStatus) => {
        if (platformStatus === 'testing') return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>;
        if (platformStatus === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        if (platformStatus === 'error') return <CloseIcon className="w-5 h-5 text-red-400" />;
        return null;
    }

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
            <div className="space-y-6 p-6 bg-gray-900/30 rounded-lg border border-cyan-400/20">
                <div className="flex items-center gap-3">
                    <DatabaseIcon className="w-6 h-6 text-cyan-200" />
                    <h3 className="text-lg font-semibold text-cyan-200">اتصال به دیتابیس D1 (برای ذخیره تنظیمات)</h3>
                </div>
                <p className="text-sm text-gray-400">
                    با راه‌اندازی یک ورکر و دیتابیس D1، تنظیمات برنامه شما به صورت امن در اکانت کلودفلر شما ذخیره می‌شود و بین تمام دستگاه‌هایتان همگام باقی می‌ماند. برای این کار، راهنمای زیر را دنبال کرده و اطلاعات اتصال را وارد کنید.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">آدرس Worker</label>
                        <input type="text" value={workerUrl} onChange={e => setWorkerUrl(e.target.value)} placeholder="https://your-worker.your-name.workers.dev" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">توکن امنیتی (Bearer Token)</label>
                        <input type="password" value={workerToken} onChange={e => setWorkerToken(e.target.value)} placeholder="یک توکن امن برای ورکر خود وارد کنید" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleTestConnection} disabled={status === 'testing' || !workerUrl || !workerToken} className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 rounded-lg transition duration-300 text-sm disabled:opacity-50">
                        ذخیره و تست اتصال
                    </button>
                    <div className="w-5 h-5">{renderStatusIcon(status)}</div>
                </div>
                
                <div className="text-sm">
                    <button onClick={() => setIsGuideOpen(!isGuideOpen)} className="font-semibold text-cyan-300 hover:underline">
                        {isGuideOpen ? 'بستن راهنما' : 'نمایش راهنمای کامل راه‌اندازی دیتابیس'}
                    </button>
                    {isGuideOpen && (
                        <div className="mt-4 space-y-4 bg-gray-900/50 p-4 rounded-lg">
                            <h4 className="font-bold text-cyan-200">راهنمای قدم به قدم:</h4>
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
                                <li>پس از استقرار موفق، آدرس ورکر (مثلا `https://...workers.dev`) و توکن امنیتی که در مرحله ۶ ساختید را در فیلدهای بالا وارد کرده و روی "ذخیره و تست اتصال" کلیک کنید.</li>
                                <li>**پشتیبان‌گیری و بازیابی:** برای گرفتن بکاپ از دیتابیس از دستور `wrangler d1 export` و برای بازیابی از `d1 execute --file` استفاده کنید.</li>
                            </ol>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: Telegram Bot */}
            <div className="space-y-6 p-6 bg-gray-900/30 rounded-lg border border-gray-700/50">
                <h3 className="text-lg font-semibold text-cyan-200">راه‌اندازی ربات تلگرام با Worker</h3>
                <p className="text-sm text-gray-300">این روش ساده‌ترین راه برای راه‌اندازی سریع ربات تلگرام از طریق رابط کاربری وب کلودفلر است.</p>
                <div className="flex flex-wrap gap-4 items-center">
                    <DownloadButton content={backendFiles.workerJs} filename="telegram-worker.js" />
                </div>
                 <div>
                    <h4 className="font-semibold text-cyan-200 mb-2">راهنمای راه‌اندازی:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                        <li>وارد داشبورد Cloudflare شوید و یک سرویس ورکر جدید بسازید.</li>
                        <li>روی "Quick edit" کلیک کرده و محتوای فایل `telegram-worker.js` را در ویرایشگر جای‌گذاری کنید.</li>
                        <li>به تنظیمات ورکر (Settings -> Variables) بروید و دو متغیر محرمانه `TELEGRAM_BOT_TOKEN` و `GEMINI_API_KEY` را اضافه کنید.</li>
                        <li>ورکر را "Save and deploy" کنید.</li>
                        <li>در نهایت، وبهوک تلگرام را با مراجعه به آدرس زیر در مرورگر خود تنظیم کنید (اطلاعات خود را جایگزین کنید):<br/>
                            <code className="text-xs text-amber-300 break-all">
                                https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook?url=https://[YOUR_WORKER_URL]/
                            </code>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default CloudflareSettings;