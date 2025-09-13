import React, { useState, useCallback } from 'react';
import { AppSettings, StatisticalResearchResult } from '../types';
import { generateResearchKeywords, fetchStatisticalResearch } from '../services/geminiService';
import { SearchIcon, MagicIcon, TrashIcon } from './icons';
import StatisticalResearchResultDisplay from './StatisticalResearchResultDisplay';

const StatisticalResearch: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [mainTopic, setMainTopic] = useState('');
    const [comparisonTopic1, setComparisonTopic1] = useState('');
    const [comparisonTopic2, setComparisonTopic2] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    
    const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<StatisticalResearchResult | null>(null);

    const handleGenerateKeywords = useCallback(async () => {
        if (!mainTopic.trim()) {
            alert('لطفاً ابتدا موضوع اصلی را وارد کنید.');
            return;
        }
        setIsKeywordsLoading(true);
        try {
            const newKeywords = await generateResearchKeywords(mainTopic, '', settings);
            setKeywords(prev => [...new Set([...prev, ...newKeywords])]);
        } catch (err) {
            console.error(err);
            alert('خطا در تولید کلمات کلیدی.');
        } finally {
            setIsKeywordsLoading(false);
        }
    }, [mainTopic, settings]);

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mainTopic.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const comparisonTopics = [comparisonTopic1, comparisonTopic2].filter(t => t.trim() !== '');
            const apiResult = await fetchStatisticalResearch(mainTopic, comparisonTopics, keywords, settings);
            setResult(apiResult);
        } catch (err) {
            console.error("Error during statistical research:", err);
            setError("خطا در انجام تحقیق آماری. لطفا دوباره تلاش کنید.");
        } finally {
            setIsLoading(false);
        }
    }, [mainTopic, comparisonTopic1, comparisonTopic2, keywords, settings]);

    return (
        <div className="space-y-8">
            <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <textarea value={mainTopic} onChange={e => setMainTopic(e.target.value)} rows={3} placeholder="موضوع اصلی برای تحقیق آماری..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5 md:col-span-3"/>
                        <input value={comparisonTopic1} onChange={e => setComparisonTopic1(e.target.value)} placeholder="موضوع اول برای مقایسه (اختیاری)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                        <input value={comparisonTopic2} onChange={e => setComparisonTopic2(e.target.value)} placeholder="موضوع دوم برای مقایسه (اختیاری)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-medium text-cyan-300">کلمات کلیدی</label>
                             <button type="button" onClick={handleGenerateKeywords} disabled={isKeywordsLoading} className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 disabled:opacity-50">
                                {isKeywordsLoading ? <svg className="animate-spin h-4 w-4" /> : <MagicIcon className="w-4 h-4" />}
                                <span>تولید خودکار</span>
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/50 rounded-lg">
                            {keywords.map((kw, i) => <div key={i} className="flex items-center gap-1 bg-gray-700 text-xs px-2 py-1 rounded-full">{kw} <button type="button" onClick={() => setKeywords(k => k.filter((_, idx) => idx !== i))}><TrashIcon className="w-3 h-3 text-red-400"/></button></div>)}
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                        {isLoading ? <svg className="animate-spin h-5 w-5" /> : <SearchIcon className="w-5 h-5"/>}
                        <span>{isLoading ? 'در حال تحقیق...' : 'تحلیل آماری'}</span>
                    </button>
                </form>
            </div>
             <div>
                {isLoading && <div className="p-6 bg-black/20 rounded-2xl border border-cyan-400/10 animate-pulse h-96"></div>}
                {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                {!isLoading && !error && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج تحقیق آماری شما در اینجا نمایش داده خواهد شد.</p></div>}
                {result && <StatisticalResearchResultDisplay result={result} topic={mainTopic} />}
            </div>
        </div>
    );
};
export default StatisticalResearch;