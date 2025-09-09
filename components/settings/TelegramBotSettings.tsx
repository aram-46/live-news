import React, { useState } from 'react';
import { TelegramSettings } from '../../types';
import { TelegramIcon, CheckCircleIcon, CloseIcon } from '../icons';
import { testTelegramConnection } from '../../services/integrationService';
import { backendFiles } from '../../data/fileContent';

interface TelegramBotSettingsProps {
  settings: TelegramSettings;
  onSettingsChange: (settings: TelegramSettings) => void;
}
type TestStatus = 'idle' | 'testing' | 'success' | 'error';

// Local helper components
const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; initialOpen?: boolean }> = ({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    return (
        <div className="mt-4 border border-gray-700/50 rounded-lg">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-right bg-gray-800/40 hover:bg-gray-700/50 rounded-t-lg">
                <span className="font-semibold text-cyan-300">{title}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );
};

const DownloadButton: React.FC<{ content: string; filename: string; }> = ({ content, filename }) => {
    const handleDownload = () => {
        const blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });
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
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-lg transition duration-300 text-xs"
        >
            دانلود {filename}
        </button>
    );
};


const TelegramBotSettings: React.FC<TelegramBotSettingsProps> = ({ settings, onSettingsChange }) => {
    const [status, setStatus] = useState<TestStatus>('idle');
    
    const handleChange = (field: keyof TelegramSettings, value: string) => {
        setStatus('idle');
        onSettingsChange({ ...settings, [field]: value });
    };

    const runTest = async () => {
        setStatus('testing');
        const success = await testTelegramConnection(settings);
        setStatus(success ? 'success' : 'error');
        setTimeout(() => setStatus('idle'), 4000);
    };

    const renderStatusIcon = (status: TestStatus) => {
        if (status === 'testing') return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>;
        if (status === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        if (status === 'error') return <CloseIcon className="w-5 h-5 text-red-400" />;
        return null;
    }

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
            <div className="flex items-center gap-3">
                <TelegramIcon className="w-8 h-8 text-cyan-300"/>
                <div>
                    <h2 className="text-xl font-bold text-cyan-300">اتصال به ربات تلگرام</h2>
                    <p className="text-sm text-gray-400">ربات تلگرام خود را برای دریافت خودکار اخبار متصل کنید.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left side: Settings */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-cyan-200">پیکربندی</h3>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">توکن ربات (Bot Token)</label>
                        <input type="password" value={settings.botToken} onChange={(e) => handleChange('botToken', e.target.value)} placeholder="123456:ABC-DEF1234..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">شناسه چت (Chat ID)</label>
                        <input type="text" value={settings.chatId} onChange={(e) => handleChange('chatId', e.target.value)} placeholder="@your_channel_name or -10012345678" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={runTest} disabled={!settings.botToken || status === 'testing'} className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                        <div className="w-5 h-5">{renderStatusIcon(status)}</div>
                    </div>
                     <div className="pt-4 border-t border-cyan-400/20">
                         <h4 className="font-semibold text-cyan-200 mb-2">نیاز به بک‌اند</h4>
                         <p className="text-xs text-gray-400">
                             برای اینکه ربات تلگرام بتواند به صورت خودکار کار کند و به دستورات پاسخ دهد، نیاز به یک سرور یا بک‌اند همیشه روشن دارد. شما می‌توانید از راهنماهای موجود در تب <strong className="text-amber-300">"نصب و راه‌اندازی"</strong> برای استقرار بک‌اند روی سرور شخصی (Node.js) یا به صورت سرورلس (Cloudflare) استفاده کنید.
                         </p>
                         <CollapsibleSection title="استفاده از Cloudflare Workers (روش پیشنهادی)">
                            <p className="text-xs text-gray-300 mb-3">
                                Cloudflare Workers به شما اجازه می‌دهد ربات خود را بدون نیاز به سرور شخصی و با استفاده از پلن رایگان کلودفلر راه‌اندازی کنید.
                            </p>
                            <div className="space-y-2 text-xs text-gray-300">
                                <div className="flex items-center gap-2">
                                    <span>۱. فایل ورکر را دانلود کنید:</span>
                                    <DownloadButton content={backendFiles.telegramBotWorkerJs} filename="telegram-worker.js" />
                                </div>
                                <p>۲. به تب <strong className="text-amber-300">"نصب و راه‌اندازی"</strong> و سپس بخش <strong className="text-amber-300">"کلودفلر"</strong> بروید.</p>
                                <p>۳. طبق راهنمای تصویری، یک ورکر جدید بسازید و کد دانلود شده را در آن قرار دهید.</p>
                                <p>۴. در همان بخش کلودفلر، از ابزار "راه‌اندازی وبهوک" برای اتصال ربات تلگرام خود به ورکر استفاده کنید.</p>
                            </div>
                        </CollapsibleSection>
                    </div>
                </div>
                {/* Right side: Guide */}
                <div className="space-y-3 p-4 bg-gray-800/50 rounded-lg">
                    <h3 className="font-semibold text-cyan-200 text-base mb-2">راهنمای دریافت اطلاعات</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                        <li>به ربات <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">BotFather</a> در تلگرام پیام دهید.</li>
                        <li>دستور `/newbot` را ارسال کرده و نام و یوزرنیم ربات خود را انتخاب کنید.</li>
                        <li>پس از ساخت ربات، BotFather یک توکن (API Token) به شما می‌دهد. آن را کپی کرده و در فیلد "توکن ربات" وارد کنید.</li>
                        <li>برای "شناسه چت"، اگر می‌خواهید به یک کانال عمومی پیام ارسال شود، یوزرنیم کانال را با @ وارد کنید (مثال: `@mychannel`).</li>
                        <li>اگر کانال خصوصی است، ابتدا ربات خود را به عنوان ادمین به کانال اضافه کنید. سپس یک پیام در کانال ارسال کنید. بعد به آدرس زیر در مرورگر بروید (توکن خود را جایگزین کنید):<br/><code className="bg-gray-900 p-1 rounded text-xs break-all">https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getUpdates</code><br/>در پاسخ JSON، شناسه چت (chat id) را پیدا کنید که یک عدد منفی طولانی است. آن را کپی و وارد کنید.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};
export default TelegramBotSettings;