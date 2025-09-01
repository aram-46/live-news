

import React, { useState } from 'react';
import { NewsArticle, Credibility, AppSettings, FontSettings } from '../types';
import { LinkIcon, ShareIcon, TelegramIcon, DiscordIcon, CloseIcon, ClipboardIcon, CheckCircleIcon } from './icons';
import { sendToTelegram, sendToDiscord } from '../services/integrationService';


interface NewsCardProps {
  article: NewsArticle;
  onOpenUrl: (url: string) => void;
  settings: AppSettings;
  onRemove?: (link: string) => void;
  fontSettings?: FontSettings;
}

const getCredibilityClass = (credibility: Credibility | string) => {
  const credibilityStr = credibility.toString();
  if (credibilityStr.includes(Credibility.High)) {
      return { dot: 'bg-green-400', text: 'text-green-300', shadow: 'shadow-green-500/50' };
  }
  if (credibilityStr.includes(Credibility.Medium)) {
      return { dot: 'bg-yellow-400', text: 'text-yellow-300', shadow: 'shadow-yellow-500/50' };
  }
  if (credibilityStr.includes(Credibility.Low)) {
      return { dot: 'bg-red-400', text: 'text-red-300', shadow: 'shadow-red-500/50' };
  }
  return { dot: 'bg-gray-400', text: 'text-gray-300', shadow: 'shadow-gray-500/50' };
};

const NewsCard: React.FC<NewsCardProps> = ({ article, onOpenUrl, settings, onRemove, fontSettings }) => {
  const credibilityClasses = getCredibilityClass(article.credibility);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async (platform: 'telegram' | 'discord') => {
      setShareStatus(`در حال ارسال به ${platform}...`);
      try {
          let success = false;
          if(platform === 'telegram') {
              success = await sendToTelegram(settings.integrations.telegram, article);
          } else {
              success = await sendToDiscord(settings.integrations.discord, article);
          }
          setShareStatus(success ? `با موفقیت به ${platform} ارسال شد!` : `ارسال به ${platform} ناموفق بود.`);
      } catch (e) {
          setShareStatus(`خطا در ارسال به ${platform}.`);
      }
      
      setTimeout(() => {
        setShareStatus('');
        setIsShareMenuOpen(false);
      }, 3000);
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(article.link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const summaryStyle: React.CSSProperties = fontSettings ? {
      fontFamily: fontSettings.family,
      fontSize: `${fontSettings.size}px`,
      backgroundImage: `linear-gradient(to right, ${fontSettings.color.from}, ${fontSettings.color.to})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent'
  } : {};


  return (
    <article className="bg-black/20 backdrop-blur-lg rounded-xl border border-cyan-400/10 shadow-lg shadow-cyan-900/20 p-5 transition-all duration-300 hover:border-cyan-400/30 hover:shadow-cyan-700/20 flex flex-col relative group">
       {onRemove && (
         <button 
          onClick={() => onRemove(article.link)}
          className="absolute top-2 left-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="حذف خبر"
         >
           <CloseIcon className="w-4 h-4" />
         </button>
       )}
       {settings.display.showImages && article.imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden h-48">
                <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
        )}
      <header className="mb-3">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-lg font-bold text-cyan-200 hover:text-white transition-colors">
            <button onClick={() => onOpenUrl(article.link)}>{article.title}</button>
          </h3>
          <span className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded-full whitespace-nowrap">{article.category}</span>
        </div>
      </header>
      <p style={summaryStyle} className="text-gray-300 text-sm leading-relaxed mb-4 flex-grow">{article.summary}</p>
      <footer className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-gray-400 gap-3 mt-auto">
        <div className="flex items-center gap-4">
          <span className="font-semibold">{article.source}</span>
          <span>{article.publicationTime}</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className={`flex items-center gap-2 ${credibilityClasses.text}`}>
              <span className={`w-3 h-3 rounded-full ${credibilityClasses.dot} shadow-md ${credibilityClasses.shadow}`}></span>
              <span>{article.credibility}</span>
            </div>
             <button
              onClick={() => onOpenUrl(article.link)}
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-200 transition-colors bg-cyan-900/50 hover:bg-cyan-800/50 px-3 py-1.5 rounded-md"
            >
              <LinkIcon className="w-4 h-4" />
              <span>مشاهده</span>
            </button>
            <button onClick={handleCopyLink} className="p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white" aria-label="کپی لینک">
                 {isCopied ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
            </button>
             <div className="relative">
                <button 
                    onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                    className="p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white"
                    aria-label="اشتراک گذاری"
                >
                    <ShareIcon className="w-4 h-4" />
                </button>
                {isShareMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10 p-2">
                        {shareStatus ? (
                            <p className="text-center text-xs p-2">{shareStatus}</p>
                        ) : (
                            <div className="space-y-1">
                                <button onClick={() => handleShare('telegram')} disabled={!settings.integrations.telegram.botToken || !settings.integrations.telegram.chatId} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <TelegramIcon className="w-5 h-5" />
                                    <span>ارسال به تلگرام</span>
                                </button>
                                <button onClick={() => handleShare('discord')} disabled={!settings.integrations.discord.webhookUrl} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <DiscordIcon className="w-5 h-5" />
                                    <span>ارسال به دیسکورد</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </footer>
    </article>
  );
};

export default NewsCard;
