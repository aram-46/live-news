import React, { useState } from 'react';
import { TwitterSettings } from '../../types';
import { TwitterIcon, CheckCircleIcon, CloseIcon } from '../icons';
import { testTwitterConnection } from '../../services/integrationService';
import { backendFiles } from '../../data/fileContent';

interface TwitterBotSettingsProps {
  settings: TwitterSettings;
  onSettingsChange: (settings: TwitterSettings) => void;
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

const TwitterBotSettings: React.FC<TwitterBotSettingsProps> = ({ settings, onSettingsChange }) => {
    const [status, setStatus] = useState<TestStatus>('idle');
    
    const handleChange = (field: keyof TwitterSettings, value: string) => {
        setStatus('idle');
        onSettingsChange({ ...settings, [field]: value });
    };

    const runTest = async () => {
        setStatus('testing');
        const success = await testTwitterConnection(settings);
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
                <TwitterIcon className="w-8 h-8 text-cyan-300"/>
                <div>
                    <h2 className="text-xl font-bold text-cyan-300">اتصال به ربات توییتر (X)</h2>
                    <p className="text-sm text-gray-400">ربات توییتر خود را برای انتشار خودکار اخبار به صورت رشته توییت متصل کنید.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left side: Settings */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-cyan-200">پیکربندی</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="password" value={settings.apiKey} onChange={(e) => handleChange('apiKey', e.target.value)} placeholder="API Key" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        <input type="password" value={settings.apiSecretKey} onChange={(e) => handleChange('apiSecretKey', e.target.value)} placeholder="API Secret Key" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        <input type="password" value={settings.accessToken} onChange={(e) => handleChange('accessToken', e.target.value)} placeholder="Access Token" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        <input type="password" value={settings.accessTokenSecret} onChange={(e) => handleChange('accessTokenSecret', e.target.value)} placeholder="Access Token Secret" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={runTest} disabled={!settings.apiKey || status === 'testing'} className="text-sm bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                        <div className="w-5 h-5">{renderStatusIcon(status)}</div>
                    </div>
                     <div className="pt-4 border-t border-cyan-400/20">
                         <h4 className="font-semibold text-cyan-200 mb-2">نیاز به بک‌اند</h4>
                         <p className="text-xs text-gray-400">
                             برای ارسال توییت به صورت خودکار، نیاز به یک محیط بک‌اند برای اجرای کدها دارید. برای این کار می‌توانید از Cloudflare Workers استفاده کنید که روی یک زمانبندی مشخص (Cron Trigger) اجرا می‌شود.
                         </p>
                        <CollapsibleSection title="راهنمای راه‌اندازی با Cloudflare Workers">
                            <p className="text-xs text-gray-300 mb-3">
                                این راهنما به شما کمک می‌کند یک ورکر زمان‌بندی شده بسازید که به صورت خودکار اخبار را توییت می‌کند.
                            </p>
                            <div className="space-y-3 text-xs text-gray-300">
                                <div className="flex items-center gap-2">
                                    <span>۱. فایل ورکر را دانلود کنید:</span>
                                    <DownloadButton content={backendFiles.twitterBotWorkerJs} filename="twitter-worker.js" />
                                </div>
                                <p>۲. به دلیل پیچیدگی احراز هویت توییتر، این فایل یک اسکلت آماده است و بخش ارسال توییت آن نیاز به تکمیل دارد.</p>
                                <p>۳. به تب <strong className="text-amber-300">"نصب و راه‌اندازی"</strong> و سپس بخش <strong className="text-amber-300">"کلودفلر"</strong> بروید و یک ورکر جدید بسازید و کد دانلود شده را در آن قرار دهید.</p>
                                <p>۴. در تنظیمات ورکر (Settings -&gt; Variables)، کلیدهای زیر را به عنوان Secret (با فعال کردن Encrypt) اضافه کنید:</p>
                                <ul className="list-disc list-inside pl-4 font-mono text-cyan-300 text-[11px]">
                                    <li>GEMINI_API_KEY</li>
                                    <li>TWITTER_API_KEY</li>
                                    <li>TWITTER_API_SECRET_KEY</li>
                                    <li>TWITTER_ACCESS_TOKEN</li>
                                    <li>TWITTER_ACCESS_TOKEN_SECRET</li>
                                </ul>
                                <p>۵. به تب Triggers در تنظیمات ورکر بروید و یک **Cron Trigger** اضافه کنید. برای اجرا در هر ساعت، از عبارت `0 * * * *` استفاده کنید.</p>
                                <p>۶. <strong>مرحله نهایی (برای توسعه‌دهندگان):</strong> تابع `postTweet` را در فایل `twitter-worker.js` کامل کنید. این کار نیازمند پیاده‌سازی امضای OAuth 1.0a با استفاده از Web Crypto API است.</p>
                            </div>
                        </CollapsibleSection>
                    </div>
                </div>
                {/* Right side: Guide */}
                <div className="space-y-3 p-4 bg-gray-800/50 rounded-lg">
                    <h3 className="font-semibold text-cyan-200 text-base mb-2">راهنمای دریافت اطلاعات</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                        <li>به پورتال توسعه‌دهندگان توییتر (X) در <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">developer.twitter.com</a> بروید و با اکانت خود وارد شوید.</li>
                        <li>یک پروژه (Project) و سپس یک اپلیکیشن (App) جدید بسازید. دسترسی‌های مورد نیاز (مانند Read و Write) را برای اپلیکیشن فعال کنید.</li>
                        <li>پس از ساخت اپلیکیشن، به بخش 'Keys and Tokens' بروید.</li>
                        <li>مقادیر 'API Key', 'API Secret Key', 'Access Token', و 'Access Token Secret' را تولید (generate) کرده، کپی و در فیلدهای مربوطه در این برنامه وارد کنید.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};
export default TwitterBotSettings;