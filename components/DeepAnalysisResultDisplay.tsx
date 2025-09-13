import React, { useState, useRef } from 'react';
import { AnalysisResult, FallacyResult, AnalysisStance, AnalysisExample, MentionedSource, Credibility } from '../types';
import { ThumbsUpIcon, ThumbsDownIcon, LightBulbIcon, LinkIcon, DocumentTextIcon } from './icons';
import ExportButton from './ExportButton';

interface DeepAnalysisResultDisplayProps {
    result: AnalysisResult | FallacyResult;
}

const getCredibilityClass = (credibility: Credibility | string | null | undefined) => {
    if (credibility == null || credibility === '') {
        return { text: 'text-gray-300' };
    }
    const credStr = String(credibility);
    if (credStr.includes(Credibility.High)) return { text: 'text-green-300' };
    if (credStr.includes(Credibility.Medium)) return { text: 'text-yellow-300' };
    if (credStr.includes(Credibility.Low)) return { text: 'text-red-300' };
    return { text: 'text-gray-300' };
};

const StanceView: React.FC<{ title: string; icon: React.ReactNode; stances: AnalysisStance[]; className: string }> = ({ title, icon, stances, className }) => (
    <div className="space-y-2">
        <h5 className={`flex items-center gap-2 font-semibold ${className}`}>{icon}{title}</h5>
        {stances.length > 0 ? stances.map((s, i) => (
            <div key={i} className="p-2 bg-gray-900/30 rounded-md text-xs">
                <div className="flex justify-between items-center mb-1">
                    <strong className="block text-gray-200">{s.name}</strong>
                    <div className="flex items-center" title={`سطح علمی: ${s.scientificLevel}/5`}>
                        {[...Array(5)].map((_, starIndex) => (
                            <svg key={starIndex} className={`w-3 h-3 ${starIndex < s.scientificLevel ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        ))}
                    </div>
                </div>
                <p className="text-gray-300">{s.argument}</p>
            </div>
        )) : <p className="text-xs text-gray-500">موردی یافت نشد.</p>}
    </div>
);


const DeepAnalysisResultDisplay: React.FC<DeepAnalysisResultDisplayProps> = ({ result }) => {
    const resultRef = useRef<HTMLDivElement>(null);
    const [openExamples, setOpenExamples] = useState<Record<number, boolean>>({});

    if (!result) return null;

    if ('identifiedFallacies' in result) {
        const fallacyResult = result as FallacyResult;
        return (
             <div ref={resultRef} className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-4 animate-fade-in">
                 <div className="flex justify-between items-start">
                    <h2 className="text-xl font-bold text-cyan-300">مغالطه‌های شناسایی شده</h2>
                    <ExportButton elementRef={resultRef} data={result} title="fallacy_result" type="structured" disabled={false} />
                 </div>
                 {fallacyResult.identifiedFallacies.length > 0 ? (
                    fallacyResult.identifiedFallacies.map((fallacy, index) => (
                        <div key={index} className="p-4 bg-gray-800/50 border-l-4 border-red-500 rounded-r-lg">
                            <h3 className="font-bold text-red-300">{fallacy.type}</h3>
                            <p className="text-sm text-gray-400 mt-2"><strong>متن اصلی:</strong> <em className="italic">"{fallacy.quote}"</em></p>
                            <p className="text-sm text-gray-300 mt-2"><strong>توضیح:</strong> {fallacy.explanation}</p>
                            <p className="text-sm text-green-300 mt-2"><strong>نسخه اصلاح شده:</strong> {fallacy.correctedStatement}</p>
                        </div>
                    ))
                 ) : (
                    <p className="text-green-300">هیچ مغالطه‌ای در متن شناسایی نشد.</p>
                 )}
                 {fallacyResult.groundingSources && fallacyResult.groundingSources.length > 0 && (
                    <div className="pt-3 border-t border-gray-700/50">
                        <h4 className="font-semibold text-cyan-200 text-sm">منابع جستجوی آنلاین (AI):</h4>
                        <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                        {fallacyResult.groundingSources.map((source, i) => (
                            <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate" title={source.uri}>{source.title || "منبع بدون عنوان"}</a></li>
                        ))}
                        </ul>
                    </div>
                )}
            </div>
        )
    }

    const analysisResult = result as AnalysisResult;

    return (
        <div ref={resultRef} className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6 animate-fade-in">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-400">خلاصه درک هوش مصنوعی از درخواست:</p>
                    <p className="italic text-gray-300">"{analysisResult.understanding}"</p>
                </div>
                <ExportButton elementRef={resultRef} data={result} title="deep_analysis_result" type="structured" disabled={false} />
            </div>

            <div className="prose prose-invert prose-sm max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: analysisResult.analysis.replace(/\n/g, '<br />') }} />

            {/* Proponents vs Opponents */}
            <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                 <h4 className="font-semibold text-cyan-200 mb-3">دیدگاه‌های موافق و مخالف</h4>
                 <div className="mb-4">
                     <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                        <span className="text-green-300">موافقین</span>
                        <span className="text-red-300">مخالفین</span>
                     </div>
                     <div className="w-full bg-red-500/30 rounded-full h-2.5 flex overflow-hidden">
                        <div className="bg-green-500 h-2.5" style={{width: `${analysisResult.proponentPercentage}%`}}></div>
                     </div>
                      <div className="text-center text-xs mt-1">{analysisResult.proponentPercentage}% موافق / {100 - analysisResult.proponentPercentage}% مخالف</div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StanceView title="موافقین" icon={<ThumbsUpIcon className="w-5 h-5"/>} stances={analysisResult.proponents} className="text-green-300" />
                    <StanceView title="مخالفین" icon={<ThumbsDownIcon className="w-5 h-5"/>} stances={analysisResult.opponents} className="text-red-300" />
                 </div>
            </div>

            {/* Examples */}
            {analysisResult.examples && analysisResult.examples.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-semibold text-cyan-200">مثال‌ها برای درک بهتر</h4>
                     {analysisResult.examples.map((ex, index) => (
                        <div key={index} className="bg-gray-800/40 rounded-lg border border-gray-700/50">
                            <button onClick={() => setOpenExamples(prev => ({...prev, [index]: !prev[index]}))} className="w-full flex justify-between items-center p-3 text-right text-gray-200">
                                <span>{ex.title}</span>
                                <svg className={`w-5 h-5 transition-transform ${openExamples[index] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {openExamples[index] && <div className="p-3 border-t border-gray-700/50 text-sm text-gray-300 leading-relaxed">{ex.content}</div>}
                        </div>
                     ))}
                </div>
            )}

             {/* Mentioned Sources */}
            {analysisResult.mentionedSources && analysisResult.mentionedSources.length > 0 && (
                <div>
                    <h4 className="font-semibold text-cyan-200 mb-2">منابع ذکر شده در تحلیل</h4>
                    <div className="space-y-2">
                        {analysisResult.mentionedSources.map((source, i) => (
                            <div key={i} className="p-3 bg-gray-900/30 rounded-lg text-xs space-y-1">
                                <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-400 hover:underline">{source.title}</a>
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    <span className={getCredibilityClass(source.sourceCredibility).text}>اعتبار منبع: {source.sourceCredibility || 'نامشخص'}</span>
                                    <span className={getCredibilityClass(source.argumentCredibility).text}>اعتبار استدلال: {source.argumentCredibility || 'نامشخص'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Grounding Sources */}
            {analysisResult.groundingSources && analysisResult.groundingSources.length > 0 && (
                <div className="pt-3">
                    <h4 className="font-semibold text-cyan-200 text-sm">منابع اصلی جستجوی آنلاین (AI):</h4>
                    <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                    {analysisResult.groundingSources.map((source, i) => (
                        <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate" title={source.uri}>{source.title || "منبع بدون عنوان"}</a></li>
                    ))}
                    </ul>
                </div>
            )}

            {/* Footer sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-700">
                <div>
                    <h5 className="font-semibold text-cyan-200 mb-2 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5"/>تکنیک‌های تحلیلی</h5>
                    <ul className="space-y-1 list-disc list-inside">
                        {analysisResult.techniques.map((t, i) => <li key={i} className="text-sm">{t}</li>)}
                    </ul>
                </div>
                <div>
                    <h5 className="font-semibold text-cyan-200 mb-2 flex items-center gap-2"><LightBulbIcon className="w-5 h-5"/>پیشنهادات مرتبط</h5>
                    <ul className="space-y-2">
                        {analysisResult.suggestions.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:underline"><span className="truncate">{s.title}</span></a></li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DeepAnalysisResultDisplay;