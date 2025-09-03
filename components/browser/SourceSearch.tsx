import React, { useState } from 'react';
import { AppSettings, Source, SourceCategory, sourceCategoryLabels } from '../../types';
import { BrowserIcon, SearchIcon, PlusIcon } from '../icons';

interface SourceSearchProps {
    settings: AppSettings;
}

const SourceSearch: React.FC<SourceSearchProps> = ({ settings }) => {
    const [query, setQuery] = useState('');
    const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
    const [openCategories, setOpenCategories] = useState<Record<SourceCategory, boolean>>({
        'news-agencies': true,
        'fact-check': true,
        'social-media': false,
        'financial': false,
        'analytical': false,
    });

    const allSources = Object.values(settings.sources).flat();

    const handleToggleSource = (sourceId: string) => {
        setSelectedSourceIds(prev =>
            prev.includes(sourceId)
                ? prev.filter(id => id !== sourceId)
                : [...prev, sourceId]
        );
    };
    
    const handleToggleCategory = (category: SourceCategory) => {
        setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || selectedSourceIds.length === 0) return;

        const selectedSources = allSources.filter(source => selectedSourceIds.includes(source.id));

        selectedSources.forEach(source => {
            const searchUrl = `https://www.google.com/search?q=site:${encodeURIComponent(source.url)}+${encodeURIComponent(query)}`;
            window.open(searchUrl, '_blank', 'noopener,noreferrer');
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-xl font-bold mb-4 text-cyan-300 flex items-center gap-3">
                <BrowserIcon className="w-6 h-6" />
                بررسی دستی در مرورگر
            </h2>
            <p className="text-sm text-gray-400 mb-6">
                موضوع مورد نظر خود را در منابع معتبر جستجو کنید. برای هر منبع انتخاب شده، یک تب جدید در مرورگر شما باز خواهد شد.
            </p>

            <div className="p-3 mb-6 text-xs text-amber-300 bg-amber-900/30 border border-amber-500/30 rounded-lg">
                <strong>توجه:</strong> برای عملکرد صحیح این بخش، مرورگر شما باید اجازه باز شدن چند پنجره‌ی پاپ-آپ (Pop-up) را به این سایت بدهد.
            </div>

            <form onSubmit={handleSearch} className="space-y-6">
                <div>
                    <label htmlFor="browser-use-query" className="block text-sm font-medium text-cyan-300 mb-2">موضوع برای جستجو</label>
                    <div className="relative">
                        <input
                            id="browser-use-query"
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="مثال: منشاء ویروس کرونا"
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5 pr-10"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-gray-400"/>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-cyan-300">انتخاب منابع</label>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setSelectedSourceIds(allSources.map(s => s.id))} className="text-xs text-blue-400 hover:underline">انتخاب همه</button>
                            <button type="button" onClick={() => setSelectedSourceIds([])} className="text-xs text-red-400 hover:underline">لغو انتخاب همه</button>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto p-2 bg-gray-900/40 rounded-lg">
                        {(Object.keys(sourceCategoryLabels) as SourceCategory[]).map(category => (
                            <div key={category} className="bg-gray-800/40 rounded-lg border border-gray-700/50">
                                <button type="button" onClick={() => handleToggleCategory(category)} className="w-full flex justify-between items-center p-3 text-right">
                                    <span className="font-semibold text-cyan-300">{sourceCategoryLabels[category]}</span>
                                    <PlusIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${openCategories[category] ? 'rotate-45' : ''}`} />
                                </button>
                                {openCategories[category] && (
                                    <div className="p-3 border-t border-gray-700/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {settings.sources[category].map(source => (
                                            <label key={source.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSourceIds.includes(source.id)}
                                                    onChange={() => handleToggleSource(source.id)}
                                                    className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-cyan-500 focus:ring-cyan-600"
                                                />
                                                <span className="text-sm text-gray-300">{source.name}</span>
                                            </label>
                                        ))}
                                        {settings.sources[category].length === 0 && <p className="text-xs text-gray-500 col-span-full">منبعی در این دسته وجود ندارد.</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                
                <button
                    type="submit"
                    disabled={!query.trim() || selectedSourceIds.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
                >
                    <SearchIcon className="w-5 h-5"/>
                    جستجو در تب‌های جدید
                </button>
            </form>
        </div>
    );
};

export default SourceSearch;
