import React, { useRef } from 'react';
import { ResearchResult, AnalysisStance } from '../types';
import { ThumbsUpIcon, ThumbsDownIcon, CircleIcon, LinkIcon, DocumentTextIcon } from './icons';
import ExportButton from './ExportButton';

// Reusing StanceView from AnalysisResultDisplay would be ideal, but for simplicity and to avoid cross-component dependency hell, I'll redefine it here with minor tweaks.
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


const ResearchResultDisplay: React.FC<{ result: ResearchResult; topic: string; }> = ({ result, topic }) => {
    const resultRef = useRef<HTMLDivElement>(null);
    const { proponentPercentage = 0, opponentPercentage = 0, neutralPercentage = 0 } = result.viewpointDistribution || {};
    
    return (
        <div ref={resultRef} className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6 animate-fade-in">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-300 mb-2">نتایج تحقیق: {topic}</h2>
                    <p className="italic text-gray-400 text-sm">"{result.understanding}"</p>
                </div>
                <ExportButton elementRef={resultRef} data={result} title={`research-${topic}`} type="structured" disabled={false} />
            </div>

            <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-cyan-200 mb-2">خلاصه جامع و بی‌طرفانه</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{result.comprehensiveSummary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-800/30 rounded-lg space-y-3">
                    <h4 className="font-semibold text-cyan-200">میزان اعتبار کلی اطلاعات</h4>
                    <div className="w-full bg-gray-700 rounded-full h-4">
                        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full text-center text-xs text-white font-bold" style={{ width: `${result.credibilityScore || 0}%` }}>
                            {result.credibilityScore || 0}%
                        </div>
                    </div>
                </div>
                 <div className="p-4 bg-gray-800/30 rounded-lg space-y-3">
                    <h4 className="font-semibold text-cyan-200">توزیع دیدگاه‌ها</h4>
                     <div className="w-full bg-gray-700 rounded-full h-4 flex overflow-hidden">
                        <div className="bg-green-500 h-4" style={{width: `${proponentPercentage}%`}} title={`موافق: ${proponentPercentage}%`}></div>
                        <div className="bg-red-500 h-4" style={{width: `${opponentPercentage}%`}} title={`مخالف: ${opponentPercentage}%`}></div>
                        <div className="bg-gray-400 h-4" style={{width: `${neutralPercentage}%`}} title={`بی‌طرف: ${neutralPercentage}%`}></div>
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <StanceView title="دیدگاه موافقین" icon={<ThumbsUpIcon className="w-5 h-5"/>} stances={result.proponents || []} className="text-green-300" />
                 <StanceView title="دیدگاه بی‌طرف" icon={<CircleIcon className="w-5 h-5"/>} stances={result.neutral || []} className="text-gray-300" />
                 <StanceView title="دیدگاه مخالفین" icon={<ThumbsDownIcon className="w-5 h-5"/>} stances={result.opponents || []} className="text-red-300" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-700">
                <div>
                    <h4 className="font-semibold text-cyan-200 mb-2 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5"/>منابع آکادمیک و دانشگاهی</h4>
                    <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {(result.academicSources || []).map((s, i) => <li key={i} className="text-sm">
                            <a href={s.link} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-400 hover:underline">{s.title}</a>
                            <p className="text-xs text-gray-400 mt-1">{s.snippet}</p>
                        </li>)}
                        {(!result.academicSources || result.academicSources.length === 0) && <p className="text-xs text-gray-500">منبع آکادمیک مشخصی یافت نشد.</p>}
                    </ul>
                </div>
                <div>
                     <h4 className="font-semibold text-cyan-200 mb-2 flex items-center gap-2"><LinkIcon className="w-5 h-5"/>منابع وب</h4>
                     <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                         {(result.webSources || []).map((s, i) => <li key={i}><a href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:underline"><span className="truncate">{s.title || s.uri}</span></a></li>)}
                         {(!result.webSources || result.webSources.length === 0) && <p className="text-xs text-gray-500">منبع وبی یافت نشد.</p>}
                     </ul>
                </div>
            </div>

        </div>
    );
};

export default ResearchResultDisplay;