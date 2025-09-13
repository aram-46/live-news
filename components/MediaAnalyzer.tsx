
import React, { useState, useRef } from 'react';
import { AppSettings, MediaFile, MediaAnalysisResult } from '../types';
import { analyzeMedia } from '../services/geminiService';
// FIX: Add missing icon imports
import { SparklesIcon, UploadIcon, LinkIcon, CloseIcon } from './icons';
import VideoAnalysisResultDisplay from './VideoAnalysisResultDisplay';

const MediaAnalyzer: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<MediaFile | null>(null);
    const [userPrompt, setUserPrompt] = useState('خلاصه‌ای از محتوا ارائه بده و ادعاهای اصلی آن را به صورت کامل تحلیل کن.');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<MediaAnalysisResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = (e.target?.result as string).split(',')[1];
            setFile({ name: selectedFile.name, type: selectedFile.type, data: base64Data, url: URL.createObjectURL(selectedFile) });
        };
        reader.readAsDataURL(selectedFile);
    };

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim() && !file) {
            setError('لطفاً یک لینک معتبر وارد کنید یا یک فایل آپلود نمایید.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const fileData = file ? { data: file.data, mimeType: file.type } : null;
            // FIX: Pass settings as the fifth argument.
            const apiResult = await analyzeMedia(url, fileData, userPrompt, settings.aiInstructions['analyzer-media'], settings);
            setResult(apiResult);
        } catch (err) {
            console.error(err);
            setError("خطا در تحلیل رسانه. لطفاً از عمومی بودن لینک اطمینان حاصل کرده یا فایل دیگری را امتحان کنید.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const resetInputs = () => {
        setFile(null);
        setUrl('');
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <form onSubmit={handleAnalyze} className="space-y-4">
                    <h3 className="text-lg font-semibold text-cyan-200">ورودی تحلیلگر رسانه</h3>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">لینک ویدئو</label>
                        <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    </div>
                     <div className="flex items-center gap-2"><div className="flex-grow border-t border-gray-600/50"></div><span className="text-xs text-gray-500">یا</span><div className="flex-grow border-t border-gray-600/50"></div></div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/*,image/*" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-400 hover:text-cyan-300 transition-colors">
                        <UploadIcon className="w-5 h-5"/> آپلود ویدئو یا تصویر
                    </button>
                    {file && (
                        <div className="p-2 bg-gray-900/50 rounded-lg flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-400 truncate">فایل: {file.name}</p>
                            <button type="button" onClick={resetInputs}><CloseIcon className="w-4 h-4 text-gray-500 hover:text-white"/></button>
                        </div>
                    )}
                     <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">درخواست از هوش مصنوعی (اختیاری)</label>
                        <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)} rows={4} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition">
                        {isLoading ? <svg className="animate-spin h-5 w-5"/> : <SparklesIcon className="w-5 h-5"/>}
                        {isLoading ? 'در حال تحلیل...' : 'شروع تحلیل'}
                    </button>
                </form>
            </div>
             <div className="lg:col-span-2">
                {isLoading && <div className="p-6 bg-black/20 rounded-2xl border border-cyan-400/10 animate-pulse h-96"></div>}
                {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                {!isLoading && !error && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج تحلیل رسانه در اینجا نمایش داده خواهد شد.</p></div>}
                {result && <VideoAnalysisResultDisplay result={result} />}
            </div>
        </div>
    );
};

export default MediaAnalyzer;
