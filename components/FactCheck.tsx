import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { FactCheckResult, Credibility, AppSettings, MediaFile, ChatMessage, generateUUID } from '../types';
import { CheckCircleIcon, UploadIcon, PaperClipIcon, MicrophoneIcon, StopIcon, CloseIcon, NewsIcon, VideoIcon, AudioIcon, ImageIcon, FilePdfIcon, LinkIcon, ScaleIcon } from './icons';
import { factCheckNews } from '../services/geminiService';
import DeepAnalysis from './DeepAnalysis';
import ExportButton from './ExportButton';

interface FactCheckProps {
  settings: AppSettings;
}

type InputType = 'text' | 'url';

const QuickCheck: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [text, setText] = useState('');
    const [url, setUrl] = useState('');
    const [inputType, setInputType] = useState<InputType>('text');
    const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [initialResult, setInitialResult] = useState<FactCheckResult | null>(null);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isChatActive, setIsChatActive] = useState(false);
    const [userInput, setUserInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dialogueEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const resetForNewCheck = () => {
        setInitialResult(null);
        setChatSession(null);
        setChatHistory([]);
        setIsChatActive(false);
        setUserInput('');
        setError(null);
    };

    const handleStartRecording = async () => {
        resetInputs();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            const audioChunks: Blob[] = [];
            recorder.ondataavailable = event => audioChunks.push(event.data);
            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudioUrl(audioUrl);
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64Data = (e.target?.result as string).split(',')[1];
                    setMediaFile({ name: 'recording.webm', type: 'audio/webm', data: base64Data, url: audioUrl });
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting recording:", err);
            setError("دسترسی به میکروفون امکان‌پذیر نیست. لطفاً دسترسی لازم را به مرورگر بدهید.");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = (e.target?.result as string).split(',')[1];
            setMediaFile({ name: file.name, type: file.type, data: base64Data, url: URL.createObjectURL(file) });
        };
        reader.readAsDataURL(file);
    };

    const handleInitialFactCheck = useCallback(async () => {
        setIsLoading(true);
        resetForNewCheck();
        try {
            const fileData = mediaFile ? { data: mediaFile.data, mimeType: mediaFile.type } : null;
            const checkUrl = inputType === 'url' ? url : undefined;
            const apiResult = await factCheckNews(text, fileData, checkUrl, settings.aiInstructions['fact-check']);
            setInitialResult(apiResult);
            const summaryMessage: ChatMessage = { id: generateUUID(), role: 'model', text: `**نتیجه کلی: ${apiResult.overallCredibility}**\n\n${apiResult.summary}`, timestamp: Date.now() };
            setChatHistory([summaryMessage]);
            setIsChatActive(true);
        } catch (err) {
            console.error('Error during fact-check:', err);
            setError('خطا در بررسی اولیه محتوا. لطفاً دوباره تلاش کنید.');
        } finally {
            setIsLoading(false);
        }
    }, [text, mediaFile, url, inputType, settings.aiInstructions]);

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;
        setIsLoading(true);
        const apiKey = process.env.API_KEY;
        if (!apiKey || !initialResult) { setError("خطا: امکان شروع گفتگو وجود ندارد."); return; }
        const ai = new GoogleGenAI({ apiKey });
        const chat = chatSession || ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction: settings.aiInstructions['fact-check'] } });
        setChatSession(chat);
        const userMessage: ChatMessage = { id: generateUUID(), role: 'user', text: messageText, timestamp: Date.now() };
        setChatHistory(prev => [...prev, userMessage]);
        setUserInput('');
        try {
            const resultStream = await chat.sendMessageStream({ message: messageText });
            let modelResponse = '';
            const thinkingMessage: ChatMessage = { id: generateUUID(), role: 'model', text: '...', timestamp: Date.now() };
            setChatHistory(prev => [...prev, thinkingMessage]);
            for await (const chunk of resultStream) {
                modelResponse += chunk.text;
                setChatHistory(prev => {
                    const newMessages = [...prev];
                    if (newMessages.length > 0) newMessages[newMessages.length - 1].text = modelResponse.trim();
                    return newMessages;
                });
            }
        } catch (err) {
            console.error(err);
            const errorMessage: ChatMessage = { id: generateUUID(), role: 'model', text: 'متاسفانه خطایی در پاسخگویی رخ داد.', timestamp: Date.now() };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const resetInputs = () => {
        setMediaFile(null);
        setUrl('');
        setText('');
        setRecordedAudioUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        resetForNewCheck();
    };

    const renderChatMessage = (msg: ChatMessage) => {
        const isUser = msg.role === 'user';
        const formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-gray-800/80 px-1 py-0.5 rounded text-xs text-amber-300">$1</code>').replace(/\n/g, '<br />');
        return <div key={msg.id} className={`max-w-xl w-fit p-3 rounded-xl ${isUser ? 'bg-cyan-600/50 self-end rounded-br-none' : 'bg-gray-700/50 self-start rounded-bl-none'}`}><div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedText }} /></div>;
    };

    const isSubmitDisabled = () => isLoading || (!text.trim() && !url.trim() && !mediaFile);

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-400">محتوای مورد نظر را برای بررسی سریع وارد کنید. می‌توانید متن، لینک، عکس یا صدا را تحلیل کرده و سوالات تکمیلی بپرسید.</p>
            <textarea value={text} onChange={(e) => { setText(e.target.value); setInputType('text'); }} placeholder="متن خبر یا ادعا را اینجا وارد کنید..." rows={4} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
            <div className="flex items-center gap-2"><div className="flex-grow border-t border-gray-600/50"></div><span className="text-xs text-gray-500">یا</span><div className="flex-grow border-t border-gray-600/50"></div></div>
            <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setInputType('url'); }} placeholder="لینک (URL) مورد نظر را اینجا وارد کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
            
            <div className="flex flex-col sm:flex-row gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*,audio/*,.pdf" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-400 hover:text-cyan-300 transition-colors"><PaperClipIcon className="w-5 h-5"/> ضمیمه فایل (شامل PDF)</button>
                {isRecording ? 
                    <button onClick={handleStopRecording} className="flex-1 flex items-center justify-center gap-2 p-3 bg-red-500/20 border-2 border-red-500/50 rounded-lg text-red-300 animate-pulse"><StopIcon className="w-5 h-5"/> توقف ضبط</button> :
                    <button onClick={handleStartRecording} className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-400 hover:text-cyan-300 transition-colors"><MicrophoneIcon className="w-5 h-5"/> ضبط صدا</button>
                }
            </div>

            {(mediaFile || recordedAudioUrl) && (
                <div className="p-2 bg-gray-900/50 rounded-lg flex items-center justify-between gap-2">
                    {recordedAudioUrl ? <audio src={recordedAudioUrl} controls className="h-8 flex-grow" /> : <p className="text-xs text-gray-400 truncate">فایل: {mediaFile?.name}</p>}
                    <button onClick={resetInputs}><CloseIcon className="w-4 h-4 text-gray-500 hover:text-white"/></button>
                </div>
            )}

            <button onClick={handleInitialFactCheck} disabled={isSubmitDisabled()} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition">{isLoading && !isChatActive ? 'در حال بررسی اولیه...' : 'بررسی اعتبار'}</button>
            {error && <p className="mt-4 text-sm text-red-400 bg-red-900/30 p-3 rounded-lg">{error}</p>}
            
            {initialResult && (
                 <div ref={resultRef} className="mt-6 p-4 bg-gray-900/30 rounded-lg border border-cyan-400/20 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                         <h3 className="text-lg font-bold text-cyan-200">نتیجه بررسی سریع</h3>
                         <ExportButton elementRef={resultRef} data={initialResult} title="fact-check-result" type="fact-check" disabled={false} />
                    </div>
                     <div className="space-y-2">
                        <p><strong>نتیجه کلی:</strong> <span className={initialResult.overallCredibility === Credibility.High ? 'text-green-400' : initialResult.overallCredibility === Credibility.Medium ? 'text-yellow-400' : 'text-red-400'}>{initialResult.overallCredibility}</span></p>
                        <p className="text-sm text-gray-300 leading-relaxed">{initialResult.summary}</p>
                    </div>
                    {initialResult.sources && initialResult.sources.length > 0 && (
                        <div className="pt-3 border-t border-gray-700/50 space-y-3">
                            <h4 className="font-semibold text-cyan-200">منابع معتبر بررسی شده:</h4>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {initialResult.sources.map((source, index) => (
                                    <div key={index} className="p-3 bg-gray-800/50 rounded-lg text-xs">
                                        <p className="font-bold text-gray-200">{source.name}</p>
                                        <a href={source.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{source.link}</a>
                                        <p className="text-gray-400 mt-1"><strong>تاریخ انتشار:</strong> {source.publicationDate || 'نامشخص'}</p>
                                        <p className="text-gray-400"><strong>سطح اعتبار:</strong> {source.credibility}</p>
                                        <p className="text-gray-300 mt-2 border-l-2 border-cyan-500/50 pl-2">{source.summary}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     {initialResult.groundingSources && initialResult.groundingSources.length > 0 && (
                        <div className="pt-3 border-t border-gray-700/50">
                            <h4 className="font-semibold text-cyan-200 text-sm">منابع جستجوی آنلاین (AI):</h4>
                            <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                            {initialResult.groundingSources.map((source, i) => (
                                <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate" title={source.uri}>{source.title || "منبع بدون عنوان"}</a></li>
                            ))}
                            </ul>
                        </div>
                    )}
                 </div>
            )}

            <div className="mt-6 space-y-4">
                <div className="flex flex-col space-y-4 max-h-[50vh] overflow-y-auto pr-2">{chatHistory.map(renderChatMessage)}<div ref={dialogueEndRef} /></div>
                {isChatActive && (
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="flex gap-2 pt-4 border-t border-gray-700/50 animate-fade-in">
                        <input value={userInput} onChange={e => setUserInput(e.target.value)} disabled={isLoading} placeholder="سوال دیگری بپرسید..." className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white"/>
                        <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-black font-bold p-2 px-4 rounded-lg">ارسال</button>
                    </form>
                )}
            </div>
        </div>
    );
}

const SpecializedFactCheck: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    type SubTab = 'political' | 'news' | 'video' | 'audio' | 'image' | 'pdf' | 'url';
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('political');

    const [text, setText] = useState('');
    const [url, setUrl] = useState('');
    const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<FactCheckResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    const subTabs: { id: SubTab; label: string; icon: React.ReactNode; inputType: 'text' | 'file' | 'url'; fileAccept?: string }[] = [
        { id: 'political', label: 'سیاسی', icon: <ScaleIcon className="w-5 h-5" />, inputType: 'text' },
        { id: 'news', label: 'اخبار', icon: <NewsIcon className="w-5 h-5" />, inputType: 'text' },
        { id: 'video', label: 'ویدئو', icon: <VideoIcon className="w-5 h-5" />, inputType: 'file', fileAccept: 'video/*' },
        { id: 'audio', label: 'صدا', icon: <AudioIcon className="w-5 h-5" />, inputType: 'file', fileAccept: 'audio/*' },
        { id: 'image', label: 'عکس', icon: <ImageIcon className="w-5 h-5" />, inputType: 'file', fileAccept: 'image/*' },
        { id: 'pdf', label: 'PDF', icon: <FilePdfIcon className="w-5 h-5" />, inputType: 'file', fileAccept: '.pdf' },
        { id: 'url', label: 'لینک سایت', icon: <LinkIcon className="w-5 h-5" />, inputType: 'url' },
    ];
    
    const activeSubTabInfo = subTabs.find(t => t.id === activeSubTab)!;

    const resetInputs = useCallback(() => {
        setText('');
        setUrl('');
        setMediaFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setResult(null);
        setError(null);
    }, []);

    const handleTabChange = (tabId: SubTab) => {
        setActiveSubTab(tabId);
        resetInputs();
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = (e.target?.result as string).split(',')[1];
            setMediaFile({ name: file.name, type: file.type, data: base64Data, url: URL.createObjectURL(file) });
        };
        reader.readAsDataURL(file);
    };

    const handleFactCheck = async () => {
        const hasText = text.trim() !== '';
        const hasUrl = url.trim() !== '';
        const hasFile = mediaFile !== null;
        if (!hasText && !hasUrl && !hasFile) {
            setError('لطفاً محتوایی برای بررسی وارد کنید.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const fileData = mediaFile ? { data: mediaFile.data, mimeType: mediaFile.type } : null;
            const promptPrefix = `Fact-check the following ${activeSubTabInfo.label} content:`;
            const mainContent = activeSubTabInfo.inputType === 'text' ? text : activeSubTabInfo.inputType === 'url' ? '' : 'Attached file';
            const fullPrompt = `${promptPrefix}\n${mainContent}`;

            const apiResult = await factCheckNews(fullPrompt, fileData, url || undefined, settings.aiInstructions['fact-check']);
            setResult(apiResult);
        } catch (err) {
            console.error(err);
            setError('خطا در انجام راستی‌آزمایی. لطفاً دوباره تلاش کنید.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderInput = () => {
        switch (activeSubTabInfo.inputType) {
            case 'text':
                return <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`متن ${activeSubTabInfo.label} را برای بررسی وارد کنید...`} rows={8} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>;
            case 'url':
                return <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="آدرس لینک سایت را برای بررسی وارد کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />;
            case 'file':
                return (
                    <div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={activeSubTabInfo.fileAccept} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-400 hover:text-cyan-300 transition-colors">
                            <UploadIcon className="w-5 h-5"/> آپلود {activeSubTabInfo.label}
                        </button>
                         {mediaFile && (
                            <div className="mt-2 p-2 bg-gray-900/50 rounded-lg flex items-center justify-between gap-2">
                                <p className="text-xs text-gray-400 truncate">فایل: {mediaFile.name}</p>
                                <button onClick={resetInputs}><CloseIcon className="w-4 h-4 text-gray-500 hover:text-white"/></button>
                            </div>
                        )}
                    </div>
                );
        }
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
                 <div className="flex flex-wrap gap-1 p-1 bg-gray-900/30 rounded-lg">
                    {subTabs.map(tab => (
                        <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 text-xs rounded-md transition-colors ${activeSubTab === tab.id ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                           {tab.icon} <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
                <div className="p-4 bg-black/20 rounded-lg space-y-4">
                    {renderInput()}
                    <button onClick={handleFactCheck} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3 rounded-lg transition">
                        {isLoading ? <svg className="animate-spin h-5 w-5"/> : <CheckCircleIcon className="w-5 h-5"/>}
                        {isLoading ? 'در حال بررسی...' : 'بررسی اعتبار'}
                    </button>
                </div>
            </div>
            <div className="lg:col-span-2">
                 {isLoading && <div className="p-6 bg-black/20 rounded-2xl border border-cyan-400/10 animate-pulse h-64"></div>}
                 {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                 {!isLoading && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتیجه راستی‌آزمایی در اینجا نمایش داده خواهد شد.</p></div>}
                 {result && (
                     <div ref={resultRef} className="p-4 bg-gray-900/30 rounded-lg border border-cyan-400/20 space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center">
                             <h3 className="text-lg font-bold text-cyan-200">نتیجه بررسی</h3>
                             <ExportButton elementRef={resultRef} data={result} title={`fact-check-${activeSubTab}`} type="fact-check" disabled={false} />
                        </div>
                         <div className="space-y-2">
                            <p><strong>نتیجه کلی:</strong> <span className={result.overallCredibility === Credibility.High ? 'text-green-400' : result.overallCredibility === Credibility.Medium ? 'text-yellow-400' : 'text-red-400'}>{result.overallCredibility}</span></p>
                            <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
                        </div>
                        {result.sources && result.sources.length > 0 && (
                            <div className="pt-3 border-t border-gray-700/50 space-y-3">
                                <h4 className="font-semibold text-cyan-200">منابع معتبر بررسی شده:</h4>
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {result.sources.map((source, index) => (
                                        <div key={index} className="p-3 bg-gray-800/50 rounded-lg text-xs">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-gray-200">نام منبع: {source.name}</p>
                                                    <a href={source.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">لینک منبع: {source.link}</a>
                                                </div>
                                                <div className="text-right text-gray-400 whitespace-nowrap pl-2">
                                                    <p><strong>تاریخ:</strong> {source.publicationDate || 'نامشخص'}</p>
                                                    <p><strong>اعتبار:</strong> {source.credibility}</p>
                                                </div>
                                            </div>
                                            <p className="text-gray-300 mt-2 border-l-2 border-cyan-500/50 pl-2">{source.summary}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {result.groundingSources && result.groundingSources.length > 0 && (
                            <div className="pt-3 border-t border-gray-700/50">
                                <h4 className="font-semibold text-cyan-200 text-sm">منابع جستجوی آنلاین (AI):</h4>
                                <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                                {result.groundingSources.map((source, i) => (
                                    <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate" title={source.uri}>{source.title || "منبع بدون عنوان"}</a></li>
                                ))}
                                </ul>
                            </div>
                        )}
                     </div>
                 )}
            </div>
        </div>
    );
};


const FactCheck: React.FC<FactCheckProps> = ({ settings }) => {
    const [activeMainTab, setActiveMainTab] = useState<'quick' | 'deep' | 'specialized'>('quick');

    const renderTabButton = (tabId: 'quick' | 'deep' | 'specialized', label: string) => (
        <button
            onClick={() => setActiveMainTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
            activeMainTab === tabId
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                     <CheckCircleIcon className="w-6 h-6 text-cyan-300" />
                     <h2 className="text-xl font-bold text-cyan-300">فکت چک و ردیابی شایعات</h2>
                </div>
                <div className="flex border-b border-cyan-400/20">
                    {renderTabButton('quick', 'بررسی سریع')}
                    {renderTabButton('specialized', 'بررسی تخصصی')}
                    {renderTabButton('deep', 'تحلیل عمیق')}
                </div>
            </div>
            
            {activeMainTab === 'quick' && <QuickCheck settings={settings} />}
            {activeMainTab === 'specialized' && <SpecializedFactCheck settings={settings} />}
            {activeMainTab === 'deep' && <DeepAnalysis settings={settings} />}
        </div>
    );
};

export default FactCheck;
