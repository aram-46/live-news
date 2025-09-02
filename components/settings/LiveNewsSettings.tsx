
import React, { useState } from 'react';
import { AppSettings, LiveNewsSpecificSettings } from '../../types';
import EditableList from './EditableList';
import CollapsibleSourceSelector from './CollapsibleSourceSelector';
import { MagicIcon } from '../icons';
import { generateEditableListItems } from '../../services/geminiService';


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

            // FIX: Removed extra 'settings' argument from the function call.
            const newItems = await generateEditableListItems(listName, currentItems);
            
            const updatedItems = [...currentItems];
            newItems.forEach(item => {
                if (!updatedItems.includes(item)) {
                    updatedItems.push(item);
                }
            });
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
    }> = ({ listType, title, placeholder }) => (
         <div className="space-y-3">
            <div className="flex items-center gap-2">
                 <h3 className="text-base font-semibold text-cyan-200">{title}</h3>
                 <button onClick={() => handleGenerateList(listType)} disabled={isAiLoading === listType} className="text-purple-400 hover:text-purple-300 disabled:opacity-50">
                    {isAiLoading === listType 
                        ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> 
                        : <MagicIcon className="w-4 h-4"/>
                    }
                 </button>
            </div>
            {/* FIX: Added the required 'settings' prop to the EditableList component. */}
            <EditableList
                title=""
                items={settings.liveNewsSpecifics[listType]}
                onItemsChange={(items) => handleLiveNewsChange({ [listType]: items })}
                placeholder={placeholder}
                settings={settings}
            />
        </div>
    );

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
            <div>
                <h2 className="text-xl font-bold mb-2 text-cyan-300">تنظیمات اختصاصی اخبار زنده</h2>
                <p className="text-sm text-gray-400">فیلترها، منابع و ظاهر بخش اخبار زنده را در اینجا سفارشی کنید.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AiEditableList listType="categories" title="دسته‌بندی‌های خبری" placeholder="افزودن دسته‌بندی..." />
                <AiEditableList listType="newsGroups" title="گروه‌های خبری" placeholder="افزودن گروه خبری..." />
                <AiEditableList listType="regions" title="مناطق جغرافیایی" placeholder="افزودن منطقه..." />
            </div>

            <CollapsibleSourceSelector
                allSources={settings.sources}
                selectedSources={settings.liveNewsSpecifics.selectedSources}
                onSelectionChange={(selected) => handleLiveNewsChange({ selectedSources: selected })}
            />

            <div>
                 <h3 className="text-lg font-semibold text-cyan-200 mb-4">تنظیمات بروزرسانی خودکار</h3>
                 <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center flex-wrap">
                    <div className="flex items-center gap-3">
                        <label htmlFor="autoCheck" className="text-sm font-medium text-cyan-300">فعال‌سازی بررسی خودکار</label>
                        <button id="autoCheck" onClick={() => handleLiveNewsChange({ updates: { ...settings.liveNewsSpecifics.updates, autoCheck: !settings.liveNewsSpecifics.updates.autoCheck }})} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.liveNewsSpecifics.updates.autoCheck ? 'bg-cyan-500' : 'bg-gray-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.liveNewsSpecifics.updates.autoCheck ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                    </div>
                     {settings.liveNewsSpecifics.updates.autoCheck && (
                         <div className="flex items-center gap-3">
                            <label htmlFor="updateInterval" className="text-sm font-medium text-cyan-300">فاصله زمانی بررسی</label>
                            <select
                                id="updateInterval"
                                value={settings.liveNewsSpecifics.updates.interval}
                                onChange={(e) => handleLiveNewsChange({ updates: { ...settings.liveNewsSpecifics.updates, interval: Number(e.target.value) }})}
                                className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm"
                            >
                                {updateIntervals.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                         </div>
                     )}
                      <div className="flex items-center gap-3">
                        <label htmlFor="autoSend" className="text-sm font-medium text-cyan-300">ارسال خودکار به پلتفرم‌ها</label>
                        <button id="autoSend" onClick={() => handleLiveNewsChange({ autoSend: !settings.liveNewsSpecifics.autoSend })} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.liveNewsSpecifics.autoSend ? 'bg-cyan-500' : 'bg-gray-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.liveNewsSpecifics.autoSend ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                    </div>
                    <button onClick={() => alert('تغییرات شما به صورت خودکار ذخیره و اعمال شد.')} className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 rounded-lg transition duration-300 text-sm">
                        اعمال تغییرات
                    </button>
                 </div>
                 <p className="text-xs text-gray-500 mt-2">توجه: تمام تغییرات در این صفحه به صورت خودکار ذخیره می‌شوند.</p>
            </div>
        </div>
    );
};

export default LiveNewsSettings;
