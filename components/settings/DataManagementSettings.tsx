
import React, { useState } from 'react';
import { TrashIcon } from '../icons';
import { clearAll as clearApiCache } from '../../services/cacheService';

const DataManagementSettings: React.FC = () => {
    const [feedback, setFeedback] = useState('');

    const showFeedback = (message: string) => {
        setFeedback(message);
        setTimeout(() => setFeedback(''), 3000);
    };

    const handleClearApiCache = () => {
        if (window.confirm('آیا مطمئن هستید؟ این کار باعث می‌شود برنامه در دفعات بعدی تمام اطلاعات را مجدداً از اینترنت دریافت کند.')) {
            clearApiCache();
            showFeedback('حافظه پنهان API با موفقیت پاک شد.');
        }
    };

    const handleClearSearchHistory = () => {
        if (window.confirm('آیا از حذف کامل تاریخچه جستجوهای خود اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
            localStorage.removeItem('search-history');
            showFeedback('تاریخچه جستجو با موفقیت پاک شد.');
        }
    };
    
    const handleClearCryptoFavorites = () => {
        if (window.confirm('آیا از حذف لیست ارزهای دیجیتال مورد علاقه خود اطمینان دارید؟')) {
            localStorage.removeItem('crypto-favorites');
            showFeedback('لیست علاقه‌مندی‌های ارز دیجیتال پاک شد.');
        }
    };


    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-xl font-bold mb-2 text-cyan-300">مدیریت داده‌ها</h2>
            <p className="text-sm text-gray-400 mb-6">
                در این بخش می‌توانید داده‌هایی که برنامه در مرورگر شما ذخیره می‌کند را مدیریت کنید.
            </p>

            <div className="space-y-4">
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
