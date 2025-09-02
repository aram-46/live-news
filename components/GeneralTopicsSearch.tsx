
import React, { useState, useCallback, useRef } from 'react';
import { AppSettings, GeneralTopicResult } from '../types';
import { generateKeywordsForTopic, fetchGeneralTopicAnalysis } from '../services/geminiService';
import { SearchIcon, MagicIcon, TrashIcon, LinkIcon, ThumbsUpIcon, ThumbsDownIcon } from './icons';
import ExportButton from './ExportButton';

interface GeneralTopicsSearchProps {
  settings: AppSettings;
  onOpenUrl: (url: string) => void;
  onSettingsChange: (settings: AppSettings) => void;
}

const LoadingSkeleton = () => (
    <div className="p-6 bg-black/20 rounded-2xl border border-cyan-400/10 animate-pulse space-y-4">
        <div className="h-8 bg-gray-700/50 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700/50 rounded w-full"></div>
        <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
        <div className="h-32 bg-gray-700/50 rounded w-full mt-4"></div>
    </div>
);

const GeneralTopicsSearch: React.FC<GeneralTopicsSearchProps> = ({ settings, onOpenUrl, onSettingsChange }) => {
    const [mainTopic, setMainTopic] = useState('');
    const [comparisonTopic, setComparisonTopic] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
    const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GeneralTopicResult | null>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    const handleGenerateKeywords = useCallback(async () => {
        if (!mainTopic.trim()) {
            alert('لطفاً ابتدا موضوع اصلی را وارد کنید.');
            return;
        }
        setIsKeywordsLoading(true);
        try {
            // FIX: Removed extra 'settings' argument from the function call.
            const newKeywords = await generateKeywordsForTopic(mainTopic, comparisonTopic);
            setKeywords(prev => [...new Set([...prev, ...newKeywords])]);
        } catch (err) {
            console.error(err);
            alert('خطا در تولید کلمات کلیدی.');
        } finally {
            setIsKeywordsLoading(false);
        }
    }, [mainTopic, comparisonTopic, settings]);

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mainTopic.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const instructions = settings.aiInstructions['general-topics'];
            const apiResult = await fetchGeneralTopicAnalysis(mainTopic, comparisonTopic, keywords, selectedDomains, instructions);
            setResult(apiResult);
        } catch (err) {
            console.error("Error during general topic search:", err);
            setError("خطا در انجام جستجو. لطفا دوباره تلاش کنید.");
        } finally {
            setIsLoading(false);
        }
    }, [mainTopic, comparisonTopic, keywords, selectedDomains, settings.aiInstructions]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <h2 className="text-xl font-bold text-cyan-300">جستجو در موضوعات عمومی</h2>
                <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">موضوع اصلی</label>
                        <textarea value={mainTopic} onChange={e => setMainTopic(e.target.value)} rows={3} placeholder="موضوعی که می‌خواهید درباره آن تحقیق کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">موضوع مقایسه‌ای (اختیاری)</label>
                        <textarea value={comparisonTopic} onChange={e => setComparisonTopic(e.target.value)} rows={2} placeholder="موضوع دوم برای مقایسه..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-medium text-cyan-300">کلمات کلیدی</label>
                             <button type="button" onClick={handleGenerateKeywords} disabled={isKeywordsLoading} className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 disabled:opacity-50">
                                {isKeywordsLoading ? <svg className="animate-spin h-4 w-4" /> : <MagicIcon className="w-4 h-4" />}
                                <span>تولید با AI</span>
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/50 rounded-lg">
                            {keywords.map((kw, i) => <div key={i} className="flex items-center gap-1 bg-gray-700 text-xs px-2 py-1 rounded-full">{kw} <button type="button" onClick={() => setKeywords(k => k.filter((_, idx) => idx !== i))}><TrashIcon className="w-3 h-3 text-red-400"/></button></div>)}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">حوزه‌ها (اختیاری)</label>
                        <div className="flex flex-wrap gap-2">
                             {settings.generalTopicDomains.map(opt => (
                                <button key={opt} type="button" onClick={() => setSelectedDomains(s => s.includes(opt) ? s.filter(i => i !== opt) : [...s, opt])}
                                    className={`px-3 py-1.5 text-xs rounded-full border-2 transition-colors ${selectedDomains.includes(opt) ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                                >{opt}</button>
                            ))}
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                        {isLoading ? <svg className="animate-spin h-5 w-5" /> : <SearchIcon className="w-5 h-5"/>}
                        <span>{isLoading ? 'در حال تحقیق...' : 'تحقیق کن'}</span>
                    </button>
                </form>
            </div>
            <div className="lg:col-span-2">
                <div className="flex justify-end mb-4 h-10">
                    {result && (
                        <ExportButton
                            elementRef={resultRef}
                            data={result}
                            title={mainTopic}
                            type="general_topic"
                            disabled={isLoading || !result}
                        />
                    )}
                </div>
                <div ref={resultRef}>
                    {isLoading && <LoadingSkeleton />}
                    {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                    {!isLoading && !error && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج تحقیق شما در اینجا نمایش داده خواهد شد.</p></div>}
                    {result && (
                        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6 animate-fade-in">
                            <h2 className="text-2xl font-bold text-cyan-300 mb-2">{result.title}</h2>
                            <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>

                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">نکات کلیدی</h3>
                                {result.keyPoints.map((point, i) => (
                                    <div key={i} className="p-3 bg-gray-800/50 rounded-lg">
                                        <h4 className="font-bold text-cyan-300">{point.title}</h4>
                                        <p className="text-sm text-gray-300 mt-1">{point.description}</p>
                                    </div>
                                ))}
                            </div>

                            {result.comparison && (
                                <div className="space-y-3">
                                     <h3 className="text-lg font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">تحلیل مقایسه‌ای</h3>
                                     <div className="overflow-x-auto">
                                         <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-600">
                                                    <th className="p-2 text-right text-gray-400">جنبه مقایسه</th>
                                                    <th className="p-2 text-right text-green-300 flex items-center gap-2"><ThumbsUpIcon className="w-4 h-4"/> {result.comparison.topicA}</th>
                                                    <th className="p-2 text-right text-red-300 flex items-center gap-2"><ThumbsDownIcon className="w-4 h-4"/> {result.comparison.topicB}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.comparison.points.map((p, i) => (
                                                    <tr key={i} className="border-b border-gray-700/50">
                                                        <td className="p-2 font-bold text-cyan-300 align-top">{p.aspect}</td>
                                                        <td className="p-2 text-gray-300 align-top">{p.analysisA}</td>
                                                        <td className="p-2 text-gray-300 align-top">{p.analysisB}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                         </table>
                                     </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-lg font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">منابع</h3>
                                <ul className="list-disc list-inside space-y-1 mt-2">
                                    {result.sources.map((s, i) => <li key={i}><a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline">{s.title || s.uri}</a></li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeneralTopicsSearch;
