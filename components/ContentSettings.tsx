
import React, { useState } from 'react';
import { AppSettings, DisplaySettings, SearchTab } from '../types';
import EditableList from './settings/EditableList';
import LiveNewsSettings from './settings/LiveNewsSettings';

interface ContentSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type ContentTab = 'live' | 'display' | 'filters';

const ContentSettings: React.FC<ContentSettingsProps> = ({ settings, onSettingsChange }) => {
    const [activeTab, setActiveTab] = useState<ContentTab>('live');

    const handlePartialChange = (change: Partial<AppSettings>) => {
        onSettingsChange({ ...settings, ...change });
    };
    
    const handleDisplayChange = (change: Partial<DisplaySettings>) => {
        handlePartialChange({ display: { ...settings.display, ...change } });
    };

    const handleSearchOptionsChange = (tab: SearchTab, list: 'categories' | 'regions' | 'sources', newItems: string[]) => {
        onSettingsChange({
            ...settings,
            searchOptions: {
                ...settings.searchOptions,
                [tab]: {
                    ...settings.searchOptions[tab],
                    [list]: newItems
                }
            }
        });
    }

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
                {renderTabButton('display', 'نمایش و جستجو')}
                {renderTabButton('filters', 'گزینه‌های فیلتر')}
            </div>

            {activeTab === 'live' && (
                <LiveNewsSettings 
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                />
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
                        <EditableList settings={settings} title="دسته‌بندی‌های جستجوی خبر" items={settings.searchOptions.news.categories} onItemsChange={(newItems) => handleSearchOptionsChange('news', 'categories', newItems)} placeholder="افزودن دسته‌بندی جدید..."/>
                        <EditableList settings={settings} title="مناطق جغرافیایی خبر" items={settings.searchOptions.news.regions} onItemsChange={(newItems) => handleSearchOptionsChange('news', 'regions', newItems)} placeholder="افزودن منطقه جدید..."/>
                        <EditableList settings={settings} title="منابع خبر" items={settings.searchOptions.news.sources} onItemsChange={(newItems) => handleSearchOptionsChange('news', 'sources', newItems)} placeholder="افزودن نوع منبع..."/>
                        <EditableList settings={settings} title="دسته‌بندی‌های ویدئو" items={settings.searchOptions.video.categories} onItemsChange={(newItems) => handleSearchOptionsChange('video', 'categories', newItems)} placeholder="افزودن دسته‌بندی جدید..."/>
                        
                        <div className="md:col-span-2">
                             <EditableList settings={settings} title="حوزه‌های جستجوی ساختاریافته (آمار، علمی و...)" items={settings.structuredSearchDomains} onItemsChange={(newItems) => handlePartialChange({ structuredSearchDomains: newItems })} placeholder="افزودن حوزه جدید..."/>
                        </div>
                        <div className="md:col-span-2">
                            <EditableList settings={settings} title="حوزه‌های موضوعات عمومی" items={settings.generalTopicDomains} onItemsChange={(newItems) => handlePartialChange({ generalTopicDomains: newItems })} placeholder="افزودن حوزه جدید..." />
                        </div>
                        <div className="md:col-span-2">
                            <EditableList settings={settings} title="دسته‌بندی‌های نوار اخبار متحرک" items={settings.allTickerCategories} onItemsChange={(newItems) => handlePartialChange({ allTickerCategories: newItems })} placeholder="افزودن دسته‌بندی برای نوار اخبار..."/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentSettings;
