import React, { useState, useCallback, useRef } from 'react';
import { AppSettings, ArticleSearchResult } from '../types';
import { generateArticleKeywords, fetchArticles } from '../services/geminiService';
import { saveHistoryItem } from '../services/historyService';
import { SearchIcon, MagicIcon, TrashIcon, BeakerIcon, NewsIcon } from './icons';
import ArticleViewerModal from './ArticleViewerModal';

interface ArticleSearchProps {
    settings: AppSettings;
}

type ArticleSubTab = 'academic' | 'journalistic';

const ArticleSearch: React.FC<ArticleSearchProps> = ({ settings }) => {
    const [subTab, setSubTab] = useState<ArticleSubTab>('academic');
    const [topic, setTopic] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [languages, setLanguages] = useState<string[]>(['فارسی']);
    const [results, setResults] = useState<ArticleSearchResult[]>([]);
    const [selectedArticleUrl, setSelectedArticleUrl] = useState<string | null>(null);

    const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateKeywords = useCallback(async () => {
        if (!topic.trim()) {
            alert('لطفاً ابتدا موضوع اصلی را وارد کنید.');
            return;
        }
        setIsKeywordsLoading(true);
        try {
            const newKeywords = await generateArticleKeywords(topic, settings);
            setKeywords(prev => [...new Set([...prev, ...newKeywords])]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در تولید کلمات کلیدی.');
        } finally {
            setIsKeywordsLoading(false);
        }
    }, [topic, settings]);

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        try {
            const instruction = settings.aiInstructions[subTab === 'academic' ? 'article-search-academic' : 'article-search-journalistic'];
            const apiResults = await fetchArticles(topic, keywords, languages, subTab, instruction, settings);
            setResults(apiResults);

            saveHistoryItem({
                type: `article-${subTab}`,
                query: topic,
                resultSummary: `${apiResults.length} مقاله یافت شد.`,
                data: { results: apiResults, keywords, languages },
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در دریافت مقالات.');
        } finally {
            setIsLoading(false);
        }
    }, [topic, keywords, languages, subTab, settings]);

    const handleLanguageToggle = (lang: string) => {
        setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
    };

    const renderSubTabButton = (tabId: ArticleSubTab, label: string, icon: React.ReactNode) => (
        <button
            onClick={() => setSubTab(tabId)}
            className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                subTab === tabId ? 'border-cyan-400 text-cyan-300 bg-gray-800/50' : 'border-transparent text-gray-400 hover:bg-gray-700/50'
            }`}
        >
            {icon} {label}
        </button>
    );

    return (
        <>
            {selectedArticleUrl && (
                <ArticleViewerModal 
                    url={selectedArticleUrl}
                    settings={settings}
                    onClose={() => setSelectedArticleUrl(null)}
                />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                    <form onSubmit={handleSearch} className="space-y-4">
                        <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="موضوع مقاله را وارد کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium text-cyan-300">کلمات کلیدی</label>
                                <button type="button" onClick={handleGenerateKeywords} disabled={isKeywordsLoading} className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 disabled:opacity-50">
                                    {isKeywordsLoading ? <svg className="animate-spin h-4 w-4" /> : <MagicIcon className="w-4 h-4" />} تولید
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/50 rounded-lg">
                                {keywords.map((kw, i) => <div key={i} className="flex items-center gap-1 bg-gray-700 text-xs px-2 py-1 rounded-full">{kw} <button type="button" onClick={() => setKeywords(k => k.filter((_, idx) => idx !== i))}><TrashIcon className="w-3 h-3 text-red-400"/></button></div>)}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-cyan-300 mb-2">زبان</label>
                            <div className="flex flex-wrap gap-2">
                                {['فارسی', 'انگلیسی', 'عربی', 'سایر'].map(lang => (
                                    <button key={lang} type="button" onClick={() => handleLanguageToggle(lang)} className={`px-3 py-1 text-xs rounded-full border ${languages.includes(lang) ? 'bg-cyan-500/20 border-cyan-400' : 'bg-gray-700 border-gray-600'}`}>
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg disabled:bg-cyan-800">
                            <SearchIcon className="w-5 h-5"/> {isLoading ? 'در حال جستجو...' : 'جستجو'}
                        </button>
                    </form>
                </div>
                <div className="lg:col-span-2">
                    <div className="flex bg-gray-900/30 rounded-t-lg">
                        {renderSubTabButton('academic', 'مقالات علمی و دانشگاهی', <BeakerIcon className="w-5 h-5"/>)}
                        {renderSubTabButton('journalistic', 'مقالات خبری و ژورنالیستی', <NewsIcon className="w-5 h-5"/>)}
                    </div>
                    <div className="p-4 bg-gray-800/30 border border-t-0 border-gray-600/30 rounded-b-lg min-h-[400px]">
                        {isLoading && <p className="text-center text-gray-400">در حال جستجو...</p>}
                        {error && <p className="text-center text-red-400">{error}</p>}
                        {!isLoading && results.length === 0 && <p className="text-center text-gray-500">نتایج در اینجا نمایش داده می‌شوند.</p>}
                        <div className="space-y-3">
                            {results.map((res, i) => (
                                <button key={i} onClick={() => setSelectedArticleUrl(res.link)} className="w-full text-right p-3 bg-gray-900/50 hover:bg-gray-700/50 rounded-lg transition-colors">
                                    <h4 className="font-bold text-cyan-300">{res.title}</h4>
                                    <p className="text-xs text-gray-400 truncate">{res.link}</p>
                                    <p className="text-sm text-gray-300 mt-1">{res.summary}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ArticleSearch;