

import React, { useState, useRef, useEffect } from 'react';
import { AppSettings } from '../../types';
import { formatTextContent } from '../../services/geminiService';
import { exportToPdf, exportToImage, exportToHtml, exportToDocx, exportToXlsx } from '../../services/exportService';
// FIX: Add missing icon imports
import { SparklesIcon, ClipboardIcon, CheckCircleIcon, CameraIcon, FilePdfIcon, FileWordIcon, FileExcelIcon, FileCodeIcon } from './icons';

const TextFormatter: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [sourceType, setSourceType] = useState<'text' | 'url'>('text');
    const [inputText, setInputText] = useState('');
    const [inputUrl, setInputUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formattedHtml, setFormattedHtml] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const outputRef = useRef<HTMLDivElement>(null);
    const editableContentRef = useRef<HTMLDivElement>(null);

    // Use a key to force re-render of contentEditable div when new content arrives
    const [outputKey, setOutputKey] = useState(0);

    useEffect(() => {
        setOutputKey(k => k + 1);
    }, [formattedHtml]);

    const handleFormat = async () => {
        const hasText = sourceType === 'text' && inputText.trim();
        const hasUrl = sourceType === 'url' && inputUrl.trim();
        if (!hasText && !hasUrl) {
            setError('لطفا متنی را وارد کنید یا یک آدرس سایت معتبر قرار دهید.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setFormattedHtml('');

        try {
            // FIX: Pass settings object to the service function call.
            const resultHtml = await formatTextContent(
                sourceType === 'text' ? inputText : null,
                sourceType === 'url' ? inputUrl : null,
                settings.aiInstructions['article-generation'], // Re-using a relevant instruction
                settings
            );
            setFormattedHtml(resultHtml);
        } catch (err) {
            console.error(err);
            setError('خطا در پردازش متن. لطفا دوباره تلاش کنید.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExport = async (format: 'pdf' | 'image' | 'html' | 'docx' | 'xlsx') => {
        if (!editableContentRef.current) return;
        
        const currentHtml = editableContentRef.current.innerHTML;
        const fileName = `formatted-text-${Date.now()}`;
        
        try {
            if (format === 'image') await exportToImage(outputRef.current!, fileName);
            if (format === 'pdf') await exportToPdf(outputRef.current!, fileName);
            // FIX: The exportToHtml function expects an HTMLElement, not an HTML string. Pass the ref's current element.
            if (format === 'html') exportToHtml(editableContentRef.current, fileName);
            if (format === 'docx') exportToDocx(currentHtml, fileName);
            // FIX: The exportToXlsx function expects an array of objects. Wrap the HTML content to satisfy the type.
            if (format === 'xlsx') exportToXlsx([{ content: editableContentRef.current.innerText }], fileName);
        } catch (err) {
            console.error(`Export to ${format} failed`, err);
            alert(`خطا در خروجی گرفتن به فرمت ${format}.`);
        }
    };
    
    const handleCopy = () => {
        if (!editableContentRef.current) return;
        navigator.clipboard.writeText(editableContentRef.current.innerHTML);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-xl shadow-cyan-500/10 space-y-6">
                <h2 className="text-xl font-bold text-cyan-300">ورودی متن</h2>
                <div className="flex border-b border-gray-700">
                    <button onClick={() => setSourceType('text')} className={`px-4 py-2 text-sm ${sourceType === 'text' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400'}`}>ورود متن</button>
                    <button onClick={() => setSourceType('url')} className={`px-4 py-2 text-sm ${sourceType === 'url' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400'}`}>ورود از سایت</button>
                </div>
                {sourceType === 'text' ? (
                    <textarea value={inputText} onChange={e => setInputText(e.target.value)} rows={10} placeholder="متن خام خود را اینجا وارد کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                ) : (
                    <input type="url" value={inputUrl} onChange={e => setInputUrl(e.target.value)} placeholder="https://example.com/article" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                )}
                <button onClick={handleFormat} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                    <SparklesIcon className="w-5 h-5"/> {isLoading ? 'در حال پردازش...' : 'مرتب‌سازی و زیباسازی متن'}
                </button>
                 {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            {/* Output Panel */}
            <div ref={outputRef} className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-xl shadow-cyan-500/10 flex flex-col min-h-[60vh]">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                     <h2 className="text-xl font-bold text-cyan-300">خروجی نهایی (قابل ویرایش)</h2>
                     <div className="flex items-center gap-2">
                        <button onClick={handleCopy} title="کپی کردن HTML" className="p-2 bg-gray-700/50 rounded-md hover:bg-gray-600/50" disabled={!formattedHtml}>
                            {isCopied ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                        </button>
                         <button onClick={() => handleExport('image')} title="عکس گرفتن" className="p-2 bg-gray-700/50 rounded-md hover:bg-gray-600/50" disabled={!formattedHtml}>
                            <CameraIcon className="w-5 h-5" />
                        </button>
                     </div>
                </div>
                 <div className="flex flex-wrap gap-2 mb-4">
                    <button onClick={() => handleExport('pdf')} className="flex items-center gap-1.5 text-xs bg-red-800 hover:bg-red-700 px-3 py-1.5 rounded" disabled={!formattedHtml}><FilePdfIcon className="w-4 h-4"/> PDF</button>
                    <button onClick={() => handleExport('docx')} className="flex items-center gap-1.5 text-xs bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded" disabled={!formattedHtml}><FileWordIcon className="w-4 h-4"/> Word</button>
                    <button onClick={() => handleExport('xlsx')} className="flex items-center gap-1.5 text-xs bg-green-800 hover:bg-green-700 px-3 py-1.5 rounded" disabled={!formattedHtml}><FileExcelIcon className="w-4 h-4"/> Excel</button>
                    <button onClick={() => handleExport('html')} className="flex items-center gap-1.5 text-xs bg-purple-800 hover:bg-purple-700 px-3 py-1.5 rounded" disabled={!formattedHtml}><FileCodeIcon className="w-4 h-4"/> HTML</button>
                </div>

                <div className="flex-grow bg-gray-900/50 rounded-lg p-4 overflow-y-auto prose prose-invert max-w-none prose-sm">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                             <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : formattedHtml ? (
                        <div
                            key={outputKey}
                            ref={editableContentRef}
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            className="focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded p-2"
                            dangerouslySetInnerHTML={{ __html: formattedHtml }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">خروجی فرمت‌بندی شده در اینجا نمایش داده می‌شود.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TextFormatter;