import React, { useState, useCallback } from 'react';
import { AppSettings, ResearchResult } from '../types';
import { generateResearchKeywords, fetchResearchData } from '../services/geminiService';
import { BeakerIcon, MagicIcon, TrashIcon, SearchIcon } from './icons';
import ResearchResultDisplay from './ResearchResultDisplay';
import StatisticalResearch from './StatisticalResearch';

type ResearchTab = 'general' | 'statistical';

const Research: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<ResearchTab>('statistical');
    
    // State for General Research
    const [topic, setTopic] = useState('');
    const [field, setField] = useState('');
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
            const newKeywords = await generateResearchKeywords(topic, field, settings);
            setKeywords(prev => [...new Set([...prev, ...newKeywords])]);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'خطا در تولید کلمات کلیدی.');
        } finally {
            setIsKeywordsLoading(false);
        }
    }, [topic, field, settings]);

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await fetchResearchData(topic, field, keywords, settings);
            setResult(res);
        } catch (err) {
             setError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات تحقیق.');
        } finally {
            setIsLoading(false);
        }
    }, [topic, field, keywords, settings]);


    const renderTabButton = (tabId: ResearchTab, label: string) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
                activeTab === tabId
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-3"><BeakerIcon className="w-6 h-6"/>پنل تحقیقات</h2>
                 <div className="flex border-b border-cyan-400/20">
                    {renderTabButton('general', 'تحقیقات عمومی')}
                    {renderTabButton('statistical', 'تحقیقات آماری')}
                </div>
            </div>

            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                        <form onSubmit={handleSearch} className="space-y-4">
                            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="موضوع تحقیق..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                            <input value={field} onChange={e => setField(e.target.value)} placeholder="حوزه (مثلا: پزشکی)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                            
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-cyan-300">کلمات کلیدی (اختیاری)</label>
                                    <button type="button" onClick={handleGenerateKeywords} disabled={isKeywordsLoading || !topic.trim()} className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 disabled:opacity-50">
                                        {isKeywordsLoading ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <MagicIcon className="w-4 h-4" />}
                                        <span>تولید خودکار</span>
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/50 rounded-lg">
                                    {keywords.map((kw, i) => (
                                        <div key={i} className="flex items-center gap-1 bg-gray-700 text-xs px-2 py-1 rounded-full">
                                            {kw} 
                                            <button type="button" onClick={() => setKeywords(k => k.filter((_, idx) => idx !== i))}>
                                                <TrashIcon className="w-3 h-3 text-red-400 hover:text-red-300"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <button type="submit" disabled={isLoading || !topic.trim()} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg disabled:bg-cyan-800 disabled:cursor-not-allowed">
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                        <span>در حال تحقیق...</span>
                                    </>
                                ) : (
                                    <>
                                        <SearchIcon className="w-5 h-5"/>
                                        <span>تحقیق کن</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                     <div className="lg:col-span-2">
                        {isLoading && <div className="p-6 bg-black/20 rounded-2xl animate-pulse h-96"></div>}
                        {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                        {result && <ResearchResultDisplay result={result} topic={topic} />}
                    </div>
                </div>
            )}

            {activeTab === 'statistical' && <StatisticalResearch settings={settings} />}
        </div>
    );
};

export default Research;
