

import React, { useState, useRef, useCallback } from 'react';
import { AppSettings, MediaFile, generateUUID, PageConfig, MenuItem, Slide } from '../types';
import { generateAboutMePage } from '../services/geminiService';
import { SparklesIcon, UploadIcon, LinkIcon, CloseIcon, ClipboardIcon, CheckCircleIcon, TrashIcon, PlusIcon } from './icons';

// --- Reusable Collapsible Section Component ---
const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; initialOpen?: boolean }> = ({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    return (
        <div className="border border-gray-700/50 rounded-lg">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-right bg-gray-800/40 hover:bg-gray-700/50 rounded-t-lg">
                <span className="font-semibold text-cyan-300">{title}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && <div className="p-4 space-y-4">{children}</div>}
        </div>
    );
};


const PageBuilder: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    // Input State
    const [description, setDescription] = useState('');
    const [siteUrl, setSiteUrl] = useState('');
    const [platform, setPlatform] = useState('Personal Website');
    
    // Config State
    const [pageConfig, setPageConfig] = useState<PageConfig>({
        template: 'Minimalist Dark',
        layoutColumns: 1,
        header: true,
        footer: true,
        menu: { 
            enabled: false, 
            items: [{id: generateUUID(), label: 'Home', link: '#'}],
            fontFamily: 'system-ui',
            fontSize: 16,
            textColor: '#e5e7eb',
            bgColor: '#1f2937',
            borderColor: '#4b5563',
            borderRadius: 8,
            gradientFrom: '#3b82f6',
            gradientTo: '#8b5cf6',
            iconColor: '#9ca3af'
        },
        slideshow: { 
            enabled: true, 
            slides: [],
            style: 'Carousel',
            animation: 'Slide',
            direction: 'Horizontal',
            delay: 3,
            speed: 500,
            width: '100%',
            height: '400px',
            captionFontFamily: 'system-ui',
            captionFontSize: 16,
            captionColor: '#ffffff',
            captionBgColor: 'rgba(0, 0, 0, 0.5)'
        },
        marquee: { 
            enabled: false,
            text: 'Your scrolling text here! <strong>Bold text</strong> and <a href="#">links</a> are supported.',
            fontFamily: 'system-ui',
            fontSize: 14,
            textColor: '#e5e7eb',
            bgColor: '#111827',
            speed: 20,
            direction: 'left',
            border: '1px solid #374151',
            padding: '10px'
        }
    });
    
    // Menu item temp state
    const [newMenuItem, setNewMenuItem] = useState({ label: '', link: '', parentId: 'root' });
    const [newSlideUrl, setNewSlideUrl] = useState('');

    // Output State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultHtml, setResultHtml] = useState('');
    const [resultText, setResultText] = useState('');
    const [outputTab, setOutputTab] = useState<'preview' | 'html' | 'text'>('preview');
    const [copyStatus, setCopyStatus] = useState<'html' | 'text' | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = (e.target?.result as string).split(',')[1];
                handleNestedConfigChange('slideshow', 'slides', [
                    ...pageConfig.slideshow.slides,
                    { id: generateUUID(), type: 'upload', content: base64Data, name: file.name, caption: file.name }
                ]);
            };
            reader.readAsDataURL(file);
        });
        if (event.target) event.target.value = '';
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) { setError('Please provide a description to build the page.'); return; }
        setIsLoading(true);
        setError(null);
        setResultHtml('');
        setResultText('');
        try {
            const imagePayload = pageConfig.slideshow.slides
                .filter(s => s.type === 'upload')
                .map(img => ({ data: img.content, mimeType: 'image/png' })); // Simplification for mime type
            
            const html = await generateAboutMePage(description, siteUrl, platform, imagePayload, pageConfig, settings.aiInstructions['page-builder']);
            setResultHtml(html);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            setResultText(tempDiv.textContent || tempDiv.innerText || '');
            setOutputTab('preview');
        } catch (err) {
            console.error("Failed to generate page", err);
            setError("An error occurred while generating the page. Please check the console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfigChange = <K extends keyof PageConfig>(key: K, value: PageConfig[K]) => {
        setPageConfig(prev => ({...prev, [key]: value}));
    }
    
    const handleNestedConfigChange = <K1 extends keyof PageConfig, K2 extends keyof PageConfig[K1]>(key1: K1, key2: K2, value: PageConfig[K1][K2]) => {
        setPageConfig(prev => ({
            ...prev,
            [key1]: {
                ...(prev[key1] as object),
                [key2]: value
            }
        }));
    };
    
    const handleCopy = (type: 'html' | 'text') => {
        const content = type === 'html' ? resultHtml : resultText;
        navigator.clipboard.writeText(content);
        setCopyStatus(type);
        setTimeout(() => setCopyStatus(null), 2000);
    }

    const addMenuItem = () => {
        if (!newMenuItem.label.trim() || !newMenuItem.link.trim()) return;
        const newItem: MenuItem = { ...newMenuItem, id: generateUUID(), children: [] };
        
        if (newMenuItem.parentId === 'root') {
            handleNestedConfigChange('menu', 'items', [...pageConfig.menu.items, newItem]);
        } else {
            const addSubItem = (items: MenuItem[]): MenuItem[] => {
                return items.map(item => {
                    if (item.id === newMenuItem.parentId) {
                        return { ...item, children: [...(item.children || []), newItem] };
                    }
                    if (item.children) {
                        return { ...item, children: addSubItem(item.children) };
                    }
                    return item;
                });
            };
            handleNestedConfigChange('menu', 'items', addSubItem(pageConfig.menu.items));
        }
        setNewMenuItem({ label: '', link: '', parentId: 'root' });
    };

     const addSlideFromUrl = () => {
        if (!newSlideUrl.trim()) return;
        try {
            new URL(newSlideUrl); // Validate URL
            handleNestedConfigChange('slideshow', 'slides', [
                ...pageConfig.slideshow.slides,
                { id: generateUUID(), type: 'url', content: newSlideUrl, name: newSlideUrl.split('/').pop() || 'image', caption: 'New Image' }
            ]);
            setNewSlideUrl('');
        } catch (_) {
            alert('آدرس تصویر نامعتبر است.');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel: Inputs & Config */}
            <div className="space-y-6">
                <form onSubmit={handleGenerate} className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-xl shadow-cyan-500/10 space-y-6">
                    <h2 className="text-xl font-bold text-cyan-300">اطلاعات پایه</h2>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="درباره خودتان، مهارت‌ها و علاقه‌مندی‌هایتان بنویسید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="url" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="آدرس وب‌سایت (اختیاری)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                        <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5">
                            <option>Personal Website</option>
                            <option>GitHub Profile</option>
                            <option>Portfolio</option>
                        </select>
                    </div>
                     <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition"><SparklesIcon className="w-5 h-5"/> {isLoading ? 'در حال ساخت...' : 'ساخت صفحه'}</button>
                </form>
                
                {/* Config Sections */}
                <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-xl shadow-cyan-500/10 space-y-4">
                    <h2 className="text-xl font-bold text-cyan-300">پیکربندی پیشرفته</h2>
                    <CollapsibleSection title="قالب و طرح‌بندی">
                         <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <label className="block mb-1 text-gray-300">قالب</label>
                                <select value={pageConfig.template} onChange={e => handleConfigChange('template', e.target.value as any)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2">
                                    <option>Minimalist Dark</option>
                                    <option>Professional Light</option>
                                    <option>Creative Portfolio</option>
                                </select>
                            </div>
                             <div>
                                <label className="block mb-1 text-gray-300">تعداد ستون</label>
                                <select value={pageConfig.layoutColumns} onChange={e => handleConfigChange('layoutColumns', Number(e.target.value) as any)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2">
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2"><input type="checkbox" checked={pageConfig.header} onChange={e => handleConfigChange('header', e.target.checked)} id="cb-header" /><label htmlFor="cb-header">نمایش هدر</label></div>
                            <div className="flex items-center gap-2"><input type="checkbox" checked={pageConfig.footer} onChange={e => handleConfigChange('footer', e.target.checked)} id="cb-footer" /><label htmlFor="cb-footer">نمایش فوتر</label></div>
                        </div>
                    </CollapsibleSection>
                     <CollapsibleSection title="منوی ناوبری (Navigation Menu)">
                        <div className="flex items-center gap-2 mb-2"><input type="checkbox" checked={pageConfig.menu.enabled} onChange={e => handleNestedConfigChange('menu', 'enabled', e.target.checked)} id="cb-menu-enabled" /><label htmlFor="cb-menu-enabled">فعال‌سازی منو</label></div>
                        {pageConfig.menu.enabled && (
                           <>
                            <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-700 pt-4">
                                <div><label>فونت</label><select value={pageConfig.menu.fontFamily} onChange={e => handleNestedConfigChange('menu', 'fontFamily', e.target.value)} className="w-full bg-gray-900 p-1 rounded"><option>system-ui</option><option>Vazirmatn</option></select></div>
                                <div><label>اندازه فونت: {pageConfig.menu.fontSize}px</label><input type="range" min="12" max="20" value={pageConfig.menu.fontSize} onChange={e => handleNestedConfigChange('menu', 'fontSize', Number(e.target.value))} /></div>
                                <div><label>رنگ متن</label><input type="color" value={pageConfig.menu.textColor} onChange={e => handleNestedConfigChange('menu', 'textColor', e.target.value)} className="w-full h-8 p-0" /></div>
                                <div><label>رنگ آیکون</label><input type="color" value={pageConfig.menu.iconColor} onChange={e => handleNestedConfigChange('menu', 'iconColor', e.target.value)} className="w-full h-8 p-0" /></div>
                                <div><label>پس‌زمینه</label><input type="color" value={pageConfig.menu.bgColor} onChange={e => handleNestedConfigChange('menu', 'bgColor', e.target.value)} className="w-full h-8 p-0" /></div>
                                <div><label>رنگ حاشیه</label><input type="color" value={pageConfig.menu.borderColor} onChange={e => handleNestedConfigChange('menu', 'borderColor', e.target.value)} className="w-full h-8 p-0" /></div>
                            </div>
                           </>
                        )}
                    </CollapsibleSection>
                     <CollapsibleSection title="اسلایدشو تصاویر" initialOpen>
                        <div className="flex items-center gap-2 mb-2"><input type="checkbox" checked={pageConfig.slideshow.enabled} onChange={e => handleNestedConfigChange('slideshow', 'enabled', e.target.checked)} id="cb-slideshow-enabled" /><label htmlFor="cb-slideshow-enabled">فعال‌سازی اسلایدشو</label></div>
                        {pageConfig.slideshow.enabled && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><label>عرض</label><input value={pageConfig.slideshow.width} onChange={e => handleNestedConfigChange('slideshow', 'width', e.target.value)} className="w-full bg-gray-900 p-1 rounded" /></div>
                                    <div><label>ارتفاع</label><input value={pageConfig.slideshow.height} onChange={e => handleNestedConfigChange('slideshow', 'height', e.target.value)} className="w-full bg-gray-900 p-1 rounded" /></div>
                                    <div><label>مکث (ثانیه)</label><input type="number" min="1" max="10" value={pageConfig.slideshow.delay} onChange={e => handleNestedConfigChange('slideshow', 'delay', Number(e.target.value))} className="w-full bg-gray-900 p-1 rounded" /></div>
                                    <div><label>سرعت (ms)</label><input type="number" min="100" max="2000" step="100" value={pageConfig.slideshow.speed} onChange={e => handleNestedConfigChange('slideshow', 'speed', Number(e.target.value))} className="w-full bg-gray-900 p-1 rounded" /></div>
                                </div>
                                <div className="space-y-2">
                                     <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden"/>
                                     <div className="flex gap-2">
                                         <input value={newSlideUrl} onChange={e => setNewSlideUrl(e.target.value)} placeholder="افزودن تصویر با URL" className="w-full bg-gray-900 p-1 rounded text-sm"/>
                                         <button type="button" onClick={addSlideFromUrl} className="p-1 bg-cyan-600 rounded"><PlusIcon className="w-5 h-5"/></button>
                                     </div>
                                     <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-sm p-2 bg-gray-700 rounded">آپلود از کامپیوتر</button>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {pageConfig.slideshow.slides.map((slide, i) => (
                                        <div key={slide.id} className="p-2 bg-gray-900/50 rounded text-xs space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="truncate">{slide.name}</span>
                                                <button onClick={() => handleNestedConfigChange('slideshow', 'slides', pageConfig.slideshow.slides.filter(s => s.id !== slide.id))}><TrashIcon className="w-4 h-4 text-red-400"/></button>
                                            </div>
                                            <textarea value={slide.caption} onChange={e => {
                                                const newSlides = [...pageConfig.slideshow.slides];
                                                newSlides[i].caption = e.target.value;
                                                handleNestedConfigChange('slideshow', 'slides', newSlides);
                                            }} placeholder="کپشن... از **bold** و [لینک](url) استفاده کنید" rows={2} className="w-full bg-gray-800 text-xs p-1 rounded"/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CollapsibleSection>
                     <CollapsibleSection title="عناصر اضافی">
                        <div className="flex items-center gap-2 mb-2"><input type="checkbox" checked={pageConfig.marquee.enabled} onChange={e => handleNestedConfigChange('marquee', 'enabled', e.target.checked)} id="cb-marquee-enabled" /><label htmlFor="cb-marquee-enabled">فعال‌سازی متن متحرک</label></div>
                        {pageConfig.marquee.enabled && (
                            <div className="space-y-4">
                                <textarea value={pageConfig.marquee.text} onChange={e => handleNestedConfigChange('marquee', 'text', e.target.value)} rows={3} className="w-full bg-gray-900 p-1 rounded text-sm"/>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><label>رنگ متن</label><input type="color" value={pageConfig.marquee.textColor} onChange={e => handleNestedConfigChange('marquee', 'textColor', e.target.value)} className="w-full h-8 p-0" /></div>
                                    <div><label>پس‌زمینه</label><input type="color" value={pageConfig.marquee.bgColor} onChange={e => handleNestedConfigChange('marquee', 'bgColor', e.target.value)} className="w-full h-8 p-0" /></div>
                                    <div><label>سرعت (ثانیه)</label><input type="number" min="5" max="100" value={pageConfig.marquee.speed} onChange={e => handleNestedConfigChange('marquee', 'speed', Number(e.target.value))} className="w-full bg-gray-900 p-1 rounded" /></div>
                                    <div><label>جهت</label><select value={pageConfig.marquee.direction} onChange={e => handleNestedConfigChange('marquee', 'direction', e.target.value as any)} className="w-full bg-gray-900 p-1 rounded"><option value="left">چپ</option><option value="right">راست</option></select></div>
                                    <div className="col-span-2"><label>حاشیه (Border)</label><input value={pageConfig.marquee.border} onChange={e => handleNestedConfigChange('marquee', 'border', e.target.value)} placeholder="e.g., 1px solid #fff" className="w-full bg-gray-900 p-1 rounded" /></div>
                                </div>
                            </div>
                        )}
                    </CollapsibleSection>
                </div>
            </div>

            {/* Right Panel: Output */}
            <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-xl shadow-cyan-500/10 flex flex-col min-h-[80vh]">
                <div className="flex border-b border-cyan-400/20 mb-4">
                    {['preview', 'html', 'text'].map(tab => <button key={tab} onClick={() => setOutputTab(tab as any)} className={`px-4 py-2 text-sm font-medium transition-colors ${outputTab === tab ? 'border-b-2 border-cyan-400 text-cyan-300' : 'text-gray-400'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>)}
                </div>
                 {isLoading && <div className="flex-grow flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>}
                 {error && <div className="text-red-400">{error}</div>}
                 {!isLoading && !error && !resultHtml && <div className="flex-grow flex items-center justify-center text-gray-500">خروجی در اینجا نمایش داده می‌شود.</div>}
                 {resultHtml && (
                    <div className="flex-grow relative">
                        {outputTab === 'preview' && <iframe srcDoc={resultHtml} title="preview" className="w-full h-full bg-white rounded"/>}
                        {outputTab === 'html' && <pre className="w-full h-full bg-gray-900/50 rounded p-2 text-xs text-cyan-200 overflow-auto font-mono">{resultHtml}</pre>}
                        {outputTab === 'text' && <pre className="w-full h-full bg-gray-900/50 rounded p-2 text-xs text-gray-300 overflow-auto whitespace-pre-wrap">{resultText}</pre>}
                         {(outputTab === 'html' || outputTab === 'text') && (
                            <button onClick={() => handleCopy(outputTab)} className="absolute top-2 right-2 p-1.5 bg-gray-800 rounded-full text-gray-300 hover:text-white">
                                 {copyStatus === outputTab ? <CheckCircleIcon className="w-5 h-5 text-green-400"/> : <ClipboardIcon className="w-5 h-5"/>}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PageBuilder;
