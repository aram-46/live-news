import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, ConductDebateConfig, DebateRole, debateRoleLabels, AIModelProvider, ConductDebateMessage, generateUUID, DebateAnalysisResult, SearchHistoryItem } from '../types';
import { getAIOpponentResponse, analyzeUserDebate } from '../services/geminiService';
import { ChatIcon, SparklesIcon, CheckCircleIcon } from './icons';
import ExportButton from './ExportButton';

const PerformanceMetric: React.FC<{ label: string; score: number }> = ({ label, score }) => (
    <div>
        <div className="flex justify-between items-center mb-1 text-sm">
            <span className="text-gray-300">{label}</span>
            <span className="font-bold text-cyan-200">{score} / 10</span>
        </div>
        <div className="progress-bar-container h-2">
            <div className="progress-bar" style={{ width: `${score * 10}%` }}></div>
        </div>
    </div>
);

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let scoreColor = 'stroke-red-500';
    if (score >= 75) scoreColor = 'stroke-green-500';
    else if (score >= 50) scoreColor = 'stroke-yellow-500';

    return (
        <div className="score-circle w-32 h-32">
            <svg className="w-full h-full">
                <circle className="stroke-current text-gray-700" strokeWidth="8" fill="transparent" r={radius} cx="50%" cy="50%" />
                <circle className={`stroke-current ${scoreColor}`} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" fill="transparent" r={radius} cx="50%" cy="50%" />
            </svg>
            <span className="absolute text-3xl font-bold text-white">{score}</span>
        </div>
    );
};

// FIX: Correctly destructure settings from props to make it available within the component.
const ConductDebate: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [config, setConfig] = useState<ConductDebateConfig>({
        topic: '',
        aiRole: 'opponent',
        aiModel: 'gemini',
        analyzePerformance: true,
    });
    const [debateState, setDebateState] = useState<'configuring' | 'running' | 'analyzing' | 'finished' | 'error'>('configuring');
    const [transcript, setTranscript] = useState<ConductDebateMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<DebateAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const analysisRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const handleStartDebate = () => {
        if (!config.topic.trim()) {
            setError('لطفاً موضوع مناظره را مشخص کنید.');
            return;
        }
        setError(null);
        setTranscript([]);
        setAnalysisResult(null);
        setDebateState('running');
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const userMessage: ConductDebateMessage = { id: generateUUID(), role: 'user', text: userInput, timestamp: Date.now() };
        const newTranscript = [...transcript, userMessage];
        setTranscript(newTranscript);
        setUserInput('');
        setIsLoading(true);

        try {
            const response = await getAIOpponentResponse(newTranscript, config, "You are a skilled debater. Respond to the user's argument according to your assigned role.");
            const aiMessage: ConductDebateMessage = { id: generateUUID(), role: 'model', text: response.text, timestamp: Date.now() };
            setTranscript(prev => [...prev, aiMessage]);
        } catch (err) {
            console.error(err);
            const errorMessage: ConductDebateMessage = { id: generateUUID(), role: 'model', text: 'خطا در دریافت پاسخ. لطفا دوباره تلاش کنید.', timestamp: Date.now() };
            setTranscript(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const saveDebateToHistory = (analysis: DebateAnalysisResult) => {
        try {
            const historyString = localStorage.getItem('search-history');
            const currentHistory: SearchHistoryItem[] = historyString ? JSON.parse(historyString) : [];
            const newItem: SearchHistoryItem = {
                id: generateUUID(),
                type: 'user-debate',
                query: config.topic,
                timestamp: Date.now(),
                resultSummary: `مناظره پایان یافت. امتیاز شما: ${analysis.overallScore}/100. ${analysis.summary.slice(0, 100)}...`,
                isFavorite: false,
            };
            const newHistory = [newItem, ...currentHistory].slice(0, 100);
            localStorage.setItem('search-history', JSON.stringify(newHistory));
        } catch (err) {
            console.error("Failed to save debate to history:", err);
        }
    };


    const handleEndAndAnalyze = async () => {
        setDebateState('analyzing');
        if (config.analyzePerformance) {
            try {
                const result = await analyzeUserDebate(transcript, config.topic, settings.aiInstructions['analyzer-user-debate']);
                setAnalysisResult(result);
                saveDebateToHistory(result);
            } catch (err) {
                console.error(err);
                setError('خطا در تحلیل مناظره.');
                setDebateState('error');
            }
        }
        setDebateState('finished');
    };
    
    const isProviderEnabled = (provider: AIModelProvider): boolean => {
        if (provider === 'gemini') return !!process.env.API_KEY;
        const modelSettings = settings.aiModelSettings[provider as keyof typeof settings.aiModelSettings];
        // @ts-ignore
        return 'apiKey' in modelSettings && !!modelSettings.apiKey;
    };
    const availableProviders: AIModelProvider[] = (Object.keys(settings.aiModelSettings) as AIModelProvider[]).filter(isProviderEnabled);

    if (debateState === 'configuring') {
        return (
            <div className="max-w-2xl mx-auto p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <h2 className="text-xl font-bold text-cyan-300">آماده‌سازی مناظره</h2>
                <textarea value={config.topic} onChange={e => setConfig({...config, topic: e.target.value})} rows={3} placeholder="موضوع مناظره را وارد کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                <div className="grid grid-cols-2 gap-4">
                    <select value={config.aiRole} onChange={e => setConfig({...config, aiRole: e.target.value as DebateRole})} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5">
                        {Object.entries(debateRoleLabels).filter(([key]) => key !== 'moderator').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                     <select value={config.aiModel} onChange={e => setConfig({...config, aiModel: e.target.value as AIModelProvider})} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5">
                        {availableProviders.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={config.analyzePerformance} onChange={e => setConfig({...config, analyzePerformance: e.target.checked})} className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-cyan-500"/><span>تحلیل عملکرد من پس از پایان مناظره</span></label>
                <button onClick={handleStartDebate} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg">شروع مناظره</button>
                {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
        );
    }

    if (debateState === 'running') {
        return (
             <div className="flex flex-col h-[75vh] max-w-4xl mx-auto bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
                <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {transcript.map(msg => (
                        <div key={msg.id} className={`max-w-xl w-fit p-3 rounded-xl ${msg.role === 'user' ? 'bg-cyan-600/50 self-end rounded-br-none' : 'bg-gray-700/50 self-start rounded-bl-none'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    ))}
                    {isLoading && <div className="p-3 bg-gray-700/50 rounded-xl self-start w-fit">...</div>}
                    <div ref={transcriptEndRef}/>
                </div>
                <div className="p-4 border-t border-cyan-400/20">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input value={userInput} onChange={e => setUserInput(e.target.value)} disabled={isLoading} placeholder="استدلال خود را وارد کنید..." className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-black font-bold p-2 px-4 rounded-lg">ارسال</button>
                        <button type="button" onClick={handleEndAndAnalyze} className="bg-red-600 hover:bg-red-500 text-white font-bold p-2 px-4 rounded-lg">پایان و تحلیل</button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (debateState === 'analyzing' || debateState === 'finished' || debateState === 'error') {
        return (
            <div className="max-w-4xl mx-auto p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-cyan-300">تحلیل نهایی مناظره</h2>
                    <div>
                        {analysisResult && <ExportButton elementRef={analysisRef} data={{...analysisResult, transcript}} title="debate_analysis" type="structured" disabled={false} />}
                        <button onClick={() => setDebateState('configuring')} className="ml-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">مناظره جدید</button>
                    </div>
                </div>

                {debateState === 'analyzing' && <div className="text-center">در حال تحلیل مناظره...</div>}
                {debateState === 'error' && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                
                {analysisResult && (
                    <div ref={analysisRef} className="space-y-6 animate-fade-in">
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                            <h3 className="font-semibold text-cyan-200 mb-2">خلاصه مناظره</h3>
                            <p className="text-sm text-gray-300">{analysisResult.summary}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-900/30 rounded-lg">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-cyan-200">سنجش عملکرد شما</h3>
                                <PerformanceMetric label="تسلط بر موضوع" score={analysisResult.performanceAnalysis.knowledgeLevel} />
                                <PerformanceMetric label="شیوایی کلام" score={analysisResult.performanceAnalysis.eloquence} />
                                <PerformanceMetric label="قدرت استدلال" score={analysisResult.performanceAnalysis.argumentStrength} />
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                <h3 className="font-semibold text-cyan-200 mb-2">امتیاز نهایی</h3>
                                <ScoreCircle score={analysisResult.overallScore} />
                            </div>
                        </div>
                         <div className="p-4 bg-gray-800/50 rounded-lg">
                            <h3 className="font-semibold text-cyan-200 mb-2 flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> بازخورد و پیشنهادات</h3>
                            <p className="text-sm text-gray-300">{analysisResult.performanceAnalysis.feedback}</p>
                        </div>
                         {analysisResult.fallacyDetection.length > 0 && (
                            <div className="p-4 bg-red-900/20 rounded-lg">
                                <h3 className="font-semibold text-red-200 mb-2">مغالطه‌های شناسایی شده در کلام شما</h3>
                                <div className="space-y-3">
                                    {analysisResult.fallacyDetection.map((f, i) => (
                                        <div key={i} className="p-2 bg-gray-900/30 rounded">
                                            <p className="font-bold text-red-300">{f.fallacyType}</p>
                                            <p className="text-xs text-gray-400 italic my-1">"{f.userQuote}"</p>
                                            <p className="text-xs text-gray-300">{f.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                         {analysisResult.fallacyDetection.length === 0 && config.analyzePerformance && (
                             <div className="p-4 bg-green-900/20 rounded-lg flex items-center gap-2">
                                 <CheckCircleIcon className="w-5 h-5 text-green-300"/>
                                 <p className="font-semibold text-green-300">هیچ مغالطه مشخصی در استدلال‌های شما یافت نشد. عالی بود!</p>
                            </div>
                         )}
                    </div>
                )}
            </div>
        );
    }

    return null;
};

export default ConductDebate;
