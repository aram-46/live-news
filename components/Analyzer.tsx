import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { AppSettings, AnalyzerTabId, analyzerTabLabels, Stance, ChatMessage, AIInstructionType, generateUUID } from '../types';
import { BrainIcon, ThumbsUpIcon, ThumbsDownIcon } from './icons';
import DebateSimulator from './DebateSimulator';


interface AnalyzerProps {
    settings: AppSettings;
}

const PersonalAnalyzer: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<AnalyzerTabId>('political');
    const [topic, setTopic] = useState('');
    const [stance, setStance] = useState<Stance>('neutral');
    const [analyzerChat, setAnalyzerChat] = useState<Chat | null>(null);
    const [dialogueHistory, setDialogueHistory] = useState<ChatMessage[]>([]);
    const [isDialogueActive, setIsDialogueActive] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dialogueEndRef = useRef<HTMLDivElement>(null);

    const resetDebate = () => {
        setTopic('');
        setUserInput('');
        setDialogueHistory([]);
        setIsDialogueActive(false);
        setIsLoading(false);
        setError(null);
    };

    const handleTabChange = (tabId: AnalyzerTabId) => {
        setActiveTab(tabId);
        resetDebate();
    };

    // Effect to manage chat session for ANY active tab
    useEffect(() => {
        const apiKey = settings.aiModelSettings.gemini.apiKey || process.env.API_KEY;
        if (apiKey) {
            const ai = new GoogleGenAI({ apiKey });
            const instructionKey = `analyzer-${activeTab}` as AIInstructionType;
            const systemInstruction = settings.aiInstructions[instructionKey] || `You are an expert ${analyzerTabLabels[activeTab]} analyst.`;

            const newChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction }
            });
            setAnalyzerChat(newChat);
        }
        resetDebate();
    }, [activeTab, settings.aiInstructions, settings.aiModelSettings.gemini.apiKey]);

    useEffect(() => {
        dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dialogueHistory]);

    const handleStartDebate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || !analyzerChat || isLoading) return;

        setIsLoading(true);
        setError(null);
        setDialogueHistory([]);

        const stanceMap = { proponent: 'موافق', opponent: 'مخالف', neutral: 'بی‌طرف' };
        const userVisiblePrompt = `موضوع مناظره (${analyzerTabLabels[activeTab]}): ${topic}\nموضع درخواستی از شما: ${stanceMap[stance]}`;
        const modelInstructionPrompt = `Start a ${analyzerTabLabels[activeTab]} debate. The topic is: "${topic}". My assigned stance is "${stanceMap[stance]}". Provide your opening statement based on this stance.`;

        const userMessage: ChatMessage = { id: generateUUID(), role: 'user', text: userVisiblePrompt, timestamp: Date.now() };
        setDialogueHistory([userMessage]);

        try {
            const result = await analyzerChat.sendMessage({ message: modelInstructionPrompt });
            const modelMessage: ChatMessage = { id: generateUUID(), role: 'model', text: result.text, timestamp: Date.now() };
            setDialogueHistory(prev => [...prev, modelMessage]);
            setIsDialogueActive(true);
        } catch (err) {
            console.error(err);
            setError('خطا در شروع مناظره. لطفاً دوباره تلاش کنید.');
            setDialogueHistory([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendDialogueMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || !analyzerChat || isLoading) return;

        const userMessage: ChatMessage = { id: generateUUID(), role: 'user', text: userInput, timestamp: Date.now() };
        setDialogueHistory(prev => [...prev, userMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsLoading(true);

        try {
            const resultStream = await analyzerChat.sendMessageStream({ message: currentInput });
            let modelResponse = '';
            const thinkingMessage: ChatMessage = { id: generateUUID(), role: 'model', text: '...', timestamp: Date.now() };
            setDialogueHistory(prev => [...prev, thinkingMessage]);

            for await (const chunk of resultStream) {
                modelResponse += chunk.text;
                setDialogueHistory(prev => {
                    const newMessages = [...prev];
                    if (newMessages.length > 0) {
                       newMessages[newMessages.length - 1].text = modelResponse;
                    }
                    return newMessages;
                });
            }
        } catch (err) {
            console.error(err);
            setError('خطا در ارسال پیام.');
            const errorMessage: ChatMessage = { id: generateUUID(), role: 'model', text: 'متاسفانه خطایی در پاسخگویی رخ داد.', timestamp: Date.now() };
            setDialogueHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
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
    
    const renderDialogueMessage = (msg: ChatMessage, index: number) => {
        const isUser = msg.role === 'user';
        const bubbleClasses = isUser
          ? 'bg-cyan-600/50 self-end rounded-br-none'
          : 'bg-gray-700/50 self-start rounded-bl-none';
        
        const formattedText = msg.text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-800/80 px-1 py-0.5 rounded text-xs text-amber-300">$1</code>')
            .replace(/\n/g, '<br />');

        return (
            <div key={index} className={`max-w-xl w-fit p-3 rounded-xl ${bubbleClasses}`}>
                <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedText }} />
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex border-b border-cyan-400/20 overflow-x-auto">
                {(Object.keys(analyzerTabLabels) as AnalyzerTabId[]).map(key => renderTabButton(key, analyzerTabLabels[key]))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                    <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-3"><BrainIcon className="w-6 h-6" /> تحلیل و مناظره ({analyzerTabLabels[activeTab]})</h2>
                    {!isDialogueActive ? (
                        <form onSubmit={handleStartDebate} className="space-y-4">
                            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={4} placeholder={`موضوع اصلی مناظره (${analyzerTabLabels[activeTab]}) را اینجا وارد کنید...`} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                            <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-2">موضع هوش مصنوعی را انتخاب کنید</label>
                                <div className="flex gap-2 rounded-lg bg-gray-700/50 p-1">
                                    <button type="button" onClick={() => setStance('proponent')} className={`w-full py-1 rounded transition-colors text-sm flex items-center justify-center gap-2 ${stance === 'proponent' ? 'bg-green-500 text-black' : 'hover:bg-gray-600'}`}><ThumbsUpIcon className="w-4 h-4" /> موافق</button>
                                    <button type="button" onClick={() => setStance('opponent')} className={`w-full py-1 rounded transition-colors text-sm flex items-center justify-center gap-2 ${stance === 'opponent' ? 'bg-red-500 text-white' : 'hover:bg-gray-600'}`}><ThumbsDownIcon className="w-4 h-4" /> مخالف</button>
                                    <button type="button" onClick={() => setStance('neutral')} className={`w-full py-1 rounded transition-colors text-sm ${stance === 'neutral' ? 'bg-cyan-500 text-black' : 'hover:bg-gray-600'}`}>بی‌طرف</button>
                                </div>
                            </div>
                            <button type="submit" disabled={isLoading || !topic.trim()} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">شروع مناظره</button>
                        </form>
                    ) : (
                        <div className="text-center">
                            <button onClick={resetDebate} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
                                شروع مناظره جدید
                            </button>
                            <p className="text-xs text-gray-500 mt-2">با این کار تاریخچه فعلی پاک می‌شود.</p>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2 p-4 bg-gray-800/30 border border-gray-600/30 rounded-lg min-h-[60vh] flex flex-col">
                    <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                        {dialogueHistory.map(renderDialogueMessage)}
                        {isLoading && dialogueHistory.length > 0 && dialogueHistory[dialogueHistory.length - 1]?.role === 'user' && 
                            <div className="max-w-xl w-fit p-3 rounded-xl bg-gray-700/50 self-start rounded-bl-none">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150"></span>
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-300"></span>
                                </div>
                            </div>
                        }
                        <div ref={dialogueEndRef} />
                        {!isDialogueActive && <div className="flex items-center justify-center h-full text-gray-500">پنجره گفتگو</div>}
                    </div>
                    {isDialogueActive && (
                        <form onSubmit={handleSendDialogueMessage} className="flex gap-2 mt-4 pt-4 border-t border-gray-700/50">
                            <input value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="پاسخ خود را بنویسید..." className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" disabled={isLoading}/>
                            <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-black font-bold p-2 px-4 rounded-lg">ارسال</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const Analyzer: React.FC<AnalyzerProps> = ({ settings }) => {
    const [mainTab, setMainTab] = useState<'personal' | 'simulator'>('simulator');
    
    const renderMainTabButton = (tabId: 'personal' | 'simulator', label: string) => (
         <button
            onClick={() => setMainTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
            mainTab === tabId
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex border-b border-cyan-400/20 mb-6">
                {renderMainTabButton('personal', 'تحلیلگر شخصی')}
                {renderMainTabButton('simulator', 'شبیه‌ساز مناظره')}
            </div>
            {mainTab === 'personal' && <PersonalAnalyzer settings={settings} />}
            {mainTab === 'simulator' && <DebateSimulator settings={settings} />}
        </div>
    );
};


export default Analyzer;
