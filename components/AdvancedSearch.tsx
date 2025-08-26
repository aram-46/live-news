
import React, { useState, useCallback, useEffect } from 'react';
import { Filters, NewsArticle, AppSettings } from '../types';
import { fetchNews } from '../services/geminiService';
import FilterPanel from './FilterPanel';
import NewsResults from './NewsResults';
import { RefreshIcon } from './icons';
import StructuredSearch from './StructuredSearch';

interface AdvancedSearchProps {
    settings: AppSettings;
    onOpenUrl: (url: string) => void;
    onSettingsChange: (settings: AppSettings) => void;
}

type SearchTab = 'news' | 'stats' | 'science' | 'religion';

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ settings, onOpenUrl, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<SearchTab>('news');

  // State for News Search
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<Filters>({ query: 'مهمترین اخبار ایران و جهان', categories: ['all'], regions: ['all'], sources: ['all'] });
  const [hiddenArticleLinks, setHiddenArticleLinks] = useState<string[]>([]);
  
  const handleNewsSearch = useCallback(async (filters: Filters) => {
    setCurrentFilters(filters);
    setHiddenArticleLinks([]); // Reset hidden articles on new search
    setIsLoadingNews(true);
    setNewsError(null);
    setNews([]);
    try {
      const results = await fetchNews(filters, settings.aiInstructions['news-search'], settings.display.articlesPerColumn, settings.display.showImages);
      setNews(results);
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
     if(activeTab === 'news') {
        handleNewsSearch(currentFilters);
     }
  }, [activeTab]); // Only run once for news tab when it's first selected

  const visibleNews = news.filter(article => !hiddenArticleLinks.includes(article.link));
  
  const renderTabButton = (tabId: SearchTab, label: string) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
        activeTab === tabId
          ? 'border-cyan-400 text-cyan-300'
          : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
       <div className="flex border-b border-cyan-400/20">
          {renderTabButton('news', 'اخبار')}
          {renderTabButton('stats', 'آمار')}
          {renderTabButton('science', 'مقالات علمی')}
          {renderTabButton('religion', 'موضوعات دینی')}
        </div>

        {activeTab === 'news' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <FilterPanel 
                        onSearch={handleNewsSearch} 
                        isLoading={isLoadingNews}
                        categories={settings.searchCategories}
                        regions={settings.searchRegions}
                        sources={settings.searchSources}
                        settings={settings}
                        onSettingsChange={onSettingsChange}
                    />
                </div>
                <div className="lg:col-span-2">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => handleNewsSearch(currentFilters)}
                            disabled={isLoadingNews}
                            className="p-2 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors disabled:opacity-50"
                            aria-label="رفرش اخبار"
                        >
                            <RefreshIcon className={`w-5 h-5 ${isLoadingNews ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <NewsResults 
                        news={visibleNews} 
                        isLoading={isLoadingNews} 
                        error={newsError} 
                        settings={settings}
                        onOpenUrl={onOpenUrl}
                        onRemoveArticle={handleRemoveArticle}
                    />
                </div>
            </div>
        )}

        {activeTab === 'stats' && (
            <StructuredSearch 
                searchType="stats"
                settings={settings}
                onOpenUrl={onOpenUrl}
                onSettingsChange={onSettingsChange}
            />
        )}
        {activeTab === 'science' && (
             <StructuredSearch 
                searchType="science"
                settings={settings}
                onOpenUrl={onOpenUrl}
                onSettingsChange={onSettingsChange}
            />
        )}
         {activeTab === 'religion' && (
             <StructuredSearch 
                searchType="religion"
                settings={settings}
                onOpenUrl={onOpenUrl}
                onSettingsChange={onSettingsChange}
            />
        )}
    </div>
  );
};

export default AdvancedSearch;