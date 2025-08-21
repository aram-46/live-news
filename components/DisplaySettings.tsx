

import React, { useState } from 'react';
import { DisplaySettings } from '../types';

interface DisplaySettingsProps {
  settings: DisplaySettings;
  onSettingsChange: (settings: DisplaySettings) => void;
  allCategories: string[];
}

const DisplaySettingsComponent: React.FC<DisplaySettingsProps> = ({ settings, onSettingsChange, allCategories }) => {
    
  const handleCategoryToggle = (category: string) => {
      const newCategories = settings.allowedCategories.includes(category)
          ? settings.allowedCategories.filter(c => c !== category)
          : [...settings.allowedCategories, category];
      onSettingsChange({ ...settings, allowedCategories: newCategories });
  };
  
  const handleSelectAll = () => {
       onSettingsChange({ ...settings, allowedCategories: [] });
  };

  return (
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <h2 className="text-xl font-bold mb-6 text-cyan-300">تنظیمات نمایش اخبار</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        
        {/* Columns */}
        <div>
          <label htmlFor="columns" className="block text-sm font-medium text-cyan-300 mb-2">تعداد ستون‌ها: {settings.columns}</label>
          <input
            id="columns"
            type="range"
            min="1"
            max="4"
            value={settings.columns}
            onChange={(e) => onSettingsChange({ ...settings, columns: Number(e.target.value) })}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Articles per Column */}
        <div>
          <label htmlFor="articlesPerColumn" className="block text-sm font-medium text-cyan-300 mb-2">تعداد اخبار برای نمایش: {settings.articlesPerColumn}</label>
          <input
            id="articlesPerColumn"
            type="range"
            min="1"
            max="20"
            value={settings.articlesPerColumn}
            onChange={(e) => onSettingsChange({ ...settings, articlesPerColumn: Number(e.target.value) })}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {/* Show Images Toggle */}
        <div className="flex items-center gap-3">
          <label htmlFor="showImages" className="text-sm font-medium text-cyan-300">نمایش تصاویر اخبار</label>
          <button
            id="showImages"
            onClick={() => onSettingsChange({ ...settings, showImages: !settings.showImages })}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.showImages ? 'bg-cyan-500' : 'bg-gray-600'}`}
          >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.showImages ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Slideshow Toggle */}
        <div className="flex items-center gap-3">
          <label htmlFor="slideshow" className="text-sm font-medium text-cyan-300">نمایش اسلایدی</label>
          <button
            id="slideshow"
            onClick={() => onSettingsChange({ ...settings, slideshow: { ...settings.slideshow, enabled: !settings.slideshow.enabled }})}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.slideshow.enabled ? 'bg-cyan-500' : 'bg-gray-600'}`}
          >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.slideshow.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Slideshow Delay */}
        {settings.slideshow.enabled && (
            <div className="md:col-span-2">
                <label htmlFor="slideshowDelay" className="block text-sm font-medium text-cyan-300 mb-2">زمان مکث اسلاید (ثانیه): {settings.slideshow.delay}</label>
                <input
                    id="slideshowDelay"
                    type="range"
                    min="2"
                    max="15"
                    value={settings.slideshow.delay}
                    onChange={(e) => onSettingsChange({ ...settings, slideshow: {...settings.slideshow, delay: Number(e.target.value) } })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        )}
        
        {/* Category Filter */}
        <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-cyan-300 mb-3">نمایش دسته‌بندی‌های خاص (خالی بودن = نمایش همه)</h3>
            <div className="flex flex-wrap gap-2">
                <button onClick={handleSelectAll} className={`px-3 py-1.5 text-xs rounded-full border-2 ${settings.allowedCategories.length === 0 ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}>
                    همه دسته‌بندی‌ها
                </button>
                {allCategories.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => handleCategoryToggle(cat)}
                        className={`px-3 py-1.5 text-xs rounded-full border-2 ${settings.allowedCategories.includes(cat) ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default DisplaySettingsComponent;