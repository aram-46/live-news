import React, { useState } from 'react';
import { AppSettings, LiveNewsSpecificSettings } from '../../types';
import CollapsibleSourceSelector from './CollapsibleSourceSelector';
import { MagicIcon, PlusIcon, TrashIcon } from '../icons';
import { generateEditableListItems } from '../../services/geminiService';
import FontSettingsEditor from './FontSettingsEditor';

interface LiveNewsSettingsProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
}

const LiveNewsSettings: React.FC<LiveNewsSettingsProps> = ({ settings, onSettingsChange }) => {
    const [isAiLoading, setIsAiLoading] = useState<string | null>(null);

    const handleLiveNewsChange = (change: Partial<LiveNewsSpecificSettings>) => {
        onSettingsChange({
            ...settings,
            liveNewsSpecifics: { ...settings.liveNewsSpecifics, ...change }
        });
    };
    
    const handleGenerateList = async (listType: 'categories' | 'newsGroups' | 'regions') => {
        setIsAiLoading(listType);
        try {
            const currentItems = settings.liveNewsSpecifics[listType];
            const listName = {
                categories: 'دسته‌بندی‌های خبری',
                newsGroups: 'گروه‌های خبری (مانند فوری، تحلیلی)',
                regions: 'مناطق جغرافیایی مهم خبری'
            }[listType];

            const newItems = await generateEditableListItems(listName, listType, 3);
            
            const updatedItems = [...new Set([...currentItems, ...newItems])];
            handleLiveNewsChange({ [listType]: updatedItems });

        } catch (error) {
            console.error(`Failed to generate items for ${listType}`, error);
            alert(`خطا در تولید موارد برای ${listType}`);
        } finally {
            setIsAiLoading(null);
        }
    };

    const updateIntervals = [
        { label: '۱ دقیقه', value: 1 },
        { label: '۵ دقیقه', value: 5 },
        { label: '۱۵ دقیقه', value: 15 },
        { label: '۱ ساعت', value: 60 },
        { label: '۴ ساعت', value: 240 },
    ];

    const AiEditableList: React.FC<{
        listType: 'categories' | 'newsGroups' | 'regions';
        title: string;
        placeholder: string;
    }> = ({ listType, title, placeholder }) => {
        const items = settings.liveNewsSpecifics[listType];
        const onItemsChange = (newItems: string[]) => {
            handleLiveNewsChange({ [listType]: newItems });
        };
        const [newItem, setNewItem] = useState('');

        const handleAddItem = () => {
            if (newItem.trim() && !items.includes(newItem.trim())) {
                onItemsChange([...items, newItem.trim()]);
                setNewItem('');
            }
        };

        const handleRemoveItem = (itemToRemove: string) => {
            onItemsChange(items.filter(item => item !== itemToRemove));
        };

        return (
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    {title && <h3 className="text-base font-semibold text-cyan-200">{title}</h3>}
                     <button
                        type="button"
                        onClick={() => handleGenerateList(listType)}
                        disabled={!!isAiLoading}
                        className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 disabled:opacity-50"
                    >
                        {isAiLoading === listType ? (
                             <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        ) : (
                            <MagicIcon className="w-4 h-4" />
                        )}
                        <span>تولید با AI</span>
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/50 rounded-lg">
                    {items.map(item => (
                        <div key={item} className="flex items-center gap-1.5 bg-gray-700/80 border border-gray-600 rounded-full px-3 py-1 text-xs text-gray-200">
                            <span>{item}</span>
                            <button onClick={() => handleRemoveItem(item)} className="text-gray-400 hover:text-red-400 transition-colors">
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    {items.length === 0 && <span className="text-xs text-gray-500 px-2">موردی وجود ندارد.</span>}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder={placeholder}
                        className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5 text-sm"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); }}}
                    />
                    <button onClick={handleAddItem} className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold p-2.5 rounded-lg transition duration-300 flex-shrink-0">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-cyan-300">تنظیمات اصلی اخبار زنده</h2>
                
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-cyan-300">بررسی خودکار برای بروزرسانی</label>
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleLiveNewsChange({ updates: { ...settings.liveNewsSpecifics.updates, autoCheck: !settings.liveNewsSpecifics.updates.autoCheck }})} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.liveNewsSpecifics.updates.autoCheck ? 'bg-cyan-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.liveNewsSpecifics.updates.autoCheck ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        {settings.liveNewsSpecifics.updates.autoCheck && (
                            <select
                                value={settings.liveNewsSpecifics.updates.interval}
                                onChange={e => handleLiveNewsChange({ updates: { ...settings.liveNewsSpecifics.updates, interval: Number(e.target.value) }})}
                                className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm"
                            >
                                {updateIntervals.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                <AiEditableList 
                    listType='categories'
                    title="دسته‌بندی‌های اخبار زنده"
                    placeholder="افزودن دسته‌بندی جدید..."
                />
                <AiEditableList 
                    listType='newsGroups'
                    title="گروه‌های خبری"
                    placeholder="افزودن گروه جدید..."
                />
                <AiEditableList 
                    listType='regions'
                    title="مناطق جغرافیایی"
                    placeholder="افزودن منطقه جدید..."
                />
            </div>
            <div className="space-y-6">
                <CollapsibleSourceSelector 
                    allSources={settings.sources} 
                    selectedSources={settings.liveNewsSpecifics.selectedSources}
                    onSelectionChange={(selected) => handleLiveNewsChange({ selectedSources: selected })}
                />
                 <FontSettingsEditor
                    fontSettings={settings.liveNewsSpecifics.font}
                    onFontSettingsChange={(font) => handleLiveNewsChange({ font })}
                />
            </div>
        </div>
    );
};

export default LiveNewsSettings;
