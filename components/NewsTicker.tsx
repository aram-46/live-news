import React from 'react';
import { TickerArticle, TickerSettings } from '../types';
import { LinkIcon } from './icons';

interface NewsTickerProps {
  headlines: TickerArticle[];
  settings: TickerSettings;
}

const NewsTicker: React.FC<NewsTickerProps> = ({ headlines, settings }) => {
  if (!headlines || headlines.length === 0) {
    return null;
  }

  const marqueeClass = settings.direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right';
  const animationDuration = `${settings.speed}s`;

  const tickerContent = headlines.map((headline, index) => (
    <a
      key={index}
      href={headline.link}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm px-6 py-1 rounded-md transition-colors duration-300 flex items-center group text-[var(--ticker-text)] hover:text-[var(--ticker-hover)]"
    >
      <LinkIcon className="w-4 h-4 ml-2 opacity-70" />
      <span className="font-semibold group-hover:drop-shadow-[0_0_5px_var(--ticker-hover)] transition-all">
        {headline.title}
      </span>
      <span className="text-cyan-600 mx-4">|</span>
    </a>
  ));

  return (
    <div className={`bg-black/50 overflow-hidden border-t border-b border-accent ${settings.pauseOnHover ? 'pause-on-hover' : ''}`} style={{
      // @ts-ignore
      '--ticker-text': settings.textColor,
      '--ticker-hover': settings.hoverColor,
      borderColor: settings.borderColor,
    }}>
      <div className="relative flex overflow-x-hidden">
        <div className={`py-2 whitespace-nowrap flex items-center ${marqueeClass}`} style={{ animationDuration }}>
          {tickerContent}
        </div>
        <div className={`absolute top-0 py-2 whitespace-nowrap flex items-center ${marqueeClass}`} style={{ animationDuration, animationDelay: `${settings.speed / 2}s` }}>
           {tickerContent}
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;