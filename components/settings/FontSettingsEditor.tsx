


import React from 'react';
import { FontSettings } from '../../types';

interface FontSettingsEditorProps {
    fontSettings: FontSettings;
    onFontSettingsChange: (settings: FontSettings) => void;
}

const FONT_FACES = ['system-ui, sans-serif', 'Vazirmatn, sans-serif', 'Sahel, sans-serif', 'Samim, sans-serif'];

const FontSettingsEditor: React.FC<FontSettingsEditorProps> = ({ fontSettings, onFontSettingsChange }) => {
    
    const handleColorChange = (part: 'from' | 'to', value: string) => {
        onFontSettingsChange({
            ...fontSettings,
            color: { ...fontSettings.color, [part]: value }
        });
    };
    
    return (
        <div className="space-y-3">
            <h3 className="text-xl font-bold mb-4 text-cyan-300">تنظیمات فونت متن اخبار</h3>
            
            <div>
                <label htmlFor="fontFamily" className="block text-xs font-medium text-gray-300 mb-1">نوع فونت</label>
                <select
                    id="fontFamily"
                    value={fontSettings.family}
                    onChange={(e) => onFontSettingsChange({ ...fontSettings, family: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5 text-sm"
                >
                    {FONT_FACES.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}
                </select>
            </div>

            <div>
                <label htmlFor="fontSize" className="block text-xs font-medium text-gray-300 mb-1">اندازه فونت: {fontSettings.size}px</label>
                <input
                    id="fontSize"
                    type="range"
                    min="12"
                    max="18"
                    value={fontSettings.size}
                    onChange={(e) => onFontSettingsChange({ ...fontSettings, size: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            <div>
                 <label className="block text-xs font-medium text-gray-300 mb-1">رنگ گرادیان متن</label>
                 <div className="flex items-center gap-2">
                    <input type="color" value={fontSettings.color.from} onChange={e => handleColorChange('from', e.target.value)} className="w-full h-9 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer" />
                    <input type="color" value={fontSettings.color.to} onChange={e => handleColorChange('to', e.target.value)} className="w-full h-9 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer" />
                    <div className="w-full h-9 rounded-lg" style={{ background: `linear-gradient(to right, ${fontSettings.color.from}, ${fontSettings.color.to})` }}></div>
                 </div>
            </div>
        </div>
    );
};

export default FontSettingsEditor;