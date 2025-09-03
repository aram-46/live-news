import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AgentClarificationRequest, AgentExecutionResult } from '../../types';
import { SparklesIcon, CheckCircleIcon } from '../icons';
import { analyzeAgentRequest, executeAgentTask } from '../../services/geminiService';
import ScreenshotModal from '../ScreenshotModal';
import ExportButton from '../ExportButton';
import html2canvas from 'html2canvas';

interface WebAgentProps {
    settings: AppSettings;
}

type AgentState = 'idle' | 'clarifying' | 'confirming' | 'executing' | 'done' | 'error';

const WebAgent: React.FC<WebAgentProps> = ({ settings }) => {
    const [topic, setTopic] = useState('');
    const [request, setRequest] = useState('');
    const [state, setState] = useState<AgentState>('idle');
    const [clarification, setClarification] = useState<AgentClarificationRequest | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [finalPrompt, setFinalPrompt] = useState('');
    const [result, setResult] = useState<AgentExecutionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const [screenshotImage, setScreenshotImage] = useState<string | null>(null);
    const resultRef = useRef<HTMLDivElement>(null);
    const [visibleStep, setVisibleStep] = useState(-1);

    useEffect(() => {
        if (state === 'done' && result && visibleStep < result.steps.length) {
            const timer = setTimeout(() => {
                setVisibleStep(i => i + 1);
            }, 750);
            return () => clearTimeout(timer);
        }
    }, [visibleStep, result, state]);
    

    const handleTakeScreenshot = async () => {
        if (resultRef.current) {
            try {
                const canvas = await html2canvas(resultRef.current, { backgroundColor: '#1e293b' }); // bg-slate-800
                setScreenshotImage(canvas.toDataURL('image/png'));
            } catch (error) {
                console.error("Error taking screenshot:", error);
                alert("خطا در گرفتن اسکرین شات.");
            }
        }
    };


    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || !request.trim()) {
            setError('لطفاً هم موضوع و هم شرح وظیفه را وارد کنید.');
            return;
        }
        
        setState('executing');
        setError(null);
        setResult(null);
        setClarification(null);
        setVisibleStep(-1);

        try {
            const clarificationResponse = await analyzeAgentRequest(topic, request, settings.aiInstructions['browser-agent']);
            
            if (!clarificationResponse.isClear && clarificationResponse.questions) {
                setClarification(clarificationResponse);
                setState('clarifying');
            } else {
                setFinalPrompt(clarificationResponse.refinedPrompt || `موضوع: ${topic}\nدرخواست: ${request}`);
                setState('confirming');
            }
        } catch (err) {
            console.error(err);
            setError('خطا در تحلیل اولیه درخواست. لطفاً دوباره تلاش کنید.');
            setState('error');
        }
    };
    
    const handleAnswerChange = (index: number, value: string) => {
        setAnswers(prev => ({ ...prev, [index]: value }));
    };

    const handleClarificationSubmit = () => {
        let refined = `موضوع: ${topic}\nدرخواست: ${request}\n\nاطلاعات تکمیلی:\n`;
        clarification?.questions?.forEach((q, i) => {
            refined += `- ${q.questionText}: ${answers[i] || 'پاسخ داده نشد'}\n`;
        });
        setFinalPrompt(refined);
        setState('confirming');
        setClarification(null);
    };

    const handleExecute = async () => {
        setState('executing');
        try {
            const executionResult = await executeAgentTask(finalPrompt, settings.aiInstructions['browser-agent']);
            setResult(executionResult);
            setState('done');
            setVisibleStep(0);
        } catch (err) {
            console.error(err);
            setError('خطا در اجرای نهایی وظیفه.');
            setState('error');
        }
    };


    const renderStateContent = () => {
        switch (state) {
            case 'idle':
                return <div className="text-center text-gray-500">برای شروع، موضوع و وظیفه مورد نظر خود را در پنل سمت راست وارد کرده و دکمه "شروع" را بزنید.</div>;
            case 'executing':
                return <div className="flex flex-col items-center justify-center h-full"><svg className="animate-spin h-8 w-8 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><p className="mt-4 text-sm text-cyan-300">در حال پردازش...</p></div>;
            case 'error':
                 return <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>;
            case 'clarifying':
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-amber-300">نیاز به شفاف‌سازی</h3>
                        <p className="text-sm text-amber-200">برای درک بهتر درخواست شما، لطفاً به سوالات زیر پاسخ دهید:</p>
                        {clarification?.questions?.map((q, i) => (
                            <div key={i} className="p-3 bg-gray-900/50 rounded-lg">
                                <label className="block text-sm font-medium text-cyan-300 mb-2">{q.questionText}</label>
                                {q.questionType === 'text-input' ? (
                                    <input type="text" onChange={(e) => handleAnswerChange(i, e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2" />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {q.options?.map(opt => <button key={opt} onClick={() => handleAnswerChange(i, opt)} className={`px-3 py-1 text-xs rounded-full border ${answers[i] === opt ? 'bg-cyan-500 border-cyan-400' : 'bg-gray-700 border-gray-600'}`}>{opt}</button>)}
                                    </div>
                                )}
                            </div>
                        ))}
                        <button onClick={handleClarificationSubmit} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg">ادامه</button>
                    </div>
                );
            case 'confirming':
                 return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-cyan-200">تایید نهایی درخواست</h3>
                        <p className="text-sm text-gray-400">هوش مصنوعی درخواست شما را به شکل زیر برداشت کرده است. آیا برای اجرا تایید می‌کنید؟</p>
                        <div className="p-3 bg-gray-900/50 rounded-lg text-sm text-gray-300 whitespace-pre-wrap font-mono">{finalPrompt}</div>
                        <div className="flex gap-4">
                            <button onClick={handleExecute} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg">تایید و اجرا</button>
                            <button onClick={() => setState('idle')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">ویرایش</button>
                        </div>
                    </div>
                 );
            case 'done':
                 return (
                     <div ref={resultRef} className="space-y-4 animate-fade-in bg-slate-800 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-green-300 text-lg">وظیفه با موفقیت انجام شد</h3>
                             <div className="flex gap-2">
                                <button onClick={handleTakeScreenshot} className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-2 rounded">اسکرین‌شات</button>
                                <ExportButton elementRef={resultRef} data={result} title="web_agent_result" type="agent" disabled={false} />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-900/50 rounded-lg">
                            <h4 className="font-semibold text-cyan-200 mb-2">خلاصه نتایج</h4>
                            <p className="text-sm text-gray-300 leading-relaxed">{result?.summary}</p>
                        </div>
                        <div className="space-y-3">
                             <h4 className="font-semibold text-cyan-200">مراحل انجام شده</h4>
                             {result?.steps.map((step, i) => (
                                <div key={i} className={`flex items-start gap-3 p-2 bg-gray-800/50 rounded transition-opacity duration-500 ${i < visibleStep ? 'opacity-100' : 'opacity-0'}`}>
                                    <CheckCircleIcon className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-sm text-gray-200">{step.title}</p>
                                        <p className="text-xs text-gray-400">{step.description}</p>
                                    </div>
                                </div>
                             ))}
                        </div>
                        <div className={`transition-opacity duration-500 ${visibleStep > (result?.steps.length ?? 0) ? 'opacity-100' : 'opacity-0'}`}>
                             <h4 className="font-semibold text-cyan-200">منابع اصلی استفاده شده</h4>
                              <ul className="list-disc list-inside space-y-1 mt-2">
                                {result?.sources.map((s, i) => <li key={i}><a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline">{s.title || s.uri}</a></li>)}
                             </ul>
                        </div>
                     </div>
                 );
        }
    };

    return (
        <>
        {screenshotImage && <ScreenshotModal image={screenshotImage} onClose={() => setScreenshotImage(null)} />}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Panel */}
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-3">
                    <SparklesIcon className="w-6 h-6" />
                    عامل هوشمند وب
                </h2>
                <form onSubmit={handleStart} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">موضوع یا آدرس (URL)</label>
                        <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="مثال: https://www.bbc.com/persian/..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">درخواست شما (شرح وظیفه)</label>
                        <textarea value={request} onChange={e => setRequest(e.target.value)} rows={5} placeholder="مثال: این مقاله را خلاصه کن و سه نکته کلیدی آن را استخراج نما." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    </div>
                    <button type="submit" disabled={state === 'executing' || state === 'clarifying' || state === 'confirming'} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                        شروع
                    </button>
                </form>
                <div className="pt-4 border-t border-cyan-400/20">
                    <button onClick={() => setIsGuideOpen(!isGuideOpen)} className="text-sm text-cyan-400 hover:underline">
                        {isGuideOpen ? 'بستن راهنما' : 'نمایش راهنمای استفاده'}
                    </button>
                    {isGuideOpen && (
                        <div className="text-xs text-gray-400 mt-2 space-y-2 bg-gray-900/50 p-3 rounded-lg">
                            <p><strong>عامل هوشمند وب چیست؟</strong> این یک دستیار پیشرفته است که می‌تواند وب را برای شما جستجو کرده و وظایfف مختلفی را بر اساس درخواست شما انجام دهد.</p>
                            <p><strong>چگونه استفاده کنیم؟</strong></p>
                            <ul className="list-disc list-inside pr-4">
                                <li><strong>موضوع:</strong> یک عبارت کلی، سوال، یا یک آدرس URL خاص وارد کنید.</li>
                                <li><strong>درخواست:</strong> دقیقاً توضیح دهید که از هوش مصنوعی چه می‌خواهید. هرچه دقیق‌تر، بهتر.</li>
                            </ul>
                            <p><strong>مثال‌ها:</strong></p>
                            <ul className="list-disc list-inside pr-4">
                                <li><strong>موضوع:</strong> آخرین تحولات هوش مصنوعی</li>
                                <li><strong>درخواست:</strong> ۵ مورد از مهم‌ترین پیشرفت‌ها در ماه گذشته را پیدا کرده و به صورت لیستی با توضیح کوتاه ارائه بده.</li>
                                <li><strong>موضوع:</strong> [لینک یک مقاله طولانی]</li>
                                <li><strong>درخواست:</strong> این مقاله را به ۳ پاراگراف خلاصه کن و منابع آن را لیست کن.</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            {/* Result Panel */}
            <div className="lg:col-span-2 p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg min-h-[400px] flex flex-col justify-center">
                {renderStateContent()}
            </div>
        </div>
        </>
    );
};

export default WebAgent;
