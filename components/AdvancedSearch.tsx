
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Filters, NewsArticle, AppSettings, SearchTab, PodcastResult, StanceHolder, HostingSite } from '../types';
import { fetchNews, fetchPodcasts } from '../services/geminiService';
import FilterPanel from './FilterPanel';
import NewsResults from './NewsResults';
import { RefreshIcon, SparklesIcon, SpeakerWaveIcon, SearchIcon, ThumbsUpIcon, ThumbsDownIcon, LinkIcon, ClipboardIcon, CheckCircleIcon } from './icons';
import StructuredSearch from './StructuredSearch';
import WebSearch from './WebSearch';
import Converter from './Converter';
import ExportButton from './ExportButton';
import Suggestions from './Suggestions';
import GeneralTopicsSearch from './GeneralTopicsSearch';

// --- START: New Podcast Components defined in this file ---

const PodcastResultCard: React.FC<{ podcast: PodcastResult; onOpenUrl: (url: string) => void }> = ({ podcast, onOpenUrl }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(podcast.link);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <article className="p-5 bg-black/20 backdrop-blur-lg rounded-xl border border-cyan-400/10 shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:border-cyan-400/30 hover:shadow-cyan-700/20 flex flex-col relative group space-y-3">
            <header>
                <div className="flex justify-between items-start gap-4">
                    <h3 className="text-lg font-bold text-cyan-200 hover:text-white transition-colors">
                        <button onClick={() => onOpenUrl(podcast.link)}>{podcast.title}</button>
                    </h3>
                    <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full whitespace-nowrap">{podcast.topic}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                    <span>{podcast.publisher}</span> &bull; <span>{podcast.publicationYear}</span>
                </div>
            </header>
            <p className="text-gray-300 text-sm leading-relaxed">{podcast.summary}</p>
            
            <audio controls src={podcast.audioUrl} className="w-full h-10">
                مرورگر شما از پخش صدا پشتیبانی نمی‌کند. <a href={podcast.audioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">دانلود فایل</a>
            </audio>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-700/50">
                <div className="space-y-2">
                    <h5 className="flex items-center gap-2 font-semibold text-green-300"><ThumbsUpIcon className="w-4 h-4"/>موافقین</h5>
                    {podcast.proponents.map((p, i) => <div key={i} className="p-1.5 bg-green-900/30 rounded-md"><strong className="block text-green-200">{p.name}</strong><p className="text-gray-300">{p.argument}</p></div>)}
                    {podcast.proponents.length === 0 && <p className="text-gray-500">موردی یافت نشد.</p>}
                </div>
                <div className="space-y-2">
                    <h5 className="flex items-center gap-2 font-semibold text-red-300"><ThumbsDownIcon className="w-4 h-4"/>مخالفین</h5>
                    {podcast.opponents.map((o, i) => <div key={i} className="p-1.5 bg-red-900/30 rounded-md"><strong className="block text-red-200">{o.name}</strong><p className="text-gray-300">{o.argument}</p></div>)}
                    {podcast.opponents.length === 0 && <p className="text-gray-500">موردی یافت نشد.</p>}
                </div>
            </div>
            
            <footer className="pt-3 border-t border-gray-700/50 space-y-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onOpenUrl(podcast.link)}
                        className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-200 transition-colors bg-cyan-900/50 hover:bg-cyan-800/50 px-3 py-1.5 rounded-md text-sm"
                    >
                        <LinkIcon className="w-4 h-4" />
                        <span>صفحه اصلی پادکست</span>
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="p-2 rounded-md bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white"
                        aria-label="کپی لینک"
                    >
                        {isCopied ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                    </button>
                </div>

                {podcast.hostingSites && podcast.hostingSites.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-cyan-200 mb-2">سایر پلتفرم‌ها:</h4>
                        <div className="flex flex-wrap gap-2">
                            {podcast.hostingSites.map((site, i) => (
                                <a
                                    href={site.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    key={i}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-full transition-colors"
                                >
                                    {site.name}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </footer>
        </article>
    );
};

const PodcastSearch: React.FC<{ settings: AppSettings; onOpenUrl: (url: string) => void }> = ({ settings, onOpenUrl }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PodcastResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setIsLoading(true);
        setError(null);
        setResults([]);
        try {
            const apiResults = await fetchPodcasts(query, settings.aiInstructions['podcast-search']);
            setResults(apiResults);
        } catch (err) {
            setError('خطا در جستجوی پادکست. لطفا دوباره تلاش کنید.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <h2 className="text-xl font-bold text-cyan-300">جستجوی پادکست</h2>
                <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">عبارت جستجو</label>
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            rows={4}
                            placeholder="نام پادکست، گوینده، یا موضوع مورد نظر خود را وارد کنید..."
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5"
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                        {isLoading ? <svg className="animate-spin h-5 w-5"/> : <SearchIcon className="w-5 h-5"/>}
                        {isLoading ? 'در حال جستجو...' : 'جستجو'}
                    </button>
                </form>
            </div>
            <div className="lg:col-span-2" ref={resultsRef}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-300">نتایج</h2>
                    <ExportButton elementRef={resultsRef} data={results} title={query} type="podcast" disabled={isLoading || results.length === 0} />
                </div>
                <div className="space-y-4">
                    {isLoading && Array.from({length: 3}).map((_, i) => <div key={i} className="h-64 bg-black/20 rounded-xl border border-cyan-400/10 animate-pulse"></div>)}
                    {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                    {!isLoading && !error && results.length === 0 && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج جستجوی پادکست در اینجا نمایش داده خواهد شد.</p></div>}
                    {results.map((podcast, index) => (
                        <PodcastResultCard key={index} podcast={podcast} onOpenUrl={onOpenUrl} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- END: New Podcast Components ---


interface AdvancedSearchProps {
    settings: AppSettings;
    onOpenUrl: (url: string) => void;
    onSettingsChange: (settings: AppSettings) => void;
}


const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ settings, onOpenUrl, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<SearchTab>('news');

  // State for News Search
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<Filters>({ query: 'مهمترین اخبار ایران و جهان', categories: ['all'], regions: ['all'], sources: ['all'] });
  const [hiddenArticleLinks, setHiddenArticleLinks] = useState<string[]>([]);
  const newsResultsRef = useRef<HTMLDivElement>(null);
  
  const handleNewsSearch = useCallback(async (filters: Filters) => {
    setCurrentFilters(filters);
    setHiddenArticleLinks([]); // Reset hidden articles on new search
    setIsLoadingNews(true);
    setNewsError(null);
    setNews([]);
    setSuggestions([]);
    try {
      // FIX: Pass the correct instruction string from settings instead of the whole object.
      const results = await fetchNews(filters, settings.aiInstructions['news-search'], settings.display.articlesPerColumn, settings.display.showImages);
      setNews(results.articles);
      setSuggestions(results.suggestions);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsError('خطا در دریافت اخبار. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoadingNews(false);
    }
  }, [settings]);
  
  const handleRemoveArticle = (linkToRemove: string) => {
    setHiddenArticleLinks(prev => [...prev, linkToRemove]);
  };

  useEffect(() => {
     if(activeTab === 'news' && news.length === 0 && !isLoadingNews) {
        handleNewsSearch(currentFilters);
     }
  }, [activeTab, handleNewsSearch, isLoadingNews, news.length, currentFilters]);

  const visibleNews = news.filter(article => !hiddenArticleLinks.includes(article.link));
  
  const renderTabButton = (tabId: SearchTab, label: string, icon?: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 whitespace-nowrap ${
        activeTab === tabId
          ? 'border-cyan-400 text-cyan-300'
          : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
        case 'news':
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <FilterPanel 
                            onSearch={handleNewsSearch} 
                            isLoading={isLoadingNews}
                            categories={settings.searchOptions.news.categories}
                            regions={settings.searchOptions.news.regions}
                            sources={settings.searchOptions.news.sources}
                            settings={settings}
                            onSettingsChange={onSettingsChange}
                            searchType="news"
                        />
                    </div>
                    <div className="lg:col-span-2" ref={newsResultsRef}>
                        <div className="flex justify-between items-center mb-4">
                             {currentFilters.query && !isLoadingNews ? (
                                <h2 className="text-lg font-semibold text-gray-300 animate-fade-in">
                                    نتایج برای: <span className="text-cyan-300">"{currentFilters.query}"</span>
                                </h2>
                            ) : <div />}
                            <div className="flex items-center gap-2">
                                <ExportButton 
                                    elementRef={newsResultsRef}
                                    data={visibleNews}
                                    title={currentFilters.query}
                                    type="news"
                                    disabled={isLoadingNews || visibleNews.length === 0}
                                />
                                <button
                                    onClick={() => handleNewsSearch(currentFilters)}
                                    disabled={isLoadingNews}
                                    className="p-2 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors disabled:opacity-50"
                                    aria-label="رفرش اخبار"
                                >
                                    <RefreshIcon className={`w-5 h-5 ${isLoadingNews ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                        <NewsResults 
                            news={visibleNews} 
                            isLoading={isLoadingNews} 
                            error={newsError} 
                            settings={settings}
                            onOpenUrl={onOpenUrl}
                            onRemoveArticle={handleRemoveArticle}
                        />
                        <Suggestions 
                          suggestions={suggestions} 
                          onSuggestionClick={(query) => handleNewsSearch({ ...currentFilters, query })}
                        />
                    </div>
                </div>
            );
        case 'video':
        case 'audio':
        case 'book':
        case 'music':
        case 'dollar':
             return (
                <WebSearch
                    searchType={activeTab}
                    settings={settings}
                    onOpenUrl={onOpenUrl}
                    onSettingsChange={onSettingsChange}
                />
            );
        case 'stats':
        case 'science':
        case 'religion':
            return (
                <StructuredSearch 
                    searchType={activeTab}
                    settings={settings}
                    onOpenUrl={onOpenUrl}
                    onSettingsChange={onSettingsChange}
                />
            );
        case 'podcast':
            return <PodcastSearch settings={settings} onOpenUrl={onOpenUrl} />;
        case 'general_topics':
            return <GeneralTopicsSearch settings={settings} onOpenUrl={onOpenUrl} onSettingsChange={onSettingsChange} />;
        default:
            return null;
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex border-b border-cyan-400/20 overflow-x-auto">
          {renderTabButton('news', 'اخبار')}
          {renderTabButton('general_topics', 'موضوعات عمومی')}
          {renderTabButton('video', 'ویدئو')}
          {renderTabButton('podcast', 'پادکست', <SpeakerWaveIcon className="w-5 h-5" />)}
          {renderTabButton('audio', 'صدا')}
          {renderTabButton('book', 'کتاب و سایت')}
          {renderTabButton('music', 'موزیک و آهنگ')}
          {renderTabButton('dollar', 'قیمت دلار')}
          {renderTabButton('stats', 'آمار')}
          {renderTabButton('science', 'مقالات علمی')}
          {renderTabButton('religion', 'موضوعات دینی')}
        </div>
        
        {renderCurrentTab()}
    </div>
  );
};

export default AdvancedSearch;