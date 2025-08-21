

import React, { useState, useCallback, useEffect } from 'react';
import { Filters, NewsArticle, AppSettings } from '../types';
import { fetchNews } from '../services/geminiService';
import FilterPanel from './FilterPanel';
import NewsResults from './NewsResults';
import { RefreshIcon } from './icons';

interface SearchAndFactCheckProps {
    settings: AppSettings;
    onOpenUrl: (url: string) => void;
}

const SearchAndFactCheck: React.FC<SearchAndFactCheckProps> = ({ settings, onOpenUrl }) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<Filters>({ query: 'مهمترین اخبار ایران و جهان', categories: ['all'], regions: ['all'], sources: ['all'] });
  const [hiddenArticleLinks, setHiddenArticleLinks] = useState<string[]>([]);
  
  const handleSearch = useCallback(async (filters: Filters) => {
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
     handleSearch(currentFilters);
  }, []);

  const visibleNews = news.filter(article => !hiddenArticleLinks.includes(article.link));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
            <FilterPanel 
                onSearch={handleSearch} 
                isLoading={isLoadingNews}
                categories={settings.searchCategories}
                regions={settings.searchRegions}
            />
        </div>
        <div className="lg:col-span-2">
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => handleSearch(currentFilters)}
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
  );
};

export default SearchAndFactCheck;