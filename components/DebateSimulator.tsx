import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, DebateConfig, DebateParticipant, DebateRole, debateRoleLabels, TranscriptEntry, AIModelProvider, FinalDebateAnalysis, ParticipantPerformanceMetrics } from '../types';
import { getDebateTurnResponse, analyzeFinalDebate } from '../services/geminiService';
import { PlusCircleIcon, TrashIcon, PlayIcon, PauseIcon, SpeakerWaveIcon } from './icons';
import ExportButton from './ExportButton';
import { saveHistoryItem } from '../services/historyService';

interface DebateSimulatorProps {
    settings: AppSettings;
}

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

const ParticipantAnalysis: React.FC<{ name: string; metrics: ParticipantPerformanceMetrics }> = ({ name, metrics }) => (
    <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-700">
        <h4 className="font-bold text-cyan-200">{name}</h4>
        <div className="mt-2 space-y-3">
            <PerformanceMetric label="تسلط بر موضوع" score={metrics.knowledgeLevel} />
            <PerformanceMetric label="شیوایی کلام" score={metrics.eloquence} />
            <PerformanceMetric label="قدرت استدلال" score={metrics.argumentStrength} />
            <div>
                <p className="text-sm text-gray-300">تعداد مغالطه‌ها: <span className="font-bold text-yellow-300">{metrics.fallacyCount}</span></p>
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-300">بازخورد:</p>
                <p className="text-xs text-gray-400 mt-1">{metrics.feedback}</p>
            </div>
        </div>
    </div>
);


const DebateSimulator: React.FC<DebateSimulatorProps> = ({ settings }) => {
    const [config, setConfig] = useState<DebateConfig>({
        topic: '',
        pointsOfContention: '',
        participants: [
            { id: 1, role: 'moderator', name: 'مدیر جلسه', modelProvider: 'gemini' },
            { id: 2, role: 'proponent', name: 'موافق', modelProvider: 'gemini' },
            { id: 3, role: 'opponent', name: 'مخالف', modelProvider: 'gemini' },
        ],
        starter: 'proponent',
        turnLimit: 3,
        responseLength: 'medium',
        qualityLevel: 'academic',
        tone: 'formal',
    });
    
    const [debateState, setDebateState] = useState<'configuring' | 'running' | 'paused' | 'finished' | 'analyzing' | 'error'>('configuring');
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [activeSpeakerRole, setActiveSpeakerRole] = useState<DebateRole | null>(null);
    const [finalAnalysis, setFinalAnalysis] = useState<FinalDebateAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const turnCountRef = useRef<Record<string, number>>({});
    const nextSpeakerRef = useRef<DebateRole | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const analysisRef = useRef<HTMLDivElement>(null);
    const isComponentMounted = useRef(true);

    useEffect(() => {
        isComponentMounted.current = true;
        return () => { isComponentMounted.current = false; };
    }, []);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const handleConfigChange = (field: keyof Omit<DebateConfig, 'participants'>, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleParticipantChange = (id: number, field: keyof DebateParticipant, value: string) => {
        setConfig(prev => ({ ...prev, participants: prev.participants.map(p => p.id === id ? { ...p, [field]: value } : p) }));
    };
    
    const addParticipant = () => {
        const newId = Math.max(0, ...config.participants.map(p => p.id)) + 1;
        const newParticipant: DebateParticipant = { id: newId, role: 'neutral', name: `شرکت‌کننده ${newId}`, modelProvider: 'gemini' };
        setConfig(prev => ({...prev, participants: [...prev.participants, newParticipant]}));
    }
    
    const removeParticipant = (id: number) => {
        setConfig(prev => ({...prev, participants: prev.participants.filter(p => p.id !== id)}));
    }
    
    const getNextSpeaker = useCallback((): DebateRole | null => {
        const order: DebateRole[] = ['proponent', 'opponent', ...(config.participants.filter(p => p.role === 'neutral').map(p => p.role))];
        const lastSpeakerRole = transcript.length > 0 ? transcript[transcript.length-1].speaker.role : null;
        
        const totalTurns = order.length * config.turnLimit;
        const completedTurns = order.reduce((acc, role) => acc + (turnCountRef.current[role] || 0), 0);
        if (completedTurns >= totalTurns) {
            return (turnCountRef.current['moderator'] || 0) <= 1 ? 'moderator' : null;
        }

        if (!lastSpeakerRole || lastSpeakerRole === 'moderator' || lastSpeakerRole === 'user') {
            return config.starter;
        }

        const currentInOrder = order.indexOf(lastSpeakerRole as DebateRole);
        if (currentInOrder !== -1) {
            for (let i = 1; i <= order.length; i++) {
                const nextSpeaker = order[(currentInOrder + i) % order.length];
                if ((turnCountRef.current[nextSpeaker] || 0) < config.turnLimit) {
                    return nextSpeaker;
                }
            }
        }
        
        return 'moderator';
    }, [config, transcript]);

    const performNextTurn = useCallback(async () => {
        const speakerRole = nextSpeakerRef.current;
        if (!speakerRole || !isComponentMounted.current || debateState !== 'running') return;
        
        setActiveSpeakerRole(speakerRole);

        try {
            const speaker = config.participants.find(p => p.role === speakerRole)!;
            const turnNumber = (turnCountRef.current[speakerRole] || 0) + 1;
            
            const totalTurns = config.participants.filter(p=>p.role !== 'moderator').length * config.turnLimit;
            const completedTurns = config.participants.filter(p=>p.role !== 'moderator').reduce((acc, p) => acc + (turnCountRef.current[p.role] || 0), 0);
            const isFinalTurn = speakerRole === 'moderator' && completedTurns >= totalTurns;
            
            const response = await getDebateTurnResponse(transcript, speakerRole, turnNumber, config, isFinalTurn, settings.aiInstructions['analyzer-debate'], speaker.modelProvider, settings);
            const newEntry: TranscriptEntry = { speaker, text: response.text };

            if (!isComponentMounted.current) return;

            setTranscript(prev => [...prev, newEntry]);
            turnCountRef.current[speakerRole] = turnNumber;

            const nextSpeaker = getNextSpeaker();
            if (nextSpeaker) {
                nextSpeakerRef.current = nextSpeaker;
            } else {
                handleEndAndAnalyze();
            }

        } catch (err) {
            console.error(err);
            if(isComponentMounted.current) {
                setError('یک خطا در حین شبیه‌سازی رخ داد.');
                setDebateState('error');
            }
        } finally {
            if(isComponentMounted.current) {
                setActiveSpeakerRole(null);
            }
        }
    }, [config, transcript, getNextSpeaker, settings, debateState]);
    
    useEffect(() => {
        if (debateState === 'running' && !activeSpeakerRole) {
            const timer = setTimeout(() => {
                performNextTurn();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [debateState, transcript, activeSpeakerRole, performNextTurn]);

    const handleStart = () => {
        if (!config.topic.trim()) { setError("لطفا موضوع مناظره را وارد کنید."); return; }
        setError(null);
        setTranscript([]);
        setFinalAnalysis(null);
        turnCountRef.current = {};
        nextSpeakerRef.current = 'moderator';
        setDebateState('running');
    };
    
    const handlePauseResume = () => {
        setDebateState(prev => (prev === 'running' ? 'paused' : 'running'));
    };
    
    const handleEndAndAnalyze = async () => {
        setDebateState('analyzing');
        setActiveSpeakerRole(null);
        nextSpeakerRef.current = null;
        try {
            const result = await analyzeFinalDebate(transcript, settings);
            setFinalAnalysis(result);
            saveHistoryItem({ type: 'debate-simulation', query: config.topic, resultSummary: result.conclusion, data: { transcript, analysis: result } });
        } catch (err) {
            setError("خطا در تحلیل نهایی مناظره.");
        } finally {
            if (isComponentMounted.current) {
                setDebateState('finished');
            }
        }
    };
    
    const isProviderEnabled = (provider: AIModelProvider): boolean => {
        if (provider === 'gemini') return !!(settings.aiModelSettings.gemini.apiKey || process.env.API_KEY);
        const providerSettings = settings.aiModelSettings[provider as keyof typeof settings.aiModelSettings];
        // @ts-ignore
        return 'apiKey' in providerSettings && !!providerSettings.apiKey;
    };
    const availableProviders = (Object.keys(settings.aiModelSettings) as AIModelProvider[]).filter(isProviderEnabled);

    return (
        <div className="space-y-6">
            {debateState === 'configuring' ? (
                 <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                    <h2 className="text-xl font-bold text-cyan-300">پیکربندی مناظره</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <textarea value={config.topic} onChange={e => handleConfigChange('topic', e.target.value)} rows={3} placeholder="موضوع اصلی مناظره..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5 md:col-span-2"/>
                        <textarea value={config.pointsOfContention} onChange={e => handleConfigChange('pointsOfContention', e.target.value)} rows={3} placeholder="موارد اختلافی برای تمرکز (اختیاری)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5 md:col-span-2"/>
                    </div>
                    <div className="space-y-2">
                        {config.participants.map(p => (
                            <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                                <input type="text" value={p.name} onChange={e => handleParticipantChange(p.id, 'name', e.target.value)} placeholder={debateRoleLabels[p.role]} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm"/>
                                <select value={p.role} onChange={e => handleParticipantChange(p.id, 'role', e.target.value)} className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-xs" disabled={p.role === 'moderator'}>
                                    {Object.keys(debateRoleLabels).filter(r => r !== 'user' && r !== 'moderator').map(r => <option key={r} value={r}>{debateRoleLabels[r as DebateRole]}</option>)}
                                </select>
                                <select value={p.modelProvider} onChange={e => handleParticipantChange(p.id, 'modelProvider', e.target.value)} className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-xs">
                                    {availableProviders.map(provider => <option key={provider} value={provider}>{provider}</option>)}
                                </select>
                                <button onClick={() => removeParticipant(p.id)} disabled={p.role === 'moderator' || config.participants.length <= 2} className="text-red-500 disabled:text-gray-600"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
                        <button onClick={addParticipant} className="text-xs text-cyan-400 flex items-center gap-1"><PlusCircleIcon className="w-4 h-4"/> افزودن شرکت‌کننده</button>
                    </div>
                    <button onClick={handleStart} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg">شروع شبیه‌سازی</button>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-black/30 rounded-lg flex justify-between items-center">
                        <h3 className="text-lg font-bold text-cyan-300 truncate">موضوع: {config.topic}</h3>
                        <div className="flex gap-2">
                            {debateState === 'running' || debateState === 'paused' ? <button onClick={handlePauseResume} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-2">{debateState === 'running' ? <PauseIcon className="w-4 h-4"/> : <PlayIcon className="w-4 h-4"/>} {debateState === 'running' ? 'توقف' : 'ادامه'}</button> : null}
                            <button onClick={handleEndAndAnalyze} disabled={debateState === 'analyzing' || debateState === 'finished'} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg">پایان و تحلیل</button>
                            <button onClick={() => setDebateState('configuring')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg">مناظره جدید</button>
                             <ExportButton elementRef={analysisRef} data={{...finalAnalysis, transcript}} title="debate_simulation" type="structured" disabled={debateState !== 'finished'} />
                        </div>
                    </div>
                    <div className="p-4 bg-gray-800/30 border border-gray-600/30 rounded-lg h-[60vh] flex flex-col">
                        <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                            {transcript.map((entry, index) => (
                                 <div key={index} className="animate-fade-in">
                                     <div className={`p-3 rounded-lg w-11/12 lg:w-4/5 ${entry.speaker.role === 'proponent' ? 'bg-green-900/30' : entry.speaker.role === 'opponent' ? 'bg-red-900/30' : 'bg-gray-900/40'}`}>
                                        <div className="flex items-center gap-2 text-sm mb-2"><span className="font-bold text-cyan-300">{entry.speaker.name}</span> <span className="text-xs text-gray-500">({debateRoleLabels[entry.speaker.role]})</span></div>
                                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                                     </div>
                                 </div>
                            ))}
                             {activeSpeakerRole && <div className="text-center text-cyan-400 animate-pulse">{config.participants.find(p=>p.role===activeSpeakerRole)?.name} در حال صحبت...</div>}
                             {debateState === 'analyzing' && <div className="text-center text-green-400 animate-pulse">در حال تحلیل نهایی مناظره...</div>}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>
                    {finalAnalysis && (
                        <div ref={analysisRef} className="p-4 bg-black/30 rounded-lg animate-fade-in space-y-6">
                            <h3 className="text-xl font-bold text-green-300">تحلیل نهایی مناظره</h3>
                            <div><h4 className="font-semibold text-cyan-200">خلاصه</h4><p className="text-sm">{finalAnalysis.summary}</p></div>
                            <div><h4 className="font-semibold text-cyan-200">نتیجه‌گیری</h4><p className="text-sm">{finalAnalysis.conclusion}</p></div>
                            
                            {finalAnalysis.performanceAnalysis && (
                                <div>
                                    <h4 className="font-semibold text-cyan-200 mt-4 mb-2">تحلیل عملکرد شرکت‌کنندگان</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {Object.entries(finalAnalysis.performanceAnalysis).map(([name, metrics]) => (
                                            <ParticipantAnalysis key={name} name={name} metrics={metrics} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {finalAnalysis.winner && (
                                <div className="text-center pt-4">
                                    <p className="text-lg font-bold text-yellow-300">
                                        برنده مناظره: {finalAnalysis.winner === 'tie' ? 'مساوی' : finalAnalysis.winner}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DebateSimulator;