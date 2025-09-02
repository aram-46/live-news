
import React, { useState, useRef, useCallback } from 'react';
import { AppSettings, MediaFile, AnalyzerTabId, analyzerTabLabels, ClarificationResponse, AnalysisResult, FallacyResult, AIInstructionType } from '../types';
import { BrainIcon, UploadIcon, LinkIcon, VideoIcon, AudioIcon, MicrophoneIcon, CloseIcon, SearchIcon, PaperClipIcon } from './icons';
import { askForClarification, performAnalysis, findFallacies } from '../services/geminiService';
import AnalysisResultDisplay from './AnalysisResult';
import EditableList from './settings/EditableList';

interface AnalyzerProps {
    settings: AppSettings;
    onOpenUrl: (url: string) => void;
}

const FALLACY_LIST = [
    'حمله شخصی (Ad Hominem)', 'پهلوان‌پنبه (Straw Man)', 'شیب لغزنده (Slippery Slope)',
    'توسل به مرجعیت (Appeal to Authority)', 'توسل به جهل (Argument from Ignorance)',
    'دوراهی کاذب (False Dilemma)', 'نتیجه‌گیری شتاب‌زده (Hasty Generalization)',
    'علت شمردن هم‌رویدادی (Post Hoc Ergo Propter Hoc)', 'مسموم کردن سرچشمه (Poisoning the Well)'
];

const Analyzer: React.FC<AnalyzerProps> = ({ settings, onOpenUrl }) => {
    const [activeTab, setActiveTab] = useState<AnalyzerTabId>('political');
    
    // Inputs
    const [topic, setTopic] = useState('');
    const [comparisonTopic, setComparisonTopic] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [webUrls, setWebUrls] = useState<string[]>([]);
    const [currentUrl, setCurrentUrl] = useState('');

    // State for analysis process
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | FallacyResult | null>(null);
    const [clarification, setClarification] = useState<ClarificationResponse | null>(null);
    const [clarificationAnswer, setClarificationAnswer] = useState('');
    
    // Refs and recording state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    const resetState = () => {
        setIsLoading(false);
        setLoadingMessage('');
        setError(null);
        setResult(null);
        setClarification(null);
        setClarificationAnswer('');
    };
    
    const handleTabChange = (tabId: AnalyzerTabId) => {
        setActiveTab(tabId);
        resetState();
        // Optionally reset inputs as well
        setTopic('');
        setComparisonTopic('');
        setMediaFiles([]);
        setWebUrls([]);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = (e.target?.result as string).split(',')[1];
                setMediaFiles(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    data: base64Data,
                    url: URL.createObjectURL(file)
                }]);
            };
            reader.readAsDataURL(file);
        });
    };
    
    const handleAddUrl = () => {
        if (currentUrl.trim() && !webUrls.includes(currentUrl.trim())) {
            try {
                new URL(currentUrl); // Validate URL
                setWebUrls(prev => [...prev, currentUrl.trim()]);
                setCurrentUrl('');
            } catch (_) {
                alert('لطفا یک آدرس اینترنتی معتبر وارد کنید.');
            }
        }
    };
    
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const audioChunks: Blob[] = [];

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64Data = (e.target?.result as string).split(',')[1];
                    setMediaFiles(prev => [...prev, {
                        name: `recording-${Date.now()}.webm`,
                        type: audioBlob.type,
                        data: base64Data,
                        url: URL.createObjectURL(audioBlob)
                    }]);
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop()); // Stop microphone
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("خطا در دسترسی به میکروفن. لطفا دسترسی لازم را به مرورگر بدهید.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleAnalyze = async (finalPrompt: string) => {
        setLoadingMessage('در حال انجام تحلیل جامع...');
        
        const filesForApi = mediaFiles.map(mf => ({
            inlineData: { data: mf.data, mimeType: mf.type }
        }));

        const instructionKey = `analyzer-${activeTab}` as AIInstructionType;

        try {
            if (activeTab === 'fallacy-finder') {
                // FIX: Pass the correct instruction string from settings instead of the whole object.
                const fallacyResult = await findFallacies(finalPrompt, settings.aiInstructions['analyzer-fallacy-finder'], FALLACY_LIST);
                setResult(fallacyResult);
            } else {
                // FIX: Pass the correct instruction string from settings instead of multiple arguments.
                const analysisResult = await performAnalysis(finalPrompt, filesForApi, settings.aiInstructions[instructionKey]);
                setResult(analysisResult);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        resetState();
        if (!topic.trim()) {
            setError("لطفاً موضوع اصلی را برای تحلیل وارد کنید.");
            return;
        }

        setIsLoading(true);
        setLoadingMessage('در حال بررسی و شفاف‌سازی درخواست...');

        let prompt = `موضوع اصلی: ${topic}`;
        if (comparisonTopic.trim()) prompt += `\nمقایسه با: ${comparisonTopic}`;
        if (webUrls.length > 0) prompt += `\nلینک‌های مرتبط: ${webUrls.join(', ')}`;
        
        if (activeTab === 'fallacy-finder') {
             await handleAnalyze(prompt);
             return;
        }

        const filesForApi = mediaFiles.map(mf => ({
            inlineData: { data: mf.data, mimeType: mf.type }
        }));
        
        try {
            // FIX: Removed extra 'settings' argument from the function call.
            const clarificationRes = await askForClarification(prompt, filesForApi);
            if (clarificationRes.clarificationNeeded) {
                setClarification(clarificationRes);
                setLoadingMessage(''); // No longer loading, waiting for user
                setIsLoading(false);
            } else {
                await handleAnalyze(prompt);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.');
            setIsLoading(false);
        }
    };

    const handleClarificationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let fullPrompt = `موضوع اصلی: ${topic}`;
        if (comparisonTopic.trim()) fullPrompt += `\nمقایسه با: ${comparisonTopic}`;
        if (webUrls.length > 0) fullPrompt += `\nلینک‌های مرتبط: ${webUrls.join(', ')}`;
        fullPrompt += `\nپاسخ به سوال شفاف‌سازی: ${clarificationAnswer}`;
        
        setIsLoading(true);
        setClarification(null);
        handleAnalyze(fullPrompt);
    };


    const renderTabButton = (tabId: AnalyzerTabId, label: string) => (
        <button
            onClick={() => handleTabChange(tabId)}
            className={`px-3 py-2 text-sm font-medium transition-colors duration-300 border-b-2 whitespace-nowrap ${
            activeTab === tabId
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex border-b border-cyan-400/20 overflow-x-auto">
                {(Object.keys(analyzerTabLabels) as AnalyzerTabId[]).map(key => renderTabButton(key, analyzerTabLabels[key]))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Panel */}
                <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                    <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-3">
                        <BrainIcon className="w-6 h-6" />
                        ورودی تحلیل
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-2">موضوع اصلی</label>
                            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={4} placeholder="موضوع اصلی برای تحلیل را اینجا وارد کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                        </div>

                        {activeTab !== 'fallacy-finder' && (
                            <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-2">مقایسه با (اختیاری)</label>
                                <textarea value={comparisonTopic} onChange={e => setComparisonTopic(e.target.value)} rows={2} placeholder="موضوع دوم برای مقایسه..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-2">افزودن محتوا (اختیاری)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"><PaperClipIcon className="w-4 h-4" />آپلود فایل</button>
                                <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`flex items-center justify-center gap-2 p-2 rounded-lg text-sm ${isRecording ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}><MicrophoneIcon className="w-4 h-4" />{isRecording ? 'توقف ضبط' : 'ضبط صدا'}</button>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <input type="url" value={currentUrl} onChange={e => setCurrentUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())} placeholder="افزودن لینک سایت..." className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm"/>
                                <button type="button" onClick={handleAddUrl} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"><LinkIcon className="w-5 h-5"/></button>
                            </div>
                            <div className="mt-2 space-y-1 text-xs">
                                {mediaFiles.map((f, i) => <div key={i} className="flex justify-between items-center bg-gray-900/50 p-1.5 rounded"><span>{f.name}</span><button onClick={() => setMediaFiles(m => m.filter((_, idx) => idx !== i))}><CloseIcon className="w-3 h-3 text-red-400"/></button></div>)}
                                {webUrls.map((u, i) => <div key={i} className="flex justify-between items-center bg-gray-900/50 p-1.5 rounded"><span>{u}</span><button onClick={() => setWebUrls(w => w.filter((_, idx) => idx !== i))}><CloseIcon className="w-3 h-3 text-red-400"/></button></div>)}
                            </div>
                        </div>
                        
                        {activeTab === 'fallacy-finder' && (
                            <div>
                                 <label className="block text-sm font-medium text-cyan-300 mb-2">لیست مغالطه‌ها</label>
                                 <div className="max-h-32 overflow-y-auto bg-gray-900/50 rounded-lg p-2 text-xs space-y-1">
                                     {FALLACY_LIST.map(f => <p key={f}>{f}</p>)}
                                 </div>
                            </div>
                        )}

                        <button type="submit" disabled={isLoading || clarification !== null} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                            <SearchIcon className="w-5 h-5"/>
                            تحلیل کن
                        </button>
                    </form>
                </div>

                {/* Result Panel */}
                <div className="lg:col-span-2 space-y-4">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400">
                             <svg className="animate-spin h-8 w-8 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                             <p className="mt-4 text-sm">{loadingMessage}</p>
                        </div>
                    )}
                    {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                    
                    {clarification && (
                        <div className="p-6 bg-amber-900/30 border border-amber-500/30 rounded-lg space-y-4 animate-fade-in">
                            <h3 className="font-bold text-amber-300">نیاز به شفاف‌سازی</h3>
                            <p className="text-sm text-amber-200">{clarification.question}</p>
                            <form onSubmit={handleClarificationSubmit} className="space-y-2">
                                <textarea value={clarificationAnswer} onChange={e => setClarificationAnswer(e.target.value)} rows={3} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg">ارسال پاسخ</button>
                            </form>
                        </div>
                    )}

                    {result && <AnalysisResultDisplay result={result} onOpenUrl={onOpenUrl} />}
                </div>
            </div>
        </div>
    );
};

export default Analyzer;
