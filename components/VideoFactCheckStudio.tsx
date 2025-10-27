

import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, VideoFactCheckStudioResult } from '../types';
import { factCheckVideoStudio, createChat } from '../services/geminiService';
import { saveHistoryItem } from '../services/historyService';
import { CheckCircleIcon, LinkIcon, SearchIcon, ThumbsUpIcon, ThumbsDownIcon, CircleIcon, DownloadIcon } from './icons';
import PieChart from './charts/PieChart';
import ExportButton from './ExportButton';
import { Chat } from '@google/genai';

const MetricCard: React.FC<{ title: string; value: string | number; theme: string }> = ({ title, value, theme }) => (
    <div className={`p-3 rounded-lg ${theme}`}>
        <p className="text-xs text-white/80">{title}</p>
        <p className="text-xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString('fa-IR') : value}</p>
    </div>
);

const VideoFactCheckStudio: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [videoUrl, setVideoUrl] = useState('');
    const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<VideoFactCheckStudioResult | null>(null);

    const resultRef = useRef<HTMLDivElement>(null);
    
    // Chat state
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const dialogueEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const criteriaOptions = [
        "عنوان_ویدئو", "تعداد_ویوها_تا_تاریخ_درخواست", "زمان_لود_ویدئو", "نام_صاحب_کانال",
        "کل_کامنتها_تا_تاریخ_فکت_چک", "خلاصه_نظرات_موافق/مخالف/بی_طرف", "درصد_هر_کدام", "اعتبار_سنجی_کانال",
        "خلاصه_ویدئو", "برانگیختگی_ادعاها", "اعتبار_دعاهای_مطرح_شده", "استعلام_و_جستجوی_موارد_طرح_شده",
        "جستجوی_ویدئوهای_مشابه_با_ادعاهای_مشابه",
        // New
        "تاریخ_انتشار", "تعداد_دنبال_کنندگان", "تعداد_لایک_ویدئو", "نام_سایت_یا_کانال",
        "سال_تاسیس_و_راه_اندازی", "تعداد_بازدید_لحظه_فکت_چک", "درصد_بازدید_نسبت_به_کانال",
        "تعداد_ویدئوهای_کل_کانال", "ایندکس_دسته_بندی_و_عنوان_بندی", "ارزیابی_اعتبار", "تولید_لینک_دانلود"
    ];

    const handleCriteriaToggle = (criterion: string) => {
        setSelectedCriteria(prev => 
            prev.includes(criterion) ? prev.filter(c => c !== criterion) : [...prev, criterion]
        );
    };

    const handleFactCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoUrl.trim() || selectedCriteria.length === 0) {
            setError("لطفا لینک ویدئو و حداقل یک معیار را برای بررسی انتخاب کنید.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        setChatHistory([]);
        setChatSession(null);
        try {
            const apiResult = await factCheckVideoStudio(videoUrl, selectedCriteria, settings);
            setResult(apiResult);
            saveHistoryItem({
                type: 'video-fact-check-studio',
                query: videoUrl,
                resultSummary: `فکت چک ویدئو انجام شد. عنوان: ${apiResult.videoInfo.videoTitle}`,
                data: apiResult,
            });
             // --- NEW CHAT INITIALIZATION ---
            try {
                const videoContext = JSON.stringify(apiResult, null, 2);
                const systemInstruction = `You are a helpful assistant analyzing a video. The initial analysis is provided below. Answer the user's questions based on this analysis and by searching the web for more details about the video at ${videoUrl}. Always respond in Persian.
                
                INITIAL ANALYSIS:
                ${videoContext.substring(0, 6000)}
                `;
                
                const chat = createChat(settings, 'fact-check-video-studio', systemInstruction);
                setChatSession(chat);
            } catch (chatError) {
                console.error('Could not create chat session for video:', chatError);
                setError((chatError as Error).message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در انجام فکت چک ویدئو.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !chatSession || isChatLoading) return;

        const userMessage = { role: 'user' as const, text: chatInput };
        setChatHistory(prev => [...prev, userMessage]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            const resultStream = await chatSession.sendMessageStream({ message: chatInput });
            let modelResponse = '';
            const thinkingMessage = { role: 'model' as const, text: '...' };
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
            const errorMessage = { role: 'model' as const, text: 'متاسفانه خطایی در پاسخگویی رخ داد.' };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsChatLoading(false);
        }
    };


    const commentChartData = result?.videoInfo?.commentSummary ? {
        type: 'pie' as const,
        title: 'تحلیل نظرات',
        labels: ['موافق', 'مخالف', 'بی‌طرف', 'فهمی'],
        datasets: [{
            label: 'نظرات',
            data: [
                result.videoInfo.commentSummary.proPercentage || 0,
                result.videoInfo.commentSummary.conPercentage || 0,
                result.videoInfo.commentSummary.neutralPercentage || 0,
                result.videoInfo.commentSummary.understandingPercentage || 0,
            ]
        }]
    } : null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Panel */}
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <form onSubmit={handleFactCheck} className="space-y-4">
                    <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="لینک ویدئو را وارد کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-cyan-300">معیارهای فکت چک</label>
                            <button type="button" onClick={() => setSelectedCriteria(criteriaOptions)} className="text-xs text-blue-400 hover:underline">انتخاب همه</button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 bg-gray-900/40 p-2 rounded-lg">
                            {criteriaOptions.map(c => (
                                <label key={c} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-700/50 cursor-pointer">
                                    <input type="checkbox" checked={selectedCriteria.includes(c)} onChange={() => handleCriteriaToggle(c)} className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-cyan-500 focus:ring-cyan-600"/>
                                    <span className="text-sm text-gray-300">{c.replace(/_/g, ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                        {isLoading ? <svg className="animate-spin h-5 w-5"/> : <SearchIcon className="w-5 h-5"/>}
                        <span>{isLoading ? 'در حال بررسی...' : 'شروع فکت چک'}</span>
                    </button>
                </form>
            </div>

            {/* Result Panel */}
            <div className="lg:col-span-2">
                 {isLoading && <div className="p-6 bg-black/20 rounded-2xl border border-cyan-400/10 animate-pulse h-96"></div>}
                 {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                 {!isLoading && !error && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج فکت چک ویدئو در اینجا نمایش داده خواهد شد.</p></div>}
                 {result && (
                    <div ref={resultRef} className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6 animate-fade-in">
                        <div className="flex justify-between items-start">
                             <h2 className="text-2xl font-bold text-cyan-300 mb-2">{result.videoInfo.videoTitle}</h2>
                             <ExportButton elementRef={resultRef} data={result} title="video_fact_check" type="structured" disabled={false} />
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard title="تعداد بازدید" value={result.videoInfo.viewCount || 0} theme="bg-blue-900/50" />
                            <MetricCard title="تعداد نظرات" value={result.videoInfo.commentCount || 0} theme="bg-purple-900/50" />
                            <MetricCard title="مدت زمان" value={result.videoInfo.videoDuration || '-'} theme="bg-indigo-900/50" />
                            <MetricCard title="اعتبار کانال" value={result.videoInfo.channelCredibility || '-'} theme="bg-teal-900/50" />
                            <MetricCard title="تاریخ انتشار" value={result.videoInfo.publicationDate || '-'} theme="bg-sky-900/50" />
                            <MetricCard title="دنبال‌کنندگان" value={result.videoInfo.subscriberCount || 0} theme="bg-lime-900/50" />
                            <MetricCard title="لایک‌ها" value={result.videoInfo.likeCount || 0} theme="bg-rose-900/50" />
                            <MetricCard title="سال تاسیس" value={result.videoInfo.foundationYear || '-'} theme="bg-fuchsia-900/50" />
                        </div>

                        {commentChartData && (result.videoInfo.commentCount ?? 0) > 0 && 
                            <div className="perspective-container">
                                <div className="h-64 chart-container-shiny">
                                    <PieChart data={commentChartData} />
                                </div>
                            </div>
                        }
                        
                         {result.category_tree?.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-cyan-200 mb-2">ایندکس محتوا</h3>
                                <div className="space-y-2 text-sm">
                                    {result.category_tree.map((item, i) => (
                                        <div key={i} className="p-2 rounded-md bg-gray-800/40">
                                            <p><span className="font-bold text-cyan-300">{item.title}</span> - <span className="text-xs text-gray-400">{item.duration_seconds} ثانیه</span></p>
                                            <p className="text-xs text-gray-300 mt-1">{item.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.videoInfo.videoSummary && (
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <h4 className="font-semibold text-cyan-200 mb-1">خلاصه ویدئو</h4>
                                <p className="text-sm text-gray-300">{result.videoInfo.videoSummary}</p>
                            </div>
                        )}

                        {result.claims?.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-cyan-200 mb-2">ادعاهای مطرح شده</h3>
                                <div className="space-y-2 text-sm">
                                    {result.claims.map((item, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-gray-800/40">
                                            <strong className="text-gray-200">{item.title}</strong>
                                            <p className="text-gray-300 text-xs mt-1">{item.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {result.verification_results && result.verification_results.length > 0 && (
                             <div>
                                <h3 className="font-semibold text-cyan-200 mb-2">نتایج راستی‌آزمایی</h3>
                                <div className="space-y-2 text-xs">
                                    {result.verification_results.map((item, i) => (
                                        <div key={i} className="p-2 bg-gray-800/50 rounded-lg flex items-center justify-between gap-2">
                                            <span className="flex-1"><strong>مورد:</strong> {item.item}</span>
                                            <span className="flex-1"><strong>نتیجه:</strong> <span style={{color: item.color}}>{item.result}</span></span>
                                            <span className="flex-1"><strong>اطمینان:</strong> {(item.confidence * 100).toFixed(0)}%</span>
                                            <div className="w-16 bg-gray-700 rounded-full h-2"><div className="h-2 rounded-full" style={{width: `${item.confidence * 100}%`, backgroundColor: item.color}}></div></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.evidence?.length > 0 && (
                             <div>
                                <h3 className="font-semibold text-cyan-200 mb-2">اسناد و مدارک</h3>
                                <div className="space-y-2 text-xs">
                                    {result.evidence.map((item, i) => (
                                        <div key={i} className="p-2 bg-gray-800/50 rounded-lg flex items-center justify-between gap-2">
                                            <span><strong>سند:</strong> {item.name}</span>
                                            <span><strong>اعتبار:</strong> {item.credibility}</span>
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">مشاهده منبع</a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {result.similarVideos?.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-cyan-200 mb-2">ویدئوهای مشابه یافت شده</h3>
                                <div className="space-y-2 text-sm">
                                    {result.similarVideos.map((item, i) => <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="block p-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 text-blue-400 hover:underline">{item.persianTitle}</a>)}
                                </div>
                            </div>
                        )}
                        
                        {result.downloadLinks?.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-cyan-200 mb-2">لینک‌های دانلود</h3>
                                <div className="space-y-2 text-sm">
                                     {result.downloadLinks.map((item, i) => (
                                        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 text-blue-400 hover:underline">
                                            <span>{item.name}</span>
                                            <DownloadIcon className="w-4 h-4 text-gray-300"/>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {chatSession && (
                            <div className="mt-6 pt-6 border-t border-cyan-400/20 space-y-4">
                                <h3 className="text-lg font-bold text-cyan-200">گفتگوی تکمیلی</h3>
                                <div className="flex flex-col space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                                    {chatHistory.map((msg, index) => (
                                        <div key={index} className={`max-w-xl w-fit p-3 rounded-xl ${msg.role === 'user' ? 'bg-cyan-600/50 self-end rounded-br-none' : 'bg-gray-700/50 self-start rounded-bl-none'}`}>
                                            <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                                        </div>
                                    ))}
                                    {isChatLoading && <div className="p-3 bg-gray-700/50 rounded-xl self-start w-fit">...</div>}
                                    <div ref={dialogueEndRef} />
                                </div>
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input 
                                        value={chatInput} 
                                        onChange={e => setChatInput(e.target.value)} 
                                        disabled={isChatLoading} 
                                        placeholder="سوال دیگری درباره این ویدئو بپرسید..." 
                                        className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={isChatLoading || !chatInput.trim()} 
                                        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-black font-bold p-2 px-4 rounded-lg"
                                    >
                                        ارسال
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                 )}
            </div>
        </div>
    );
};

export default VideoFactCheckStudio;