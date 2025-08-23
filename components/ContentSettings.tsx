
import React, { useState } from 'react';
import { AppSettings, DisplaySettings, TickerSettings } from '../types';
import EditableList from './settings/EditableList';
import LiveNewsSettings from './settings/LiveNewsSettings';

interface ContentSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type ContentTab = 'live' | 'ticker' | 'display' | 'filters';

const ContentSettings: React.FC<ContentSettingsProps> = ({ settings, onSettingsChange }) => {
    const [activeTab, setActiveTab] = useState<ContentTab>('live');

    const handlePartialChange = (change: Partial<AppSettings>) => {
        onSettingsChange({ ...settings, ...change });
    };
    
    const handleDisplayChange = (change: Partial<DisplaySettings>) => {
        handlePartialChange({ display: { ...settings.display, ...change } });
    };

    const handleTickerChange = (change: Partial<TickerSettings>) => {
        handlePartialChange({ ticker: { ...settings.ticker, ...change } });
    };

    const renderTabButton = (tabId: ContentTab, label: string) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
                activeTab === tabId
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex border-b border-cyan-400/20 mb-6 overflow-x-auto">
                {renderTabButton('live', 'اخبار زنده')}
                {renderTabButton('ticker', 'نوار اخبار متحرک')}
                {renderTabButton('display', 'نمایش و جستجو')}
                {renderTabButton('filters', 'گزینه‌های فیلتر')}
            </div>

            {activeTab === 'live' && (
                <LiveNewsSettings 
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                />
            )}
            
            {activeTab === 'ticker' && (
                <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
                    <h2 className="text-xl font-bold mb-6 text-cyan-300">تنظیمات نوار اخبار متحرک</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                         <div>
                            <label htmlFor="speed" className="block text-sm font-medium text-cyan-300 mb-2">سرعت حرکت (ثانیه): {settings.ticker.speed}</label>
                            <input id="speed" type="range" min="10" max="100" step="5" value={settings.ticker.speed} onChange={(e) => handleTickerChange({ speed: Number(e.target.value) })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-2">جهت حرکت</label>
                            <div className="flex gap-2 rounded-lg bg-gray-700/50 p-1"><button onClick={() => handleTickerChange({direction: 'right'})} className={`w-full py-1 rounded ${settings.ticker.direction === 'right' ? 'bg-cyan-500 text-black' : 'hover:bg-gray-600'}`}>راست</button><button onClick={() => handleTickerChange({direction: 'left'})} className={`w-full py-1 rounded ${settings.ticker.direction === 'left' ? 'bg-cyan-500 text-black' : 'hover:bg-gray-600'}`}>چپ</button></div>
                        </div>
                         <div>
                            <label htmlFor="textColor" className="block text-sm font-medium text-cyan-300 mb-2">رنگ متن</label>
                            <input id="textColor" type="color" value={settings.ticker.textColor} onChange={e => handleTickerChange({textColor: e.target.value})} className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"/>
                         </div>
                         <div>
                            <label htmlFor="hoverColor" className="block text-sm font-medium text-cyan-300 mb-2">رنگ متن هاور</label>
                            <input id="hoverColor" type="color" value={settings.ticker.hoverColor} onChange={e => handleTickerChange({hoverColor: e.target.value})} className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"/>
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'display' && (
                <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
                    <h2 className="text-xl font-bold mb-6 text-cyan-300">تنظیمات عمومی نمایش و جستجو</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label htmlFor="columns" className="block text-sm font-medium text-cyan-300 mb-2">تعداد ستون‌ها: {settings.display.columns}</label>
                            <input id="columns" type="range" min="1" max="4" value={settings.display.columns} onChange={(e) => handleDisplayChange({ columns: Number(e.target.value) })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
                        </div>
                        <div>
                            <label htmlFor="articlesPerColumn" className="block text-sm font-medium text-cyan-300 mb-2">تعداد اخبار برای نمایش: {settings.display.articlesPerColumn}</label>
                            <input id="articlesPerColumn" type="range" min="1" max="20" value={settings.display.articlesPerColumn} onChange={(e) => handleDisplayChange({ articlesPerColumn: Number(e.target.value) })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
                        </div>
                        <div className="flex items-center gap-3">
                            <label htmlFor="showImages" className="text-sm font-medium text-cyan-300">نمایش تصاویر اخبار</label>
                            <button id="showImages" onClick={() => handleDisplayChange({ showImages: !settings.display.showImages })} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.display.showImages ? 'bg-cyan-500' : 'bg-gray-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.display.showImages ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                        </div>
                     </div>
                </div>
            )}
            
             {activeTab === 'filters' && (
                <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
                    <h2 className="text-xl font-bold mb-4 text-cyan-300">مدیریت گزینه‌های فیلتر</h2>
                    <p className="text-sm text-gray-400 mb-6">لیست‌های اصلی که در بخش‌های مختلف برنامه (جستجو، نوار اخبار و...) استفاده می‌شوند را مدیریت کنید.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <EditableList title="دسته‌بندی‌های جستجوی خبر" items={settings.searchCategories} onItemsChange={(newItems) => handlePartialChange({ searchCategories: newItems })} placeholder="افزودن دسته‌بندی جدید..."/>
                        <EditableList title="مناطق جغرافیایی" items={settings.searchRegions} onItemsChange={(newItems) => handlePartialChange({ searchRegions: newItems })} placeholder="افزودن منطقه جدید..."/>
                        <div className="md:col-span-2">
                            <EditableList title="دسته‌بندی‌های نوار اخبار متحرک" items={settings.allTickerCategories} onItemsChange={(newItems) => handlePartialChange({ allTickerCategories: newItems })} placeholder="افزودن دسته‌بندی برای نوار اخبار..."/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentSettings;
