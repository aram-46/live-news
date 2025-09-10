
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, DebateConfig, DebateParticipant, DebateRole, debateRoleLabels, TranscriptEntry, AIModelProvider, generateUUID } from '../types';
import { getDebateTurnResponse } from '../services/geminiService';
import { GavelIcon, PlusCircleIcon, MinusCircleIcon, CircleIcon, UploadImageIcon, PlayIcon, PauseIcon, BrainIcon } from './icons';
import ExportButton from './ExportButton';

interface DebateSimulatorProps {
    settings: AppSettings;
}

// Reusable Collapsible Section Component
const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; initialOpen?: boolean }> = ({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    return (
        <div className="border border-gray-700/50 rounded-lg">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-right bg-gray-800/40 hover:bg-gray-700/50 rounded-t-lg">
                <span className="font-semibold text-cyan-300">{title}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && <div className="p-4 space-y-4 text-sm text-gray-300">{children}</div>}
        </div>
    );
};


const DebateSimulator: React.FC<DebateSimulatorProps> = ({ settings }) => {
    const [config, setConfig] = useState<DebateConfig>({
        topic: '',
        participants: [
            { id: 1, role: 'moderator', name: 'مدیر جلسه', modelProvider: 'gemini' },
            { id: 2, role: 'proponent', name: 'موافق', modelProvider: 'gemini' },
            { id: 3, role: 'opponent', name: 'مخالف', modelProvider: 'gemini' },
            { id: 4, role: 'neutral', name: 'بی‌طرف', modelProvider: 'gemini' },
        ],
        starter: 'moderator',
        turnLimit: 2,
        responseLength: 'medium',
        tone: 'formal',
    });
    
    // FIX: Added 'error' to the DebateState type to allow setting an error state.
    const [debateState, setDebateState] = useState<'idle' | 'running' | 'paused' | 'finished' | 'error'>('idle');
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [activeSpeaker, setActiveSpeaker] = useState<DebateRole | null>(null);
    const [currentSpeakerRole, setCurrentSpeakerRole] = useState<DebateRole | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const transcriptRef = useRef<HTMLDivElement>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const turnCountRef = useRef<Record<DebateRole, number>>({ moderator: 0, proponent: 0, opponent: 0, neutral: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const participantIdToUpdate = useRef<number | null>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const handleConfigChange = (field: keyof DebateConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleParticipantChange = (id: number, field: keyof DebateParticipant, value: string) => {
        const newParticipants = config.participants.map(p => 
            p.id === id ? { ...p, [field]: value } : p
        );
        handleConfigChange('participants', newParticipants);
    };

    const handleAvatarUploadClick = (participantId: number) => {
        participantIdToUpdate.current = participantId;
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && participantIdToUpdate.current !== null) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const avatarData = e.target?.result as string;
                handleParticipantChange(participantIdToUpdate.current!, 'avatar', avatarData);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const getNextSpeaker = useCallback((currentSpeaker: DebateRole): DebateRole | null => {
        const order: DebateRole[] = ['moderator', 'proponent', 'opponent', 'neutral'];
        const isLastTurn = Object.values(turnCountRef.current).every(count => count >= config.turnLimit);

        if (isLastTurn) {
             // If everyone has had their turns, let the moderator conclude if they haven't already.
            return turnCountRef.current.moderator <= config.turnLimit ? 'moderator' : null;
        }

        let nextIndex = (order.indexOf(currentSpeaker) + 1) % order.length;
        let nextSpeaker = order[nextIndex];
        let attempts = 0;

        // Loop to find the next available speaker
        while (attempts < order.length) {
            if (nextSpeaker === 'moderator' && turnCountRef.current.moderator >= config.turnLimit) {
                 // Moderator only speaks at the beginning and end, and if someone else is done
            } else if (turnCountRef.current[nextSpeaker] < config.turnLimit) {
                return nextSpeaker;
            }
            nextIndex = (nextIndex + 1) % order.length;
            nextSpeaker = order[nextIndex];
            attempts++;
        }

        // If loop completes, it means only moderator might be left
        return turnCountRef.current.moderator <= config.turnLimit ? 'moderator' : null;

    }, [config.turnLimit]);
    
    const performNextTurn = useCallback(async (speakerRole: DebateRole) => {
        setActiveSpeaker(speakerRole);
        turnCountRef.current[speakerRole]++;

        try {
            const isFinalTurn = Object.values(turnCountRef.current).every(c => c >= config.turnLimit);
            const speaker = config.participants.find(p => p.role === speakerRole)!;
            const response = await getDebateTurnResponse(transcript, speakerRole, turnCountRef.current[speakerRole], config, isFinalTurn, settings.aiInstructions['analyzer-debate'], speaker.modelProvider);

            const newEntry: TranscriptEntry = { participant: speaker, text: response.text };
            setTranscript(prev => [...prev, newEntry]);

            await new Promise(res => setTimeout(res, 500)); // Short pause

            const nextSpeaker = getNextSpeaker(speakerRole);
            if (nextSpeaker) {
                setCurrentSpeakerRole(nextSpeaker);
            } else {
                setDebateState('finished');
                setActiveSpeaker(null);
                setCurrentSpeakerRole(null);
            }
        } catch (err) {
            console.error(err);
            setError('یک خطا در حین شبیه‌سازی رخ داد.');
            setDebateState('error');
            setActiveSpeaker(null);
            setCurrentSpeakerRole(null);
        }
    }, [config, transcript, getNextSpeaker, settings.aiInstructions]);


    useEffect(() => {
      if (debateState === 'running' && currentSpeakerRole) {
        performNextTurn(currentSpeakerRole);
      }
    }, [debateState, currentSpeakerRole, performNextTurn]);


    const handleStartStop = () => {
        if (debateState === 'running') {
            setDebateState('paused');
        } else if (debateState === 'paused') {
            setDebateState('running');
        } else { // idle, finished, error
            setDebateState('running');
            setError(null);
            setTranscript([]);
            turnCountRef.current = { moderator: 0, proponent: 0, opponent: 0, neutral: 0 };
            setCurrentSpeakerRole(config.starter);
        }
    };
    
    const getRoleIcon = (role: DebateRole) => {
        const participant = config.participants.find(p => p.role === role);
        if (participant?.avatar) {
            return <img src={participant.avatar} alt={participant.name} className="w-6 h-6 rounded-full object-cover" />;
        }
        switch (role) {
            case 'moderator': return <GavelIcon className="w-6 h-6" />;
            case 'proponent': return <PlusCircleIcon className="w-6 h-6" />;
            case 'opponent': return <MinusCircleIcon className="w-6 h-6" />;
            case 'neutral': return <CircleIcon className="w-6 h-6" />;
            default: return null;
        }
    };

    const isProviderEnabled = (provider: AIModelProvider): boolean => {
        if (provider === 'gemini') return !!process.env.API_KEY;
        const modelSettings = settings.aiModelSettings[provider as keyof typeof settings.aiModelSettings];
        return 'apiKey' in modelSettings && !!modelSettings.apiKey;
    };
    const availableProviders: AIModelProvider[] = (Object.keys(settings.aiModelSettings) as AIModelProvider[]).filter(isProviderEnabled);


    const getButtonLabel = () => {
        if (debateState === 'running') return 'توقف';
        if (debateState === 'paused') return 'ادامه';
        if (debateState === 'finished' || debateState === 'error') return 'شروع مجدد';
        return 'شروع شبیه‌سازی';
    }

    const renderTranscriptEntry = (entry: TranscriptEntry, index: number) => {
        const { role, name, avatar } = entry.participant;
        let alignmentClass = 'justify-center';
        let widthClass = 'w-11/12';
        let bgColor = 'bg-gray-900/50';

        if (role === 'proponent') {
            alignmentClass = 'justify-end';
            widthClass = 'w-4/5';
            bgColor = 'bg-green-900/30';
        } else if (role === 'opponent') {
            alignmentClass = 'justify-start';
            widthClass = 'w-4/5';
            bgColor = 'bg-red-900/30';
        }
        
        return (
            <div key={index} className={`flex ${alignmentClass} animate-fade-in`}>
                <div className={`p-3 ${bgColor} rounded-lg ${widthClass}`}>
                    <div className="flex items-center gap-2 text-sm mb-2">
                         {avatar ? (
                            <img src={avatar} alt={name} className="w-6 h-6 rounded-full object-cover"/>
                         ) : (
                            <span className="p-1.5 bg-gray-800 rounded-full text-cyan-300">{getRoleIcon(role)}</span>
                         )}
                        <span className="font-bold text-cyan-300">{name}</span>
                        <span className="text-xs text-gray-500">({debateRoleLabels[role]})</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                </div>
            </div>
        )
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <h2 className="text-xl font-bold text-cyan-300">پیکربندی مناظره</h2>
                <fieldset disabled={debateState === 'running' || debateState === 'paused'} className="space-y-4 disabled:opacity-50">
                    <CollapsibleSection title="راهنمای استفاده" initialOpen={false}>
                        <ol className="list-decimal list-inside space-y-2 text-xs">
                            <li><strong>موضوع:</strong> یک موضوع دقیق برای مناظره وارد کنید.</li>
                            <li><strong>شرکت‌کنندگان:</strong> می‌توانید نام هر نقش را تغییر دهید. برای هر نقش یک آواتار آپلود کرده و مدل هوش مصنوعی دلخواه را انتخاب کنید.</li>
                            <li><strong>تنظیمات:</strong> مشخص کنید کدام نقش مناظره را شروع می‌کند، هر نقش چند نوبت صحبت کند، و طول و لحن پاسخ‌ها چگونه باشد.</li>
                            <li><strong>شروع:</strong> دکمه "شروع شبیه‌سازی" را بزنید.</li>
                            <li><strong>کنترل:</strong> می‌توانید در حین اجرا مناظره را متوقف و دوباره ادامه دهید.</li>
                            <li><strong>خروجی:</strong> پس از اتمام، با استفاده از دکمه خروجی، کل متن مناظره را ذخیره کنید.</li>
                        </ol>
                    </CollapsibleSection>
                    <textarea value={config.topic} onChange={e => handleConfigChange('topic', e.target.value)} rows={3} placeholder="موضوع اصلی مناظره..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                     
                    <CollapsibleSection title="شرکت‌کنندگان و مدل‌ها" initialOpen={true}>
                        {config.participants.map(p => (
                            <div key={p.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                                <button onClick={() => handleAvatarUploadClick(p.id)} className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-600">
                                    {p.avatar ? <img src={p.avatar} alt="avatar" className="w-full h-full object-cover rounded-lg"/> : <UploadImageIcon className="w-5 h-5"/>}
                                </button>
                                <input type="text" value={p.name} onChange={e => handleParticipantChange(p.id, 'name', e.target.value)} placeholder={debateRoleLabels[p.role]} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm"/>
                                <select value={p.modelProvider} onChange={e => handleParticipantChange(p.id, 'modelProvider', e.target.value)} className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-xs">
                                    {availableProviders.map(provider => <option key={provider} value={provider}>{provider}</option>)}
                                </select>
                            </div>
                        ))}
                    </CollapsibleSection>
                     
                    <div className="grid grid-cols-2 gap-4">
                        <select value={config.starter} onChange={e => handleConfigChange('starter', e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm">
                            <option value="" disabled>شروع‌کننده...</option>
                            {config.participants.map(p => <option key={p.role} value={p.role}>{p.name}</option>)}
                        </select>
                        <div>
                             <label className="text-xs text-gray-400">نوبت هر نفر: {config.turnLimit}</label>
                             <input type="range" min="1" max="5" value={config.turnLimit} onChange={e => handleConfigChange('turnLimit', Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <select value={config.responseLength} onChange={e => handleConfigChange('responseLength', e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm">
                            <option value="short">پاسخ کوتاه</option>
                            <option value="medium">پاسخ متوسط</option>
                            <option value="long">پاسخ بلند</option>
                        </select>
                        <select value={config.tone} onChange={e => handleConfigChange('tone', e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm">
                            <option value="formal">لحن رسمی</option>
                            <option value="passionate">لحن پرشور</option>
                            <option value="academic">لحن آکادمیک</option>
                        </select>
                    </div>
                </fieldset>
                <button onClick={handleStartStop} disabled={!config.topic} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-black font-bold py-3 rounded-lg transition">
                    {(debateState === 'running') && <PauseIcon className="w-5 h-5"/>}
                    {(debateState !== 'running') && <PlayIcon className="w-5 h-5"/>}
                    {getButtonLabel()}
                </button>
                {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
            
            <div className="lg:col-span-2 p-4 bg-gray-800/30 border border-gray-600/30 rounded-lg min-h-[70vh] flex flex-col">
                <div className="relative h-48 flex-shrink-0 flex items-center justify-center mb-4 overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
                    <div className="debate-table"></div>
                    {config.participants.map((p, i) => {
                        const angle = (i / 4) * 2 * Math.PI - Math.PI / 4;
                        const x = 50 + 40 * Math.cos(angle);
                        const y = 50 + 40 * Math.sin(angle);
                        const isSpeaking = activeSpeaker === p.role;
                        return (
                            <div key={p.id} className={`participant-node ${isSpeaking ? 'active' : ''}`} style={{ top: `${y}%`, left: `${x}%`, '--glow-color': 'var(--accent-color)' } as React.CSSProperties}>
                                {getRoleIcon(p.role)}
                            </div>
                        );
                    })}
                     <div className="absolute top-2 right-2">
                        <ExportButton elementRef={transcriptRef} data={transcript} title={`debate-${config.topic.slice(0,20)}`} type="structured" disabled={debateState !== 'finished'}/>
                    </div>
                </div>
                <div ref={transcriptRef} className="flex-grow space-y-4 overflow-y-auto pr-2">
                    {transcript.map(renderTranscriptEntry)}
                    <div ref={transcriptEndRef} />
                    {debateState === 'idle' && <div className="flex items-center justify-center h-full text-gray-500">مناظره در اینجا نمایش داده می‌شود.</div>}
                    {debateState === 'finished' && <div className="text-center text-green-400 font-bold p-4">مناظره به پایان رسید.</div>}
                </div>
            </div>
        </div>
    );
};

export default DebateSimulator;
