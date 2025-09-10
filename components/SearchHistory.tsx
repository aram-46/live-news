import React, { useState } from 'react';
import { AppSettings, SearchHistoryItem, generateUUID } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TrashIcon, SearchIcon, StarIcon, DownloadIcon } from './icons';

interface SearchHistoryProps {
  settings: AppSettings;
}

type HistoryFilter = 'all' | 'news' | 'fact-check' | 'analyzer' | 'browser-agent' | 'live-news' | 'rss-feed';

const historyTypeLabels: Record<string, string> = {
    'news': 'جستجوی اخبار',
    'fact-check': 'فکت چک',
    'analyzer': 'تحلیل‌گر',
    'browser-agent': 'عامل هوشمند',
    'live-news': 'اخبار روز',
    'stats': 'آمار',
    'science': 'علمی',
    'religion': 'دینی',
    'rss-feed': 'خبرخوان',
};


const SearchHistory: React.FC<SearchHistoryProps> = ({ settings }) => {
  const [history, setHistory] = useLocalStorage<SearchHistoryItem[]>('search-history', [
      // Dummy data for demonstration
      { id: generateUUID(), type: 'news', query: 'تحولات هوش مصنوعی در سال ۲۰۲۴', timestamp: Date.now() - 86400000, resultSummary: '۱۲ مقاله پیدا شد. اولین نتیجه: "گوگل مدل جمینای جدید را معرفی کرد"', isFavorite: true },
      { id: generateUUID(), type: 'fact-check', query: 'ادعای مربوط به رویداد اخیر در شبکه های اجتماعی', timestamp: Date.now() - 172800000, resultSummary: 'نتیجه کلی: نیازمند بررسی. ۳ منبع معتبر یافت شد.', isFavorite: false },
      { id: generateUUID(), type: 'analyzer', query: 'تحلیل مناظره سیاسی', timestamp: Date.now() - 200000000, resultSummary: 'تحلیل از دیدگاه موافق ارائه شد.', isFavorite: false },
      { id: generateUUID(), type: 'browser-agent', query: 'خلاصه کردن مقاله در مورد تاریخچه اینترنت', timestamp: Date.now() - 220000000, resultSummary: 'خلاصه در ۳ پاراگراف تولید شد.', isFavorite: false },
      { id: generateUUID(), type: 'stats', query: 'نرخ تورم در ایران', timestamp: Date.now() - 259200000, resultSummary: 'نمودار خطی تولید شد. منبع اصلی: مرکز آمار ایران.', isFavorite: false },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all');
  const [showFavorites, setShowFavorites] = useState(false);

  const handleToggleFavorite = (id: string) => {
    setHistory(history.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('آیا از حذف این مورد اطمینان دارید؟')) {
      setHistory(history.filter(item => item.id !== id));
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('آیا از حذف کل تاریخچه اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
      setHistory([]);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'search-history-backup.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const filteredHistory = history
    .filter(item => {
        if (activeFilter !== 'all' && item.type !== activeFilter) {
            return false;
        }
        if (showFavorites && !item.isFavorite) {
            return false;
        }
        if (searchTerm.trim() === '') {
            return true;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
            item.query.toLowerCase().includes(lowerSearchTerm) ||
            item.type.toLowerCase().includes(lowerSearchTerm) ||
            item.resultSummary.toLowerCase().includes(lowerSearchTerm)
        );
    })
    .sort((a, b) => b.timestamp - a.timestamp);

    const filterButtons: {id: HistoryFilter, label: string}[] = [
        {id: 'all', label: 'همه'},
        {id: 'news', label: 'اخبار'},
        {id: 'rss-feed', label: 'خبرخوان'},
        {id: 'fact-check', label: 'فکت چک'},
        {id: 'analyzer', label: 'تحلیل‌گر'},
        {id: 'browser-agent', label: 'عامل هوشمند'},
    ];


  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-cyan-300">تاریخچه فعالیت‌ها</h2>
        <div className="flex items-center gap-2">
           <button onClick={handleExport} className="text-sm flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg transition"><DownloadIcon className="w-4 h-4" /> پشتیبان‌گیری</button>
           <button onClick={handleClearHistory} className="text-sm flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg transition"><TrashIcon className="w-4 h-4" /> پاک کردن همه</button>
        </div>
      </div>
      
       <div className="mb-4 space-y-4">
         <div className="flex flex-wrap gap-2 p-2 bg-gray-900/30 rounded-lg">
            {filterButtons.map(btn => (
                <button key={btn.id} onClick={() => setActiveFilter(btn.id)} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${activeFilter === btn.id ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                   {btn.label}
                </button>
            ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
                <input 
                    type="text" 
                    placeholder="جستجو در تاریخچه..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5 pl-10"
                />
                <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
            </div>
            <button onClick={() => setShowFavorites(!showFavorites)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${showFavorites ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-700/50 text-gray-300'}`}>
                <StarIcon className="w-5 h-5"/>
                <span>نمایش موارد دلخواه</span>
            </button>
        </div>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {filteredHistory.length > 0 ? filteredHistory.map(item => (
            <div key={item.id} className="p-3 bg-gray-800/50 rounded-lg flex items-start gap-3 group">
                <div className="flex-grow">
                    <div className="flex items-center gap-3 text-xs mb-1">
                        <span className="font-bold text-cyan-300 uppercase bg-cyan-900/50 px-2 py-0.5 rounded-full">{historyTypeLabels[item.type] || item.type}</span>
                        <span className="text-gray-400">{new Date(item.timestamp).toLocaleString('fa-IR')}</span>
                    </div>
                    <p className="font-semibold text-gray-200">{item.query}</p>
                    <p className="text-sm text-gray-400 mt-1">{item.resultSummary}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleToggleFavorite(item.id)} className={item.isFavorite ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-300'} title="افزودن به موارد دلخواه">
                        <StarIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-gray-500 hover:text-red-400" title="حذف">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        )) : (
            <div className="text-center py-10 text-gray-500">
                <p>موردی در تاریخچه یافت نشد.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default SearchHistory;