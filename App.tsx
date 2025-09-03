

import React, { useState, useEffect, useCallback } from 'react';
import { SearchIcon, NewsIcon, SettingsIcon, CheckCircleIcon, ChatIcon, BrowserIcon, BrainIcon, SparklesIcon } from './components/icons';
import NewsTicker from './components/NewsTicker';
import { AppSettings } from './types';
import { fetchTickerHeadlines } from './services/geminiService';
import { fetchSettings, saveSettings } from './services/integrationService';
import Settings from './components/Settings';
import AdvancedSearch from './components/AdvancedSearch';
import LiveNews from './components/LiveNews';
import FactCheck from './components/FactCheck';
import { INITIAL_SETTINGS } from './data/defaults';
import DraggableDialog from './components/DraggableDialog';
import Chatbot from './components/Chatbot';
import PasswordPrompt from './components/PasswordPrompt';
import BrowserUse from './components/BrowserUse';
import Analyzer from './components/Analyzer';

type View = 'live' | 'search' | 'factcheck' | 'chatbot' | 'browseruse' | 'analyzer' | 'settings';

const FullScreenLoader: React.FC<{ message: string }> = ({ message }) => (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-[200]">
        <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-cyan-400/20 rounded-lg flex items-center justify-center border border-cyan-400/30">
                <NewsIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
              جستجوی هوشمند اخبار
            </h1>
        </div>
        <div className="mt-8 flex items-center gap-3 text-cyan-300">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            <span>{message}</span>
        </div>
    </div>
);

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('live');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [tickerHeadlines, setTickerHeadlines] = useState<any[]>([]);
  const [dialogUrl, setDialogUrl] = useState<string | null>(null);
  const [isSettingsLocked, setIsSettingsLocked] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
        try {
            const fetchedSettings = await fetchSettings();
            setSettings(fetchedSettings);
            if (fetchedSettings.password) {
                setIsSettingsLocked(true);
            }
        } catch (error: any) {
            console.error("Error loading settings:", error);
            setSettingsError(error.message);
            // Fallback to initial settings if backend fails
            setSettings(INITIAL_SETTINGS);
        }
    };
    loadSettings();
  }, []);


  const handleSettingsChange = useCallback(async (newSettings: AppSettings) => {
    const oldPassword = settings?.password;
    // Optimistic UI update
    setSettings(newSettings);
    
    if (oldPassword !== newSettings.password) {
      setIsSettingsLocked(!!newSettings.password);
    }
    
    try {
        await saveSettings(newSettings);
    } catch (error) {
        console.error("Failed to save settings:", error);
        alert("خطا در ذخیره تنظیمات در سرور. تغییرات شما ممکن است موقتی باشد.");
        // Optional: Revert to old settings
        // setSettings(settings); 
    }
  }, [settings]);

  const loadTicker = useCallback(async () => {
      if (!settings) return;
      try {
        const headlines = await fetchTickerHeadlines(settings.ticker, settings.aiInstructions['news-ticker']);
        setTickerHeadlines(headlines);
      } catch (error) {
        console.error("Error loading ticker headlines:", error);
      }
    }, [settings]);

  useEffect(() => {
    if (settings) {
        loadTicker();
    }
  }, [loadTicker, settings]);
  
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

  if (!settings) {
    return <FullScreenLoader message={settingsError || 'در حال بارگذاری تنظیمات از سرور...'} />;
  }

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
          <nav className="flex items-center gap-2">
            {renderNavButton('live', <NewsIcon className="w-5 h-5" />, 'اخبار زنده')}
            {renderNavButton('search', <SearchIcon className="w-5 h-5" />, 'جستجو')}
            {renderNavButton('factcheck', <CheckCircleIcon className="w-5 h-5" />, 'فکت چک')}
            {renderNavButton('analyzer', <BrainIcon className="w-5 h-5" />, 'تحلیل‌گر')}
            {renderNavButton('chatbot', <ChatIcon className="w-5 h-5" />, 'چت‌بات')}
            {renderNavButton('browseruse', <SparklesIcon className="w-5 h-5" />, 'عامل هوشمند')}
            {renderNavButton('settings', <SettingsIcon className="w-5 h-5" />, 'تنظیمات')}
          </nav>
        </div>
      </header>
      
      {tickerHeadlines.length > 0 && <NewsTicker headlines={tickerHeadlines} settings={settings.ticker} />}

      <main className="container mx-auto p-4 sm:p-6">
        {activeView === 'live' && <LiveNews settings={settings} onOpenUrl={setDialogUrl} />}
        {activeView === 'search' && <AdvancedSearch settings={settings} onOpenUrl={setDialogUrl} onSettingsChange={handleSettingsChange} />}
        {activeView === 'factcheck' && <FactCheck settings={settings} onOpenUrl={setDialogUrl} />}
        {activeView === 'analyzer' && <Analyzer settings={settings} onOpenUrl={setDialogUrl} />}
        {activeView === 'browseruse' && <BrowserUse settings={settings} />}
        {activeView === 'settings' && (
            isSettingsLocked ? 
            <PasswordPrompt password={settings.password!} onUnlock={() => setIsSettingsLocked(false)} /> :
            <Settings settings={settings} onSettingsChange={handleSettingsChange} />
        )}
        {activeView === 'chatbot' && <Chatbot settings={settings} />}
      </main>

      {dialogUrl && <DraggableDialog url={dialogUrl} onClose={() => setDialogUrl(null)} />}
    </div>
    </>
  );
};

export default App;
