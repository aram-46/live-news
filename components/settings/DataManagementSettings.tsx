import React, { useState, useRef } from 'react';
import { AppSettings } from '../../types';
import { TrashIcon, DownloadIcon, ImportIcon } from '../icons';
import { clearAll as clearApiCache } from '../../services/cacheService';
import { clearHistory as clearSearchHistoryService } from '../../services/historyService';
import { exportToJson } from '../../services/exportService';

interface DataManagementSettingsProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
}

const DataManagementSettings: React.FC<DataManagementSettingsProps> = ({ settings, onSettingsChange }) => {
    const [feedback, setFeedback] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const showFeedback = (message: string) => {
        setFeedback(message);
        setTimeout(() => setFeedback(''), 4000);
    };

    const handleClearApiCache = () => {
        if (window.confirm('آیا مطمئن هستید؟ این کار باعث می‌شود برنامه در دفعات بعدی تمام اطلاعات را مجدداً از اینترنت دریافت کند.')) {
            clearApiCache();
            showFeedback('حافظه پنهان API با موفقیت پاک شد.');
        }
    };

    const handleClearSearchHistory = () => {
        if (window.confirm('آیا از حذف کامل تاریخچه جستجوهای خود اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
            clearSearchHistoryService();
            showFeedback('تاریخچه جستجو با موفقیت پاک شد.');
        }
    };
    
    const handleClearCryptoFavorites = () => {
        if (window.confirm('آیا از حذف لیست ارزهای دیجیتال مورد علاقه خود اطمینان دارید؟')) {
            localStorage.removeItem('crypto-favorites');
            showFeedback('لیست علاقه‌مندی‌های ارز دیجیتال پاک شد.');
        }
    };

    const handleExportSettings = () => {
        exportToJson(settings, 'smart-news-settings-backup');
        showFeedback('فایل پشتیبان تنظیمات با موفقیت ایجاد شد.');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File not readable");
                
                const importedSettings = JSON.parse(text);
                if (!importedSettings.theme || !importedSettings.aiInstructions) {
                    throw new Error("Invalid settings file format.");
                }

                if (window.confirm('آیا مطمئن هستید؟ با این کار تمام تنظیمات فعلی شما بازنویسی خواهد شد و صفحه مجدداً بارگذاری می‌شود.')) {
                    onSettingsChange(importedSettings);
                    showFeedback('تنظیمات با موفقیت بارگذاری شد. صفحه در حال بارگذاری مجدد است...');
                    setTimeout(() => window.location.reload(), 2000);
                }

            } catch (error: any) {
                console.error("Failed to import settings:", error);
                alert(`خطا در بارگذاری فایل تنظیمات. (${error.message})`);
            } finally {
                if(event.target) event.target.value = "";
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-xl font-bold mb-2 text-cyan-300">مدیریت داده‌ها و تنظیمات</h2>
            <p className="text-sm text-gray-400 mb-6">
                در این بخش می‌توانید داده‌های ذخیره شده در مرورگر و کل تنظیمات برنامه را مدیریت کنید.
            </p>

            <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                        <h3 className="font-semibold text-cyan-200">پشتیبان‌گیری و بازیابی تنظیمات</h3>
                        <p className="text-xs text-gray-400">از تمام تنظیمات برنامه (تم، منابع، AI و...) خروجی JSON بگیرید یا فایل پشتیبان را بازیابی کنید.</p>
                    </div>
                     <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                     <div className="mt-2 sm:mt-0 flex items-center gap-2">
                        <button onClick={handleImportClick} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm">
                            <ImportIcon className="w-4 h-4" /><span>بازیابی</span>
                        </button>
                        <button onClick={handleExportSettings} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm">
                            <DownloadIcon className="w-4 h-4" /><span>پشتیبان‌گیری</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                        <h3 className="font-semibold text-cyan-200">حافظه پنهان API</h3>
                        <p className="text-xs text-gray-400">پاک کردن نتایج ذخیره شده از درخواست‌های API (مانند اخبار زنده) برای دریافت آخرین اطلاعات.</p>
                    </div>
                    <button onClick={handleClearApiCache} className="mt-2 sm:mt-0 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm">
                        <TrashIcon className="w-4 h-4" />
                        <span>پاک کردن کش</span>
                    </button>
                </div>
                
                 <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                        <h3 className="font-semibold text-cyan-200">تاریخچه جستجو</h3>
                        <p className="text-xs text-gray-400">تمام موارد ذخیره شده در تب "تاریخچه" را حذف می‌کند.</p>
                    </div>
                    <button onClick={handleClearSearchHistory} className="mt-2 sm:mt-0 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm">
                        <TrashIcon className="w-4 h-4" />
                        <span>پاک کردن تاریخچه</span>
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                        <h3 className="font-semibold text-cyan-200">علاقه‌مندی‌های ارز دیجیتال</h3>
                        <p className="text-xs text-gray-400">لیست ارزهای دیجیتالی که به عنوان مورد علاقه ذخیره کرده‌اید را حذف می‌کند.</p>
                    </div>
                    <button onClick={handleClearCryptoFavorites} className="mt-2 sm:mt-0 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm">
                        <TrashIcon className="w-4 h-4" />
                        <span>پاک کردن لیست</span>
                    </button>
                </div>
                
            </div>
             {feedback && (
                <div className="mt-4 text-center text-sm text-green-300 bg-green-900/50 p-2 rounded-lg">
                    {feedback}
                </div>
            )}
        </div>
    );
};

export default DataManagementSettings;