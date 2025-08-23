
import React from 'react';
import { backendFiles } from '../../data/fileContent';

const DownloadButton: React.FC<{ content: string; filename: string; folder?: string }> = ({ content, filename, folder }) => {
    const handleDownload = () => {
        const mimeType = filename.endsWith('.yml') ? 'application/x-yaml' : 'application/javascript';
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
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
           دانلود {folder ? `${folder}/` : ''}{filename}
        </button>
    );
};

const GitHubSettings: React.FC = () => {
    return (
         <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
            <div>
                <h2 className="text-xl font-bold mb-2 text-cyan-300">یکپارچه‌سازی با GitHub Actions</h2>
                <p className="text-sm text-gray-400">
                   از GitHub Actions برای اجرای وظایف خودکار مانند جمع‌آوری روزانه اخبار و ذخیره آن‌ها در ریپازیتوری خود استفاده کنید.
                </p>
            </div>

            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">فایل‌های ورک‌فلو</h3>
                 <p className="text-sm text-gray-300">
                    این فایل‌ها یک ورک‌فلو (Workflow) را تعریف می‌کنند که به صورت روزانه اجرا شده و یک اسکریپت Node.js را برای دریافت اخبار فراخوانی می‌کند.
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                    <DownloadButton content={backendFiles.githubActionYml} filename="main.yml" folder=".github/workflows" />
                    <DownloadButton content={backendFiles.githubActionJs} filename="main.js" folder="github" />
                </div>
            </div>

            <div>
                <h4 className="font-semibold text-cyan-200 mb-2">راهنمای راه‌اندازی:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300 bg-gray-900/50 p-4 rounded-lg">
                    <li>یک ریپازیتوری جدید در گیت‌هاب بسازید.</li>
                    <li>در ریپازیتوری خود، یک پوشه به نام `.github` و داخل آن یک پوشه دیگر به نام `workflows` ایجاد کنید.</li>
                    <li>فایل `main.yml` را که دانلود کرده‌اید، داخل پوشه `.github/workflows` قرار دهید.</li>
                    <li>یک پوشه به نام `github` در ریشه ریپازیتوری بسازید و فایل `main.js` را داخل آن قرار دهید.</li>
                    <li>به تنظیمات ریپازیتوری خود بروید (Settings) و از منوی سمت چپ به بخش "Secrets and variables" و سپس "Actions" بروید.</li>
                    <li>یک "New repository secret" جدید با نام `GEMINI_API_KEY` بسازید و کلید API جمینای خود را در آن وارد کنید.</li>
                    <li>تغییرات را به ریپازیتوری خود push کنید.</li>
                    <li>ورک‌فلو به صورت خودکار هر روز در ساعت مشخص شده در فایل `.yml` اجرا می‌شود. همچنین می‌توانید آن را به صورت دستی از تب "Actions" در ریپازیتوری خود اجرا کنید.</li>
                </ol>
            </div>
        </div>
    );
};

export default GitHubSettings;
