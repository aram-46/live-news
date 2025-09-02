
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Filters, NewsArticle, AppSettings, SearchTab } from '../types';
import { fetchNews } from '../services/geminiService';
import FilterPanel from './FilterPanel';
import NewsResults from './NewsResults';
import { RefreshIcon, SparklesIcon } from './icons';
import StructuredSearch from './StructuredSearch';
import WebSearch from './WebSearch';
import Converter from './Converter';
import ExportButton from './ExportButton';
import Suggestions from './Suggestions';
import GeneralTopicsSearch from './GeneralTopicsSearch';
import ContentCreator from './ContentCreator';

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
  }, [activeTab]);

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
        case 'converter':
            return <Converter settings={settings} onOpenUrl={onOpenUrl} />;
        case 'general_topics':
            return <GeneralTopicsSearch settings={settings} onOpenUrl={onOpenUrl} onSettingsChange={onSettingsChange} />;
        case 'content-creator':
            return <ContentCreator settings={settings} />;
        default:
            return null;
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex border-b border-cyan-400/20 overflow-x-auto">
          {renderTabButton('news', 'اخبار')}
          {renderTabButton('general_topics', 'موضوعات عمومی')}
          {renderTabButton('content-creator', 'محتوا ساز', <SparklesIcon className="w-5 h-5" />)}
          {renderTabButton('video', 'ویدئو')}
          {renderTabButton('audio', 'صدا')}
          {renderTabButton('book', 'کتاب و سایت')}
          {renderTabButton('music', 'موزیک و آهنگ')}
          {renderTabButton('dollar', 'قیمت دلار')}
          {renderTabButton('stats', 'آمار')}
          {renderTabButton('science', 'مقالات علمی')}
          {renderTabButton('religion', 'موضوعات دینی')}
          {renderTabButton('converter', 'تبدیل کننده')}
        </div>
        
        {renderCurrentTab()}
    </div>
  );
};

export default AdvancedSearch;
