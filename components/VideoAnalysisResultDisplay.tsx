import React, { useState, useRef } from 'react';
import { MediaAnalysisResult, Critique, AnalyzedClaim } from '../types';
import ExportButton from './ExportButton';
import { DocumentTextIcon, CheckCircleIcon } from './icons';

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; initialOpen?: boolean }> = ({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    return (
        <div className="border border-gray-700/50 rounded-lg">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-right bg-gray-800/40 hover:bg-gray-700/50 rounded-t-lg">
                <span className="font-semibold text-cyan-300">{title}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && <div className="p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">{children}</div>}
        </div>
    );
};

const CredibilityBar: React.FC<{ score: number }> = ({ score }) => {
    const color = score > 75 ? 'bg-green-500' : score > 40 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className={`${color} h-2.5 rounded-full`} style={{ width: `${score}%` }}></div>
        </div>
    );
};

const CritiqueSection: React.FC<{ title: string, content: string }> = ({ title, content }) => {
    if (!content || content.trim() === '' || content.toLowerCase().includes('n/a')) return null;
    return (
        <div className="p-3 bg-gray-900/30 rounded-lg">
            <h5 className="font-semibold text-cyan-200">{title}</h5>
            <p className="text-xs text-gray-300 mt-1">{content}</p>
        </div>
    );
};

const VideoAnalysisResultDisplay: React.FC<{ result: MediaAnalysisResult }> = ({ result }) => {
    const resultRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={resultRef} className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6 animate-fade-in">
            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-cyan-300">گزارش تحلیل رسانه</h2>
                <ExportButton elementRef={resultRef} data={result} title="media_analysis" type="structured" disabled={false} />
            </div>

            {result.summary && <CollapsibleSection title="خلاصه محتوا">{result.summary}</CollapsibleSection>}
            {result.transcript && <CollapsibleSection title="متن کامل ویدئو">{result.transcript}</CollapsibleSection>}

            <div>
                <h3 className="text-lg font-semibold text-cyan-200 mb-3">تحلیل ادعاها و موضوعات</h3>
                <div className="space-y-4">
                    {result.analyzedClaims && result.analyzedClaims.map((claim, index) => (
                        <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <div className="flex justify-between items-start gap-4">
                                <p className="text-sm text-gray-200 flex-grow"><strong>ادعا:</strong> {claim.claimText}</p>
                                {claim.timestamp !== "N/A" && <span className="text-xs font-mono bg-gray-700 text-cyan-300 px-2 py-1 rounded-full">{claim.timestamp}</span>}
                            </div>
                            <div className="mt-3">
                                <div className="flex justify-between items-center mb-1 text-xs">
                                    <span className="text-gray-400">میزان اعتبار</span>
                                    <span className="font-bold text-cyan-200">{claim.credibility} / 100</span>
                                </div>
                                <CredibilityBar score={claim.credibility} />
                            </div>
                            <p className="text-xs text-gray-300 mt-3 border-l-2 border-cyan-500/50 pl-2">{claim.analysis}</p>
                        </div>
                    ))}
                    {(!result.analyzedClaims || result.analyzedClaims.length === 0) && <p className="text-sm text-gray-500">ادعای مشخصی برای تحلیل یافت نشد.</p>}
                </div>
            </div>

            <div>
                 <h3 className="text-lg font-semibold text-cyan-200 mb-3">نقد و بررسی</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CritiqueSection title="نقد منطقی" content={result.critique.logic} />
                    <CritiqueSection title="نقد علمی" content={result.critique.science} />
                    <CritiqueSection title="نقد استدلالی" content={result.critique.argumentation} />
                    <CritiqueSection title="نقد کلامی" content={result.critique.rhetoric} />
                    <CritiqueSection title="نقد دستوری" content={result.critique.grammar} />
                    <CritiqueSection title="نقد سندی" content={result.critique.evidence} />
                    <CritiqueSection title="نقد فلسفی" content={result.critique.philosophy} />
                 </div>
            </div>

            {result.groundingSources && result.groundingSources.length > 0 && (
                <div className="pt-4 border-t border-gray-700/50">
                    <h4 className="font-semibold text-cyan-200 text-sm">منابع جستجوی آنلاین (AI):</h4>
                    <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                    {result.groundingSources.map((source, i) => (
                        <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate" title={source.uri}>{source.title || "منبع بدون عنوان"}</a></li>
                    ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default VideoAnalysisResultDisplay;
