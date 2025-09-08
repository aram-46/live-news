import React, { useState, useCallback, useRef } from 'react';
import { AppSettings, DeepAnalysisSource } from '../types';
import { generateKeywordsForAnalysis, performDeepAnalysis } from '../services/geminiService';
import { BrainIcon, MagicIcon, SearchIcon, TrashIcon, LinkIcon, ThumbsUpIcon, ThumbsDownIcon } from './icons';

interface DeepAnalysisProps {
    settings: AppSettings;
}

const DeepAnalysisResultCard: React.FC<{ source: DeepAnalysisSource }> = ({ source }) => {
    const credibilityColor = source.credibilityPercentage > 75 ? 'text-green-400' : source.credibilityPercentage > 50 ? 'text-yellow-400' : 'text-red-400';
    
    return (
        <div className="p-4 bg-gray-900/50 rounded-lg border border-cyan-400/10 space-y-4">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <a href={source.link} target="_blank" rel="noopener noreferrer" className="font-bold text-cyan-300 hover:underline">{source.sourceName}</a>
                    <p className="text-xs text-gray-400">{source.collectionMethod}</p>
                </div>
                <div className={`text-sm font-bold ${credibilityColor}`}>{source.credibilityPercentage}% اعتبار</div>
            </div>

            <div>
                <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                    <span className="text-green-300">موافقین</span>
                    <span className="text-red-300">مخالفین</span>
                </div>
                <div className="w-full bg-red-500/30 rounded-full h-2.5 flex overflow-hidden">
                    <div className="bg-green-500 h-2.5" style={{width: `${source.proponentPercentage}%`}}></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-2 bg-green-900/20 rounded">
                    <h5 className="font-semibold text-green-300 mb-1 flex items-center gap-1"><ThumbsUpIcon className="w-4 h-4"/> خلاصه موافقین</h5>
                    <p className="text-gray-300 leading-relaxed">{source.proponentSummary}</p>
                    <p className="mt-2 text-gray-400"><strong>اعتبار استدلال:</strong> {source.proponentCredibility}</p>
                </div>
                 <div className="p-2 bg-red-900/20 rounded">
                    <h5 className="font-semibold text-red-300 mb-1 flex items-center gap-1"><ThumbsDownIcon className="w-4 h-4"/> خلاصه مخالفین</h5>
                    <p className="text-gray-300 leading-relaxed">{source.opponentSummary}</p>
                    <p className="mt-2 text-gray-400"><strong>اعتبار استدلال:</strong> {source.opponentCredibility}</p>
                </div>
            </div>
             <a href={source.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 bg-blue-900/50 hover:bg-blue-800/50 px-3 py-1.5 rounded-md">
                <LinkIcon className="w-4 h-4" />
                مشاهده مستقیم منبع
            </a>
        </div>
    );
};

const LoadingSkeleton: React.FC = () => (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-cyan-400/10 space-y-4 animate-pulse">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-2"><div className="h-5 bg-gray-700/50 rounded w-48"></div><div className="h-3 bg-gray-700/50 rounded w-32"></div></div>
        <div className="h-5 bg-gray-700/50 rounded w-16"></div>
      </div>
      <div className="h-2.5 bg-gray-700/50 rounded-full"></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-20 bg-gray-700/50 rounded"></div>
        <div className="h-20 bg-gray-700/50 rounded"></div>
      </div>
    </div>
);


const DeepAnalysis: React.FC<DeepAnalysisProps> = ({ settings }) => {
    const [topic, setTopic] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [manualKeyword, setManualKeyword] = useState('');
    const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
    
    const [results, setResults] = useState<DeepAnalysisSource[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateKeywords = useCallback(async () => {
        if (!topic.trim()) return;
        setIsKeywordsLoading(true);
        try {
            const newKeywords = await generateKeywordsForAnalysis(topic);
            setKeywords(prev => [...new Set([...prev, ...newKeywords])]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsKeywordsLoading(false);
        }
    }, [topic]);

    const handleAddKeyword = () => {
        if (manualKeyword.trim() && !keywords.includes(manualKeyword.trim())) {
            setKeywords(prev => [...prev, manualKeyword.trim()]);
            setManualKeyword('');
        }
    };

    const handleAnalyze = async () => {
        if (!topic.trim()) return;
        setIsLoading(true);
        setError(null);
        setResults([]);
        try {
            const analysisResults = await performDeepAnalysis(topic, keywords, settings.aiInstructions['deep-analysis']);
            setResults(analysisResults);
        } catch (err) {
            console.error(err);
            setError("خطا در انجام تحلیل عمیق. لطفا دوباره تلاش کنید.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Control Panel */}
            <div className="lg:col-span-1 space-y-6">
                 <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <label className="block text-sm font-medium text-cyan-300 mb-2">۱. موضوع تحقیق</label>
                    <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="موضوع اصلی برای تحلیل عمیق را وارد کنید..." className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                </div>
                 <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-cyan-300">۲. کلمات کلیدی (انگلیسی)</label>
                        <button onClick={handleGenerateKeywords} disabled={isKeywordsLoading || !topic.trim()} className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 disabled:opacity-50">
                           {isKeywordsLoading ? <svg className="animate-spin h-4 w-4" /> : <MagicIcon className="w-4 h-4" />} <span>تولید با AI</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/50 rounded-lg">
                        {keywords.map((kw, i) => <div key={i} className="flex items-center gap-1 bg-gray-700 text-xs px-2 py-1 rounded-full">{kw} <button type="button" onClick={() => setKeywords(k => k.filter((_, idx) => idx !== i))}><TrashIcon className="w-3 h-3 text-red-400"/></button></div>)}
                    </div>
                     <div className="flex gap-2">
                        <input value={manualKeyword} onChange={e => setManualKeyword(e.target.value)} onKeyDown={e => {if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword();}}} placeholder="افزودن دستی..." className="flex-grow bg-gray-900/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm"/>
                        <button onClick={handleAddKeyword} className="p-2 bg-cyan-600 rounded-lg">+</button>
                    </div>
                </div>
                <button onClick={handleAnalyze} disabled={isLoading || !topic.trim()} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                    {isLoading ? <svg className="animate-spin h-5 w-5" /> : <SearchIcon className="w-5 h-5" />}
                    <span>{isLoading ? 'در حال تحلیل...' : '۳. شروع تحلیل عمیق'}</span>
                </button>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2 space-y-4">
                 {isLoading && Array.from({length: 3}).map((_, i) => <LoadingSkeleton key={i} />)}
                 {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                 {!isLoading && !error && results.length === 0 && (
                    <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400">
                        <p>نتایج تحلیل عمیق شما در اینجا نمایش داده خواهد شد.</p>
                    </div>
                 )}
                 {results.map((source, i) => <DeepAnalysisResultCard key={i} source={source} />)}
            </div>
        </div>
    );
};

export default DeepAnalysis;