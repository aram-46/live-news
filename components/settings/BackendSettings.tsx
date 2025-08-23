
import React from 'react';
import { backendFiles } from '../../data/fileContent';

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => (
    <pre className="bg-gray-900 rounded-md p-4 overflow-x-auto">
        <code className={`language-${lang} text-sm text-cyan-200`}>{code}</code>
    </pre>
);

const DownloadButton: React.FC<{ content: string; filename: string }> = ({ content, filename }) => {
    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
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

const BackendSettings: React.FC = () => {
    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
            <div>
                <h2 className="text-xl font-bold mb-2 text-cyan-300">بک‌اند و دیتابیس</h2>
                <p className="text-sm text-gray-400">
                    در این بخش می‌توانید فایل‌های مورد نیاز برای راه‌اندازی سرور بک‌اند و دیتابیس برنامه را دانلود کرده و راهنمای استفاده از آن‌ها را مطالعه کنید.
                </p>
            </div>

            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">فایل‌های سرور (Node.js)</h3>
                <p className="text-sm text-gray-300">
                    این فایل‌ها یک سرور ساده با استفاده از Express.js راه‌اندازی می‌کنند که می‌تواند به وبهوک‌های تلگرام پاسخ دهد.
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                    <DownloadButton content={backendFiles.packageJson} filename="package.json" />
                    <DownloadButton content={backendFiles.serverJs} filename="server.js" />
                </div>
                 <div>
                    <h4 className="font-semibold text-cyan-200 mb-2">راهنمای راه‌اندازی سرور:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300 bg-gray-900/50 p-4 rounded-lg">
                        <li>یک پوشه جدید برای بک‌اند خود بسازید و فایل‌های `package.json` و `server.js` را در آن قرار دهید.</li>
                        <li>ترمینال یا Command Prompt را در آن پوشه باز کرده و دستور `npm install` را برای نصب پکیج‌های مورد نیاز اجرا کنید.</li>
                        <li>یک فایل با نام `.env` بسازید و توکن ربات تلگرام خود را در آن قرار دهید: `TELEGRAM_BOT_TOKEN=...`</li>
                        <li>سرور را با دستور `node server.js` اجرا کنید.</li>
                        <li>برای استفاده از وبهوک، باید سرور خود را روی یک هاست با آدرس عمومی (Public URL) قرار دهید.</li>
                    </ol>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">فایل دیتابیس (SQL)</h3>
                <p className="text-sm text-gray-300">
                    این فایل شامل دستورات SQL برای ایجاد جداول اولیه مورد نیاز برنامه (برای ذخیره منابع، اخبار و تنظیمات) است.
                </p>
                 <div className="flex flex-wrap gap-4 items-center">
                    <DownloadButton content={backendFiles.schemaSql} filename="schema.sql" />
                </div>
                 <div>
                    <h4 className="font-semibold text-cyan-200 mb-2">راهنمای استفاده از فایل دیتابیس:</h4>
                     <p className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded-lg">
                        فایل `schema.sql` را در دیتابیس خود (مانند PostgreSQL, MySQL, یا phpMyAdmin) ایمپورت (Import) کنید تا جداول به صورت خودکار ساخته شوند.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BackendSettings;
