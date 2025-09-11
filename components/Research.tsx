import React, { useState, useCallback } from 'react';
import { AppSettings, ResearchResult } from '../types';
import { generateResearchKeywords, fetchResearchData } from '../services/geminiService';
import { SearchIcon, MagicIcon, TrashIcon, BeakerIcon } from './icons';
import ResearchResultDisplay from './ResearchResultDisplay';

const DOMAINS = ['پزشکی', 'علوم انسانی', 'علوم اجتماعی', 'روانشناسی', 'مطالعات دینی', 'فیزیک', 'علوم کامپیوتر', 'اقتصاد', 'علوم سیاسی', 'عمومی'];

const Research: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [topic, setTopic] = useState('');
    const [selectedDomain, setSelectedDomain] = useState<string>(DOMAINS[0]);
    const [keywords, setKeywords] = useState<string[]>([]);
    
    const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ResearchResult | null>(null);

    const handleGenerateKeywords = useCallback(async () => {
        if (!topic.trim()) {
            alert('لطفاً ابتدا موضوع اصلی را وارد کنید.');
            return;
        }
        setIsKeywordsLoading(true);
        try {
            const newKeywords = await generateResearchKeywords(topic, selectedDomain);
            setKeywords(prev => [...new Set([...prev, ...newKeywords])]);
        } catch (err) {
            console.error(err);
            alert('خطا در تولید کلمات کلیدی.');
        } finally {
            setIsKeywordsLoading(false);
        }
    }, [topic, selectedDomain]);

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const apiResult = await fetchResearchData(topic, selectedDomain, keywords);
            setResult(apiResult);
        } catch (err) {
            console.error("Error during research:", err);
            setError("خطا در انجام تحقیق. لطفا دوباره تلاش کنید.");
        } finally {
            setIsLoading(false);
        }
    }, [topic, selectedDomain, keywords, settings.aiInstructions]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-3"><BeakerIcon className="w-6 h-6"/>پنل تحقیقات</h2>
                <form onSubmit={handleSearch} className="space-y-4">
                    <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="موضوع تحقیق..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">حوزه تحقیق</label>
                        <div className="flex flex-wrap gap-2">
                             {DOMAINS.map(domain => (
                                <button key={domain} type="button" onClick={() => setSelectedDomain(domain)}
                                    className={`px-3 py-1.5 text-xs rounded-full border-2 transition-colors ${selectedDomain === domain ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                                >{domain}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-medium text-cyan-300">کلمات کلیدی (اختیاری)</label>
                             <button type="button" onClick={handleGenerateKeywords} disabled={isKeywordsLoading} className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 disabled:opacity-50">
                                {isKeywordsLoading ? <svg className="animate-spin h-4 w-4" /> : <MagicIcon className="w-4 h-4" />}
                                <span>تولید با AI</span>
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/50 rounded-lg">
                            {keywords.map((kw, i) => <div key={i} className="flex items-center gap-1 bg-gray-700 text-xs px-2 py-1 rounded-full">{kw} <button type="button" onClick={() => setKeywords(k => k.filter((_, idx) => idx !== i))}><TrashIcon className="w-3 h-3 text-red-400"/></button></div>)}
                        </div>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                        {isLoading ? <svg className="animate-spin h-5 w-5" /> : <SearchIcon className="w-5 h-5"/>}
                        <span>{isLoading ? 'در حال تحقیق...' : 'شروع تحقیق'}</span>
                    </button>
                </form>
            </div>
            <div className="lg:col-span-2">
                {isLoading && <div className="p-6 bg-black/20 rounded-2xl border border-cyan-400/10 animate-pulse h-96"></div>}
                {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                {!isLoading && !error && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج تحقیق شما در اینجا نمایش داده خواهد شد.</p></div>}
                {result && <ResearchResultDisplay result={result} topic={topic} />}
            </div>
        </div>
    );
};
export default Research;
