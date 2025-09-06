
import React, { useEffect, useRef, memo } from 'react';

const TradingViewWidget: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current && container.current.children.length === 0) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = `
        {
          "autosize": true,
          "symbol": "BINANCE:BTCUSDT",
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "fa_IR",
          "enable_publishing": false,
          "withdateranges": true,
          "hide_side_toolbar": false,
          "allow_symbol_change": true,
          "details": true,
          "hotlist": true,
          "calendar": true,
          "support_host": "https://www.tradingview.com"
        }`;
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="tradingview-widget-container h-[500px] rounded-lg overflow-hidden border border-cyan-400/20" ref={container} style={{height: '500px', width: '100%'}}>
      <div className="tradingview-widget-container__widget h-full" style={{height: 'calc(100% - 32px)', width: '100%'}}></div>
      <div className="tradingview-widget-copyright" style={{width: '100%', fontSize: '13px', textAlign: 'center', lineHeight: '32px', color: '#9ca3af'}}>
        <a href="https://fa.tradingview.com/" rel="noopener nofollow" target="_blank" style={{color: '#9ca3af', textDecoration: 'none'}}>
          <span className="blue-text">تمام بازارها را در TradingView دنبال کنید</span>
        </a>
      </div>
    </div>
  );
};

export default memo(TradingViewWidget);
