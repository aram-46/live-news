

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { RSSFeeds, RSSFeed, SourceCategory, sourceCategoryLabels, generateUUID, AppSettings } from '../types';
import { findFeedsWithAI } from '../services/geminiService';
// FIX: Add missing icon imports
import { PlusIcon, TrashIcon, PencilIcon, ImportIcon, MagicIcon, CloseIcon } from './icons';

interface RSSFeedManagerProps {
  feeds: RSSFeeds;
  onFeedsChange: (feeds: RSSFeeds) => void;
  settings: AppSettings;
}

// FIX: Define a type for imported rows to prevent 'unknown' type errors.
type ImportedRow = {
    "نام سایت"?: string;
    "name"?: string;
    "آدرس خبرخوان"?: string;
    "url"?: string;
    "دسته بندی"?: SourceCategory;
    "category"?: SourceCategory;
};


const RSSFeedManager: React.FC<RSSFeedManagerProps> = ({ feeds, onFeedsChange, settings }) => {
  const [editingFeed, setEditingFeed] = useState<RSSFeed | null>(null);
  const [isAdding, setIsAdding] = useState<SourceCategory | null>(null);
  const [aiLoading, setAiLoading] = useState<SourceCategory | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeAiCategory, setActiveAiCategory] = useState<SourceCategory | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddOrEdit = (category: SourceCategory, feed: RSSFeed) => {
    const newFeeds = { ...feeds };
    if (editingFeed) { // Edit
      newFeeds[category] = newFeeds[category].map(f => f.id === feed.id ? feed : f);
    } else { // Add
        const isDuplicate = newFeeds[category].some(f => f.url.toLowerCase() === feed.url.toLowerCase());
        if(isDuplicate) {
            alert("یک خبرخوان با این آدرس (URL) از قبل وجود دارد.");
            return;
        }
      newFeeds[category] = [...newFeeds[category], feed];
    }
    onFeedsChange(newFeeds);
    setEditingFeed(null);
    setIsAdding(null);
  };
  
  const handleDelete = (category: SourceCategory, feedId: string) => {
    if (window.confirm('آیا از حذف این خبرخوان اطمینان دارید؟')) {
      const newFeeds = { ...feeds };
      newFeeds[category] = newFeeds[category].filter(f => f.id !== feedId);
      onFeedsChange(newFeeds);
    }
  };

  const handleFindWithAI = async (category: SourceCategory) => {
    setAiLoading(category);
    try {
        // FIX: Pass the settings object as the third argument.
        const newFoundFeeds = await findFeedsWithAI(category, feeds[category], settings);
        
        if(newFoundFeeds.length === 0) {
            alert("خبرخوان جدیدی توسط هوش مصنوعی یافت نشد.");
            return;
        }

        const feedsToAdd: RSSFeed[] = [];
        let skippedCount = 0;
        const existingUrls = new Set(feeds[category].map(f => f.url.toLowerCase().trim()));
        
        newFoundFeeds.forEach((f: Partial<RSSFeed>) => {
            if(f.url && existingUrls.has(f.url.toLowerCase().trim())) {
                skippedCount++;
            } else if (f.url && f.name) {
                feedsToAdd.push({ ...f, id: generateUUID(), category: category } as RSSFeed);
                existingUrls.add(f.url.toLowerCase().trim());
            }
        });

        if (feedsToAdd.length > 0) {
            const newFeeds = { ...feeds };
            newFeeds[category] = [...newFeeds[category], ...feedsToAdd];
            onFeedsChange(newFeeds);
        }

        alert(`${feedsToAdd.length} خبرخوان جدید اضافه شد. ${skippedCount} مورد تکراری نادیده گرفته شد.`);

    } catch (error) {
        alert("خطا در یافتن خبرخوان‌ها با هوش مصنوعی.");
        console.error(error);
    } finally {
        setAiLoading(null);
    }
  };

  const handleExportFile = () => {
    const allFeeds = (Object.keys(feeds) as SourceCategory[]).flatMap(category => 
        feeds[category].map(feed => ({
            "نام سایت": feed.name,
            "آدرس خبرخوان": feed.url,
            "دسته بندی": category
        }))
    );

    if (allFeeds.length === 0) {
        alert("خبرخوانی برای خروجی گرفتن وجود ندارد.");
        return;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(allFeeds);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RSS_Feeds");
    XLSX.writeFile(workbook, "rss_feeds_backup.xlsx");
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
            
            // FIX: Explicitly type the parsed JSON to prevent 'unknown' type errors on `row`.
            const json: ImportedRow[] = XLSX.utils.sheet_to_json<ImportedRow>(worksheet);
            const newFeeds: RSSFeeds = JSON.parse(JSON.stringify(feeds));
            const existingUrls = new Set(Object.values(feeds).flat().map(f => f.url.toLowerCase().trim()));
            let addedCount = 0;
            let skippedCount = 0;
            
            json.forEach(row => {
                const url = row['آدرس خبرخوان'] || row.url;
                const name = row['نام سایت'] || row.name;
                const category = row['دسته بندی'] || row.category;

                if(category && newFeeds[category as SourceCategory] && url && name) {
                     if (existingUrls.has(url.toLowerCase().trim())) {
                        skippedCount++;
                     } else {
                        newFeeds[category as SourceCategory].push({
                            id: generateUUID(),
                            name,
                            url,
                            category: category as SourceCategory
                        });
                        existingUrls.add(url.toLowerCase().trim());
                        addedCount++;
                     }
                }
            });
            onFeedsChange(newFeeds);
            alert(`${addedCount} خبرخوان جدید وارد شد. ${skippedCount} مورد تکراری نادیده گرفته شد.`);
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

  const FeedForm: React.FC<{ category: SourceCategory; feed?: RSSFeed }> = ({ category, feed }) => {
    const [formData, setFormData] = useState(feed || { id: generateUUID(), name: '', url: '', category });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAddOrEdit(category, formData);
    };

    return (
        <tr className="bg-gray-800/50">
            <td colSpan={3} className="p-4">
                <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                    <input name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="نام سایت" className="flex-grow bg-gray-700 p-2 rounded" required />
                    <input name="url" type="url" value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} placeholder="آدرس کامل خبرخوان (RSS/Atom)" className="flex-grow bg-gray-700 p-2 rounded w-2/4" required/>
                    <div className="flex gap-2">
                        <button type="submit" className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white">ذخیره</button>
                        <button type="button" onClick={() => { setEditingFeed(null); setIsAdding(null); }} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-white">انصراف</button>
                    </div>
                </form>
            </td>
        </tr>
    );
  };

  return (
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-cyan-300">مدیریت خبرخوان‌ها (RSS Feeds)</h2>
            <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".xlsx, .xls, .csv" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm disabled:opacity-50">
                    {isImporting ? "در حال ورود..." : "ورود از فایل"}
                </button>
                 <button onClick={handleExportFile} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm">
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
                         <button onClick={() => handleFindWithAI(category)} disabled={!!aiLoading} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-lg transition duration-300 text-sm disabled:opacity-50">
                            {aiLoading === category ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <MagicIcon className="w-5 h-5"/>}
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
                                <th scope="col" className="px-4 py-3">نام سایت</th>
                                <th scope="col" className="px-4 py-3">آدرس خبرخوان</th>
                                <th scope="col" className="px-4 py-3">عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feeds[category].map(feed => (
                                editingFeed?.id === feed.id ? 
                                <FeedForm key={feed.id} category={category} feed={feed} /> :
                                <tr key={feed.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-medium">{feed.name}</td>
                                    <td className="px-4 py-3 text-left direction-ltr font-mono text-cyan-300"><a href={feed.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{feed.url}</a></td>
                                    <td className="px-4 py-3 flex gap-2">
                                        <button onClick={() => setEditingFeed(feed)} className="text-yellow-400 hover:text-yellow-300"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(category, feed.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))}
                            {isAdding === category && <FeedForm category={category} />}
                        </tbody>
                    </table>
                </div>
            </div>
        ))}
        </div>
    </div>
  );
};

export default RSSFeedManager;