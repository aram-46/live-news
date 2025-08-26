
import React, { useState } from 'react';
import { AppSettings, TickerSettings } from '../../types';

interface ThemeSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ settings, onSettingsChange }) => {
    const handleTickerChange = (change: Partial<TickerSettings>) => {
        onSettingsChange({ ...settings, ticker: { ...settings.ticker, ...change } });
    };

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-xl font-bold mb-6 text-cyan-300">تنظیمات تم اجزاء</h2>
            
            {/* Ticker Settings */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2 mb-4">نوار اخبار متحرک</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                     <div>
                        <label htmlFor="speed" className="block text-sm font-medium text-cyan-300 mb-2">سرعت حرکت (ثانیه): {settings.ticker.speed}</label>
                        <input id="speed" type="range" min="10" max="100" step="5" value={settings.ticker.speed} onChange={(e) => handleTickerChange({ speed: Number(e.target.value) })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">جهت حرکت</label>
                        <div className="flex gap-2 rounded-lg bg-gray-700/50 p-1"><button onClick={() => handleTickerChange({direction: 'right'})} className={`w-full py-1 rounded ${settings.ticker.direction === 'right' ? 'bg-cyan-500 text-black' : 'hover:bg-gray-600'}`}>راست</button><button onClick={() => handleTickerChange({direction: 'left'})} className={`w-full py-1 rounded ${settings.ticker.direction === 'left' ? 'bg-cyan-500 text-black' : 'hover:bg-gray-600'}`}>چپ</button></div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">افکت متن</label>
                        <div className="flex gap-2 rounded-lg bg-gray-700/50 p-1"><button onClick={() => handleTickerChange({effect: 'none'})} className={`w-full py-1 rounded ${settings.ticker.effect === 'none' ? 'bg-cyan-500 text-black' : 'hover:bg-gray-600'}`}>ساده</button><button onClick={() => handleTickerChange({effect: 'glow'})} className={`w-full py-1 rounded ${settings.ticker.effect === 'glow' ? 'bg-cyan-500 text-black' : 'hover:bg-gray-600'}`}>درخشان</button></div>
                    </div>
                     <div className="flex items-center gap-3">
                        <label htmlFor="pauseOnHover" className="text-sm font-medium text-cyan-300">مکث با هاور</label>
                        <button id="pauseOnHover" onClick={() => handleTickerChange({ pauseOnHover: !settings.ticker.pauseOnHover })} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.ticker.pauseOnHover ? 'bg-cyan-500' : 'bg-gray-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.ticker.pauseOnHover ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                    </div>
                     <div>
                        <label htmlFor="textColor" className="block text-sm font-medium text-cyan-300 mb-2">رنگ متن</label>
                        <input id="textColor" type="color" value={settings.ticker.textColor} onChange={e => handleTickerChange({textColor: e.target.value})} className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"/>
                     </div>
                     <div>
                        <label htmlFor="hoverColor" className="block text-sm font-medium text-cyan-300 mb-2">رنگ متن هاور</label>
                        <input id="hoverColor" type="color" value={settings.ticker.hoverColor} onChange={e => handleTickerChange({hoverColor: e.target.value})} className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"/>
                     </div>
                     <div>
                        <label htmlFor="borderColor" className="block text-sm font-medium text-cyan-300 mb-2">رنگ حاشیه</label>
                        <input id="borderColor" type="color" value={settings.ticker.borderColor} onChange={e => handleTickerChange({borderColor: e.target.value})} className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"/>
                     </div>
                </div>
            </div>

            {/* You can add more sections here for other components like Tabs */}
             <div className="space-y-4 pt-6 mt-6 border-t border-cyan-400/20">
                <h3 className="text-lg font-semibold text-cyan-200">تنظیمات تب‌ها (بزودی)</h3>
                 <p className="text-sm text-gray-500">
                     در نسخه‌های آینده، امکان شخصی‌سازی کامل رنگ‌ها، فونت و آیکون‌های تب‌های ناوبری به این بخش اضافه خواهد شد. در حال حاضر می‌توانید از بخش "استایل سفارشی" برای تغییرات استفاده کنید.
                </p>
            </div>
        </div>
    );
};

export default ThemeSettings;
