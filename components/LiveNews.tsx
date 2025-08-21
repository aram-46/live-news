

import React, { useState, useEffect, useCallback } from 'react';
import { NewsArticle, AppSettings } from '../types';
import { fetchLiveNews } from '../services/geminiService';
import NewsResults from './NewsResults';
import { RefreshIcon } from './icons';

interface LiveNewsProps {
  settings: AppSettings;
  onOpenUrl: (url: string) => void;
}

const TABS = [
  { id: 'ایران', label: 'ایران' },
  { id: 'جهان', label: 'جهان' },
  { id: 'بازار مالی', label: 'بازار مالی' },
  { id: 'سایر', label: 'سایر' }
];

const LiveNews: React.FC<LiveNewsProps> = ({ settings, onOpenUrl }) => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [news, setNews] = useState<Record<string, NewsArticle[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | null>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadNewsForTab = useCallback(async (tabId: string) => {
    setLoading(prev => ({ ...prev, [tabId]: true }));
    setError(prev => ({ ...prev, [tabId]: null }));
    try {
      const results = await fetchLiveNews(tabId, settings.sources, settings.aiInstructions['news-display'], settings.display.showImages);
      setNews(prev => ({ ...prev, [tabId]: results }));
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(prev => ({ ...prev, [tabId]: `خطا در دریافت اخبار برای دسته‌بندی «${tabId}»` }));
    } finally {
      setLoading(prev => ({ ...prev, [tabId]: false }));
    }
  }, [settings]);

  useEffect(() => {
    if (!news[activeTab] || (lastUpdated && new Date().getTime() - lastUpdated.getTime() > 3600000)) {
      loadNewsForTab(activeTab);
    }
  }, [activeTab, news, loadNewsForTab, lastUpdated]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      TABS.forEach(tab => loadNewsForTab(tab.id));
    }, 3600000); // 1 hour
    
    return () => clearInterval(interval);
  }, [loadNewsForTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex border-b border-cyan-400/20">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
            {lastUpdated && <p className="text-xs text-gray-500">آخرین بروزرسانی: {lastUpdated.toLocaleString('fa-IR')}</p>}
             <button
                onClick={() => loadNewsForTab(activeTab)}
                disabled={loading[activeTab]}
                className="p-2 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors disabled:opacity-50"
                aria-label="رفرش اخبار"
            >
                <RefreshIcon className={`w-5 h-5 ${loading[activeTab] ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      <div>
        <NewsResults 
            news={news[activeTab] || []} 
            isLoading={loading[activeTab] || false} 
            error={error[activeTab] || null}
            settings={settings}
            onOpenUrl={onOpenUrl}
        />
      </div>
    </div>
  );
};

export default LiveNews;