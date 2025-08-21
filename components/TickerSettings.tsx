

import React from 'react';
import { TickerSettings } from '../types';

interface TickerSettingsProps {
  settings: TickerSettings;
  onSettingsChange: (settings: TickerSettings) => void;
  allCategories: string[];
}

const TickerSettingsComponent: React.FC<TickerSettingsProps> = ({ settings, onSettingsChange, allCategories }) => {

    const handleCategoryToggle = (category: string) => {
        const newCategories = settings.categories.includes(category)
            ? settings.categories.filter(c => c !== category)
            : [...settings.categories, category];
        onSettingsChange({ ...settings, categories: newCategories });
    };

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-xl font-bold mb-6 text-cyan-300">تنظیمات نوار اخبار متحرک</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                {/* Speed */}
                <div>
                    <label htmlFor="speed" className="block text-sm font-medium text-cyan-300 mb-2">سرعت حرکت (ثانیه): {settings.speed}</label>
                    <input
                        id="speed"
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={settings.speed}
                        onChange={(e) => onSettingsChange({ ...settings, speed: Number(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                
                {/* Direction */}
                <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">جهت حرکت</label>
                    <div className="flex gap-2 rounded-lg bg-gray-700/50 p-1">
                        <button onClick={() => onSettingsChange({...settings, direction: 'right'})} className={`w-full py-1 rounded ${settings.direction === 'right' ? 'bg-cyan-500 text-black' : 'hover:bg-gray-600'}`}>راست</button>
                        <button onClick={() => onSettingsChange({...settings, direction: 'left'})} className={`w-full py-1 rounded ${settings.direction === 'left' ? 'bg-cyan-500 text-black' : 'hover:bg-gray-600'}`}>چپ</button>
                    </div>
                </div>

                {/* Text Color */}
                 <div>
                    <label htmlFor="textColor" className="block text-sm font-medium text-cyan-300 mb-2">رنگ متن</label>
                    <input 
                        id="textColor"
                        type="color"
                        value={settings.textColor}
                        onChange={e => onSettingsChange({...settings, textColor: e.target.value})}
                        className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                    />
                 </div>
                
                {/* Hover Color */}
                 <div>
                    <label htmlFor="hoverColor" className="block text-sm font-medium text-cyan-300 mb-2">رنگ متن هاور</label>
                    <input 
                        id="hoverColor"
                        type="color"
                        value={settings.hoverColor}
                        onChange={e => onSettingsChange({...settings, hoverColor: e.target.value})}
                        className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                    />
                 </div>

                {/* Categories */}
                <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-cyan-300 mb-3">دسته‌بندی‌های نوار اخبار (خالی بودن = همه)</h3>
                    <div className="flex flex-wrap gap-2">
                        {allCategories.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => handleCategoryToggle(cat)}
                                className={`px-3 py-1.5 text-xs rounded-full border-2 ${settings.categories.includes(cat) ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
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

export default TickerSettingsComponent;