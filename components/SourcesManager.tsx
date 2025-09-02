
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Sources, Source, SourceCategory, sourceCategoryLabels, generateUUID, AppSettings } from '../types';
import { findSourcesWithAI, FindSourcesOptions } from '../services/geminiService';
import { PlusIcon, TrashIcon, PencilIcon, ImportIcon, MagicIcon, CloseIcon } from './icons';

interface SourcesManagerProps {
  sources: Sources;
  onSourcesChange: (sources: Sources) => void;
  settings: AppSettings;
}

const getCredibilityClass = (credibility: string) => {
    const str = credibility.toLowerCase();
    if (str.includes('بسیار') || str.includes('high') || str.includes('بالا')) return {dot: 'bg-green-400', text: 'text-green-300' };
    if (str.includes('معتبر') || str.includes('medium') || str.includes('متوسط')) return {dot: 'bg-yellow-400', text: 'text-yellow-300' };
    if (str.includes('نیازمند') || str.includes('low') || str.includes('ضعیف')) return {dot: 'bg-red-400', text: 'text-red-300' };
    return { dot: 'bg-gray-400', text: 'text-gray-300' };
};

const SourcesManager: React.FC<SourcesManagerProps> = ({ sources, onSourcesChange, settings }) => {
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [isAdding, setIsAdding] = useState<SourceCategory | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeAiCategory, setActiveAiCategory] = useState<SourceCategory | null>(null);
  const [aiOptions, setAiOptions] = useState<FindSourcesOptions>({
      region: 'any',
      language: 'any',
      count: 3,
      credibility: 'any',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddOrEdit = (category: SourceCategory, source: Source) => {
    const newSources = { ...sources };
    if (editingSource) { // Edit
      newSources[category] = newSources[category].map(s => s.id === source.id ? source : s);
    } else { // Add
        // Check for duplicates before adding
        const isDuplicate = newSources[category].some(s => s.url.toLowerCase() === source.url.toLowerCase());
        if(isDuplicate) {
            alert("منبعی با این آدرس (URL) از قبل وجود دارد.");
            return;
        }
      newSources[category] = [...newSources[category], source];
    }
    onSourcesChange(newSources);
    setEditingSource(null);
    setIsAdding(null);
  };
  
  const handleDelete = (category: SourceCategory, sourceId: string) => {
    if (window.confirm('آیا از حذف این منبع اطمینان دارید؟')) {
      const newSources = { ...sources };
      newSources[category] = newSources[category].filter(s => s.id !== sourceId);
      onSourcesChange(newSources);
    }
  };

  const openAiModal = (category: SourceCategory) => {
    setActiveAiCategory(category);
    setIsAiModalOpen(true);
  };

  const handleFindWithAI = async () => {
    if (!activeAiCategory) return;
    setAiLoading(true);
    try {
        const existingSources = sources[activeAiCategory];
        // FIX: Removed extra 'settings' argument from the function call.
        const newFoundSources = await findSourcesWithAI(activeAiCategory, existingSources, aiOptions);
        
        if(newFoundSources.length === 0) {
            alert("منبع جدیدی توسط هوش مصنوعی یافت نشد.");
            return;
        }

        const sourcesToAdd: Source[] = [];
        let skippedCount = 0;
        const existingUrls = new Set(sources[activeAiCategory].map(s => s.url.toLowerCase().trim()));

        newFoundSources.forEach(s => {
            if(existingUrls.has(s.url.toLowerCase().trim())) {
                skippedCount++;
            } else {
                sourcesToAdd.push({...s, id: generateUUID()});
                existingUrls.add(s.url.toLowerCase().trim()); // Add to set to prevent duplicates within the same AI response
            }
        });

        if (sourcesToAdd.length > 0) {
            const newSources = { ...sources };
            newSources[activeAiCategory] = [...newSources[activeAiCategory], ...sourcesToAdd];
            onSourcesChange(newSources);
        }

        let alertMessage = '';
        if (sourcesToAdd.length > 0) {
            alertMessage += `${sourcesToAdd.length} منبع جدید با موفقیت اضافه شد.`;
        }
        if (skippedCount > 0) {
            alertMessage += `\n${skippedCount} منبع تکراری یافت شد و اضافه نگردید.`;
        }
        alert(alertMessage || "عملیات کامل شد، ولی منبع جدیدی برای افزودن وجود نداشت.");

    } catch (error) {
        alert("خطا در یافتن منابع با هوش مصنوعی.");
        console.error(error);
    } finally {
        setAiLoading(false);
        setIsAiModalOpen(false);
    }
  };

  const handleExportFile = () => {
    const allSourcesWithCategory = (Object.keys(sources) as SourceCategory[]).flatMap(category => 
        sources[category].map(source => ({
            "نام سایت": source.name,
            "حوزه": source.field,
            "آدرس سایت": source.url,
            "فعالیت": source.activity,
            "درجه اعتبار": source.credibility,
            "کشور یا منطقه": source.region,
            "دسته بندی": category
        }))
    );

    if (allSourcesWithCategory.length === 0) {
        alert("منبعی برای خروجی گرفتن وجود ندارد.");
        return;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(allSourcesWithCategory);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sources");
    XLSX.writeFile(workbook, "news_sources_backup.xlsx");
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            type ImportedRow = {
                "نام سایت"?: string;
                "حوزه"?: string;
                "آدرس سایت"?: string;
                "فعالیت"?: string;
                "درجه اعتبار"?: string;
                "کشور یا منطقه"?: string;
                "دسته بندی"?: SourceCategory;
            };

            const json: ImportedRow[] = XLSX.utils.sheet_to_json<ImportedRow>(worksheet, { header: ["نام سایت", "حوزه", "آدرس سایت", "فعالیت", "درجه اعتبار", "کشور یا منطقه", "دسته بندی"] });

            const newSources: Sources = JSON.parse(JSON.stringify(sources));
            const existingUrls = new Set(Object.values(sources).flat().map(s => s.url.toLowerCase().trim()));
            let addedCount = 0;
            let skippedCount = 0;
            
            const dataRows = json.slice(1);

            dataRows.forEach((row: ImportedRow) => {
                const url = row['آدرس سایت'] || '';
                const category = row['دسته بندی'] as SourceCategory;

                if(category && newSources[category] && url) {
                     if (existingUrls.has(url.toLowerCase().trim())) {
                        skippedCount++;
                     } else {
                        newSources[category].push({
                            id: generateUUID(),
                            name: row['نام سایت'] || '',
                            field: row['حوزه'] || '',
                            url: url,
                            activity: row['فعالیت'] || '',
                            credibility: row['درجه اعتبار'] || '',
                            region: row['کشور یا منطقه'] || ''
                        });
                        existingUrls.add(url.toLowerCase().trim()); // Add to set to prevent duplicates within the file
                        addedCount++;
                     }
                }
            });
            onSourcesChange(newSources);
            alert(`${addedCount} منبع جدید وارد شد. ${skippedCount} منبع تکراری نادیده گرفته شد.`);
        } catch (error) {
            alert('خطا در پردازش فایل.');
            console.error(error);
        } finally {
            setIsImporting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    reader.readAsBinaryString(file);
  };

  const SourceForm: React.FC<{ category: SourceCategory; source?: Source }> = ({ category, source }) => {
    const [formData, setFormData] = useState(source || { id: generateUUID(), name: '', field: '', url: '', activity: '', credibility: '', region: '' });
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAddOrEdit(category, formData);
    };

    return (
        <tr className="bg-gray-800/50">
            <td colSpan={5} className="p-4">
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="نام" className="bg-gray-700 p-2 rounded col-span-1" required />
                    <input name="field" value={formData.field} onChange={handleChange} placeholder="حوزه" className="bg-gray-700 p-2 rounded col-span-1" />
                    <input name="url" type="url" value={formData.url} onChange={handleChange} placeholder="آدرس" className="bg-gray-700 p-2 rounded col-span-2" required/>
                    <input name="activity" value={formData.activity} onChange={handleChange} placeholder="فعالیت" className="bg-gray-700 p-2 rounded col-span-2" />
                    <input name="credibility" value={formData.credibility} onChange={handleChange} placeholder="اعتبار" className="bg-gray-700 p-2 rounded col-span-1" />
                    <input name="region" value={formData.region} onChange={handleChange} placeholder="منطقه" className="bg-gray-700 p-2 rounded col-span-1" />
                    <div className="col-span-2 flex gap-2">
                        <button type="submit" className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white">ذخیره</button>
                        <button type="button" onClick={() => { setEditingSource(null); setIsAdding(null); }} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-white">انصراف</button>
                    </div>
                </form>
            </td>
        </tr>
    );
  };
  
  const AiSearchModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setIsAiModalOpen(false)}>
        <div className="bg-gray-900 border border-cyan-400/30 rounded-lg shadow-2xl p-6 w-full max-w-md text-primary" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-cyan-300">جستجوی هوشمند منابع</h3>
                <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">منطقه</label>
                    <select value={aiOptions.region} onChange={e => setAiOptions({...aiOptions, region: e.target.value as any})} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg p-2">
                        <option value="any">همه</option>
                        <option value="internal">داخلی (ایران)</option>
                        <option value="external">خارجی</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">زبان</label>
                    <select value={aiOptions.language} onChange={e => setAiOptions({...aiOptions, language: e.target.value as any})} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg p-2">
                        <option value="any">همه</option>
                        <option value="persian">فارسی</option>
                        <option value="non-persian">غیرفارسی</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">سطح اعتبار</label>
                    <select value={aiOptions.credibility} onChange={e => setAiOptions({...aiOptions, credibility: e.target.value as any})} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg p-2">
                        <option value="any">همه</option>
                        <option value="high">بالا</option>
                        <option value="medium">متوسط</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">تعداد نتایج: {aiOptions.count}</label>
                    <input type="range" min="1" max="10" value={aiOptions.count} onChange={e => setAiOptions({...aiOptions, count: Number(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <button onClick={handleFindWithAI} disabled={aiLoading} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-bold py-3 px-4 rounded-lg transition">
                    {aiLoading ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <MagicIcon className="w-5 h-5"/>}
                    <span>{aiLoading ? 'در حال جستجو...' : 'شروع جستجو'}</span>
                </button>
            </div>
        </div>
    </div>
  );


  return (
    <>
    {isAiModalOpen && <AiSearchModal />}
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-cyan-300">مدیریت منابع خبری</h2>
            <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".xlsx, .xls, .csv" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm disabled:opacity-50">
                    {isImporting ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <ImportIcon className="w-5 h-5"/>}
                    <span>{isImporting ? "در حال ورود..." : "ورود از فایل"}</span>
                </button>
                 <button onClick={handleExportFile} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm">
                    <ImportIcon className="w-5 h-5"/>
                    خروجی فایل
                </button>
            </div>
        </div>
        
        <div className="space-y-8">
        {(Object.keys(sourceCategoryLabels) as SourceCategory[]).map(category => (
            <div key={category}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-cyan-200">{sourceCategoryLabels[category]}</h3>
                    <div className="flex gap-2">
                         <button onClick={() => openAiModal(category)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-lg transition duration-300 text-sm">
                            <MagicIcon className="w-5 h-5"/>
                            <span>جستجو با AI</span>
                        </button>
                        <button onClick={() => setIsAdding(category)} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-3 rounded-lg transition duration-300 text-sm">
                            <PlusIcon className="w-5 h-5"/>
                            <span>افزودن</span>
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-300">
                        <thead className="text-xs text-cyan-200 uppercase bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-4 py-3">نام</th>
                                <th scope="col" className="px-4 py-3">حوزه</th>
                                <th scope="col" className="px-4 py-3">اعتبار</th>
                                <th scope="col" className="px-4 py-3">منطقه</th>
                                <th scope="col" className="px-4 py-3">عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sources[category].map(source => {
                                const credibilityClasses = getCredibilityClass(source.credibility);
                                return editingSource?.id === source.id ? 
                                <SourceForm key={source.id} category={category} source={source} />
                                :
                                <tr key={source.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-medium"><a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{source.name}</a></td>
                                    <td className="px-4 py-3">{source.field}</td>
                                    <td className="px-4 py-3">
                                        <div className={`flex items-center gap-2 ${credibilityClasses.text}`}>
                                            <span className={`w-2.5 h-2.5 rounded-full ${credibilityClasses.dot}`}></span>
                                            <span>{source.credibility}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{source.region}</td>
                                    <td className="px-4 py-3 flex gap-2">
                                        <button onClick={() => setEditingSource(source)} className="text-yellow-400 hover:text-yellow-300"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(category, source.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            })}
                            {isAdding === category && <SourceForm category={category} />}
                        </tbody>
                    </table>
                </div>
            </div>
        ))}
        </div>
    </div>
    </>
  );
};

export default SourcesManager;
