import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NewsArticle, AppSettings, RSSFeed, SearchHistoryItem, generateUUID } from '../types';
import { fetchLiveNews, checkForUpdates, fetchNewsFromFeeds } from '../services/geminiService';
import NewsResults from './NewsResults';
import { RefreshIcon, SearchIcon } from './icons';
import ExportButton from './ExportButton';

interface LiveNewsProps {
  settings: AppSettings;
}

const RSSFeedReader: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const resultsRef = useRef<HTMLDivElement>(null);

    const saveSearchToHistory = (query: string, results: NewsArticle[]) => {
        if (!query.trim()) return; // Don't save empty searches
        try {
            const historyString = localStorage.getItem('search-history');
            const currentHistory: SearchHistoryItem[] = historyString ? JSON.parse(historyString) : [];

            const newItem: SearchHistoryItem = {
                id: generateUUID(),
                type: 'rss-feed',
                query: query,
                timestamp: Date.now(),
                resultSummary: `تعداد ${results.length} خبر از خبرخوان‌ها یافت شد.`,
                isFavorite: false,
            };
            
            // Add to the beginning and keep history to a reasonable size, e.g., 100 items.
            const newHistory = [newItem, ...currentHistory].slice(0, 100);
            localStorage.setItem('search-history', JSON.stringify(newHistory));
        } catch (error) {
            console.error("Failed to save search to history:", error);
        }
    };


    const loadFeedNews = useCallback(async (query?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const allFeeds = Object.values(settings.rssFeeds).flat();
            if (allFeeds.length === 0) {
                setArticles([]);
                setError("هیچ آدرس خبرخوانی در تنظیمات ثبت نشده است.");
                return;
            }
            const results = await fetchNewsFromFeeds(allFeeds, settings.aiInstructions['rss-feeds'], settings, query);
            setArticles(results);
            if (query) {
                saveSearchToHistory(query, results);
            }
        } catch (err) {
            console.error(err);
            setError("خطا در دریافت اخبار از خبرخوان‌ها.");
        } finally {
            setIsLoading(false);
        }
    }, [settings]);

    useEffect(() => {
        loadFeedNews();
    }, [loadFeedNews]);
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadFeedNews(searchQuery);
    };
    
    const rssSettingsForDisplay = {
      ...settings,
      display: {
        ...settings.display,
        columns: settings.rssFeedSpecifics.columns,
        articlesPerColumn: settings.rssFeedSpecifics.articlesToDisplay,
      }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <form onSubmit={handleSearch} className="flex-grow w-full sm:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="جستجو در اخبار خبرخوان‌ها..."
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5 pr-10"
                        />
                        <button type="submit" className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <SearchIcon className="w-5 h-5 text-gray-400"/>
                        </button>
                    </div>
                </form>
                <div className="flex items-center gap-2">
                    <ExportButton elementRef={resultsRef} data={articles} title="rss-feed-export" type="news" disabled={isLoading || articles.length === 0} />
                    <button onClick={() => loadFeedNews(searchQuery)} disabled={isLoading} className="p-2 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors disabled:opacity-50">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            <div ref={resultsRef}>
                 <NewsResults 
                    news={articles} 
                    isLoading={isLoading} 
                    error={error}
                    settings={rssSettingsForDisplay}
                    fontSettings={settings.rssFeedSpecifics.font}
                    sliderView={settings.rssFeedSpecifics.sliderView}
                />
            </div>
        </div>
    );
};


const TABS = [
  { id: 'ایران', label: 'ایران' },
  { id: 'جهان', label: 'جهان' },
  { id: 'بازار مالی', label: 'بازار مالی' },
  { id: 'خبرخوان', label: 'خبرخوان' },
  { id: 'سایر', label: 'سایر' }
];

const LiveNews: React.FC<LiveNewsProps> = ({ settings }) => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [news, setNews] = useState<Record<string, NewsArticle[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | null>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const loadNewsForTab = useCallback(async (tabId: string, force = false) => {
    setLoading(prev => ({ ...prev, [tabId]: true }));
    setError(prev => ({ ...prev, [tabId]: null }));
    setUpdateAvailable(false);
    try {
      const results = await fetchLiveNews(tabId, settings.sources, settings.aiInstructions['news-display'], settings.display.showImages, settings.liveNewsSpecifics, settings);
      setNews(prev => ({ ...prev, [tabId]: results }));
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(prev => ({ ...prev, [tabId]: `خطا در دریافت اخبار برای دسته‌بندی «${tabId}»` }));
    } finally {
      setLoading(prev => ({ ...prev, [tabId]: false }));
    }
  }, [settings]);

  // Initial load and tab change effect
  useEffect(() => {
    if (!news[activeTab] && activeTab !== 'خبرخوان') {
      loadNewsForTab(activeTab);
    }
  }, [activeTab, news, loadNewsForTab]);
  
  // Auto-update checker effect
  useEffect(() => {
    if (!settings.liveNewsSpecifics.updates.autoCheck) {
        return;
    }

    const check = async () => {
        const hasUpdate = await checkForUpdates(settings.sources, settings);
        if(hasUpdate) {
            setUpdateAvailable(true);
        }
    };

    const intervalInMs = settings.liveNewsSpecifics.updates.interval * 60 * 1000;
    const timer = setInterval(check, intervalInMs);
    
    return () => clearInterval(timer);
  }, [settings.liveNewsSpecifics.updates, settings.sources]);

  // Create a settings object specifically for live news display, overriding the article count
  const liveNewsDisplaySettings = {
    ...settings,
    display: {
      ...settings.display,
      articlesPerColumn: settings.liveNewsSpecifics.articlesToDisplay,
    },
  };

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
        {activeTab !== 'خبرخوان' && (
            <div className="flex items-center gap-4">
                {lastUpdated && <p className="text-xs text-gray-500">آخرین بروزرسانی: {lastUpdated.toLocaleString('fa-IR')}</p>}
                 <button
                    onClick={() => loadNewsForTab(activeTab, true)}
                    disabled={loading[activeTab]}
                    className={`relative p-2 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors disabled:opacity-50 ${updateAvailable ? 'animate-pulse' : ''}`}
                    aria-label="رفرش اخبار"
                >
                    <RefreshIcon className={`w-5 h-5 ${loading[activeTab] ? 'animate-spin' : ''}`} />
                    {updateAvailable && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-gray-900"></span>}
                </button>
            </div>
        )}
      </div>

      <div>
        {activeTab === 'خبرخوان' ? (
            <RSSFeedReader settings={settings} />
        ) : (
            <NewsResults 
                news={news[activeTab] || []} 
                isLoading={loading[activeTab] || false} 
                error={error[activeTab] || null}
                settings={liveNewsDisplaySettings}
                fontSettings={settings.liveNewsSpecifics.font}
            />
        )}
      </div>
    </div>
  );
};

export default LiveNews;
