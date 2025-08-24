import React from 'react';
import { backendFiles } from '../../data/fileContent';

const DownloadButton: React.FC<{ content: string; filename: string; mimeType?: string }> = ({ content, filename, mimeType = 'application/javascript;charset=utf-8' }) => {
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
    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
            <div>
                <h2 className="text-xl font-bold mb-2 text-cyan-300">استقرار روی Cloudflare Workers</h2>
                <p className="text-sm text-gray-400">
                    ربات تلگرام خود را به صورت Serverless و با هزینه بسیار پایین (یا رایگان) روی زیرساخت کلودفلر اجرا کنید.
                </p>
            </div>

            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">روش اول: راه‌اندازی دستی از طریق داشبورد</h3>
                <p className="text-sm text-gray-300">این روش ساده‌ترین راه برای راه‌اندازی سریع ورکر از طریق رابط کاربری وب کلودفلر است.</p>
                <div className="flex flex-wrap gap-4 items-center">
                    <DownloadButton content={backendFiles.workerJs} filename="worker.js" />
                </div>
                 <div>
                    <h4 className="font-semibold text-cyan-200 mb-2">راهنمای راه‌اندازی دستی:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300 bg-gray-900/50 p-4 rounded-lg">
                        <li>وارد داشبورد Cloudflare خود شوید و به بخش Workers & Pages بروید.</li>
                        <li>یک سرویس ورکر جدید (Create service) بسازید.</li>
                        <li>پس از ساخت، روی دکمه "Quick edit" کلیک کنید تا ویرایشگر کد باز شود.</li>
                        <li>محتوای فایل `worker.js` را که دانلود کرده‌اید، در ویرایشگر جای‌گذاری کنید.</li>
                        <li>به تنظیمات ورکر (Settings) و سپس بخش "Variables" بروید.</li>
                        <li>دو متغیر محرمانه (Secret variable) با نام‌های `TELEGRAM_BOT_TOKEN` و `GEMINI_API_KEY` اضافه کرده و مقادیر آن‌ها را وارد کنید.</li>
                        <li>ورکر خود را با زدن دکمه "Save and deploy" ذخیره و مستقر کنید.</li>
                        <li>آدرس ورکر شما چیزی شبیه به `your-worker-name.your-account.workers.dev` خواهد بود.</li>
                        <li>در نهایت، وبهوک تلگرام را با مراجعه به آدرس زیر در مرورگر خود تنظیم کنید (اطلاعات خود را جایگزین کنید):<br/>
                            <code className="text-xs text-amber-300 break-all">
                                https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook?url=https://[YOUR_WORKER_URL]/
                            </code>
                        </li>
                    </ol>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">روش دوم: استقرار از طریق Wrangler CLI (پیشرفته)</h3>
                <p className="text-sm text-gray-300">
                    برای استقرار خودکار و مدیریت بهتر، می‌توانید از ابزار خط فرمان کلودفلر به نام Wrangler استفاده کنید. برای این کار به Node.js و npm نیاز دارید.
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                    <DownloadButton content={backendFiles.wranglerToml} filename="wrangler.toml" mimeType="text/plain;charset=utf-8" />
                </div>
                <div>
                    <h4 className="font-semibold text-cyan-200 mb-2">راهنمای استقرار با Wrangler:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300 bg-gray-900/50 p-4 rounded-lg">
                        <li>فایل `wrangler.toml` را دانلود کرده و در ریشه اصلی پروژه خود قرار دهید. همچنین فایل `worker.js` را در پوشه `cloudflare` داشته باشید.</li>
                        <li>Wrangler را با دستور <code className="text-amber-300">npm install -g wrangler</code> به صورت سراسری نصب کنید.</li>
                        <li>با دستور <code className="text-amber-300">wrangler login</code> به حساب کاربری کلودفلر خود متصل شوید.</li>
                        <li>کلیدهای محرمانه خود را با دستورات زیر از طریق ترمینال تنظیم کنید:<br />
                            <code className="text-xs text-amber-300 block my-1">wrangler secret put TELEGRAM_BOT_TOKEN</code><br />
                            <code className="text-xs text-amber-300 block">wrangler secret put GEMINI_API_KEY</code>
                        </li>
                        <li>ورکر را با دستور <code className="text-amber-300">wrangler deploy</code> مستقر کنید. Wrangler به صورت خودکار یک ورکر جدید بر اساس نام موجود در `wrangler.toml` ایجاد یا ورکر موجود را بروزرسانی می‌کند.</li>
                        <li>در نهایت، وبهوک تلگرام را مطابق راهنمای روش اول تنظیم کنید.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default CloudflareSettings;