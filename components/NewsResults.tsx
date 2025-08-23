
import React from 'react';
import { NewsArticle, AppSettings, FontSettings } from '../types';
import NewsCard from './NewsCard';

interface NewsResultsProps {
  news: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  settings: AppSettings;
  onOpenUrl: (url: string) => void;
  onRemoveArticle?: (link: string) => void;
  fontSettings?: FontSettings;
}

export const LoadingSkeleton: React.FC = () => (
  <div className="p-5 bg-black/20 backdrop-blur-lg rounded-xl border border-cyan-400/10 animate-pulse h-64 flex flex-col">
    <div className="h-6 bg-gray-700/50 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-700/50 rounded w-full mb-2"></div>
    <div className="h-4 bg-gray-700/50 rounded w-5/6 mb-4"></div>
    <div className="flex-grow"></div>
    <div className="flex justify-between items-center mt-4">
      <div className="h-4 bg-gray-700/50 rounded w-1/4"></div>
      <div className="h-4 bg-gray-700/50 rounded w-1/3"></div>
    </div>
  </div>
);

const NewsResults: React.FC<NewsResultsProps> = ({ news, isLoading, error, settings, onOpenUrl, onRemoveArticle, fontSettings }) => {
  const gridClasses: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  const gridClass = gridClasses[settings.display.columns] || 'grid-cols-1';
  
  const newsToShow = settings.display.allowedCategories.length > 0 
    ? news.filter(article => settings.display.allowedCategories.includes(article.category))
    : news;

  if (isLoading) {
    return (
      <div className={`grid ${gridClass} gap-5`}>
        {[...Array(settings.display.articlesPerColumn)].map((_, i) => <LoadingSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300">
        <p>{error}</p>
      </div>
    );
  }

  if (newsToShow.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400">
        <p>موردی برای نمایش یافت نشد. لطفاً جستجوی خود را تغییر دهید یا فیلتر دسته‌بندی‌ها را در تنظیمات بررسی کنید.</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridClass} gap-5`}>
      {newsToShow.slice(0, settings.display.articlesPerColumn).map((article, index) => (
        <NewsCard 
            key={`${article.link}-${index}`} 
            article={article} 
            onOpenUrl={onOpenUrl} 
            settings={settings}
            onRemove={onRemoveArticle}
            fontSettings={fontSettings}
        />
      ))}
    </div>
  );
};

export default NewsResults;