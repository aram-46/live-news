



import React, { useState, useEffect, useCallback } from 'react';
import { SearchIcon, NewsIcon, SettingsIcon, CheckCircleIcon, ChatIcon } from './components/icons';
import NewsTicker from './components/NewsTicker';
import { AppSettings } from './types';
import { fetchTickerHeadlines } from './services/geminiService';
import Settings from './components/Settings';
import SearchAndFactCheck from './components/SearchAndFactCheck';
import LiveNews from './components/LiveNews';
import FactCheck from './components/FactCheck';
import { useLocalStorage } from './hooks/useLocalStorage';
import { INITIAL_SETTINGS } from './data/defaults';
import DraggableDialog from './components/DraggableDialog';
import Chatbot from './components/Chatbot';
import PasswordPrompt from './components/PasswordPrompt';

type View = 'live' | 'search' | 'factcheck' | 'settings' | 'chatbot';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('live');
  const [settings, setSettings] = useLocalStorage<AppSettings>('app-settings', INITIAL_SETTINGS);
  const [tickerHeadlines, setTickerHeadlines] = useState<any[]>([]);
  const [dialogUrl, setDialogUrl] = useState<string | null>(null);
  const [isSettingsLocked, setIsSettingsLocked] = useState(!!settings.password);

  const handleSettingsChange = (newSettings: AppSettings) => {
    // If password is being set or changed, re-lock the settings for the next visit.
    if (settings.password !== newSettings.password) {
      setIsSettingsLocked(!!newSettings.password);
    }
    setSettings(newSettings);
  };

  const loadTicker = useCallback(async () => {
      try {
        const headlines = await fetchTickerHeadlines(settings.ticker, settings.aiInstructions['news-ticker']);
        setTickerHeadlines(headlines);
      } catch (error) {
        console.error("Error loading ticker headlines:", error);
      }
    }, [JSON.stringify(settings.ticker), settings.aiInstructions['news-ticker']]);

  useEffect(() => {
    loadTicker();
  }, [loadTicker]);
  
  const renderNavButton = (view: View, icon: React.ReactNode, label: string) => (
      <button
        onClick={() => setActiveView(view)}
        aria-label={label}
        className={`flex flex-col items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all duration-300 ${
          activeView === view
            ? 'bg-cyan-500/20 text-cyan-300 scale-105'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
        }`}
      >
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </button>
  );

  return (
    <>
    <style>{settings.customCss || ''}</style>
    <div className={`min-h-screen font-sans bg-main-gradient text-primary ${settings.theme.className}`}>
      <header className="sticky top-0 z-50 header-bg backdrop-blur-xl border-b border-accent shadow-lg shadow-cyan-500/5">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-400/20 rounded-lg flex items-center justify-center border border-cyan-400/30">
                <NewsIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
              جستجوی هوشمند اخبار
            </h1>
          </div>
          <nav className="flex items-center gap-2 p-1 bg-gray-800/40 rounded-xl border border-gray-700/50">
            {renderNavButton('live', <NewsIcon className="w-5 h-5" />, 'اخبار زنده')}
            {renderNavButton('search', <SearchIcon className="w-5 h-5" />, 'جستجو')}
            {renderNavButton('factcheck', <CheckCircleIcon className="w-5 h-5" />, 'فکت چک')}
            {renderNavButton('chatbot', <ChatIcon className="w-5 h-5" />, 'چت‌بات')}
            {renderNavButton('settings', <SettingsIcon className="w-5 h-5" />, 'تنظیمات')}
          </nav>
        </div>
        {tickerHeadlines.length > 0 && <NewsTicker headlines={tickerHeadlines} settings={settings.ticker} />}
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        {activeView === 'live' && 
          <LiveNews 
            settings={settings}
            onOpenUrl={setDialogUrl}
          />}
        {activeView === 'search' && 
          <SearchAndFactCheck 
            settings={settings} 
            onOpenUrl={setDialogUrl}
          />}
        {activeView === 'factcheck' && 
          <FactCheck 
            settings={settings}
            onOpenUrl={setDialogUrl}
          />}
        {activeView === 'chatbot' && <Chatbot />}
        {activeView === 'settings' && (
          isSettingsLocked ? (
            <PasswordPrompt
              password={settings.password || ''}
              onUnlock={() => setIsSettingsLocked(false)}
            />
          ) : (
            <Settings 
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          )
        )}
      </main>
      
      {dialogUrl && <DraggableDialog url={dialogUrl} onClose={() => setDialogUrl(null)} />}

      <footer className="text-center p-6 text-gray-500 text-sm border-t border-cyan-400/10 mt-8">
        <p>&copy; 2024 - ابزار هوشمند جستجوی اخبار. قدرت گرفته از هوش مصنوعی</p>
      </footer>
    </div>
    </>
  );
};

export default App;