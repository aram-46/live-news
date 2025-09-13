
import React, { useState } from 'react';
import { AppSettings, ResearchResult } from '../types';
import { generateResearchKeywords, fetchResearchData } from '../services/geminiService';
// FIX: Add missing icon import.
import { BeakerIcon } from './icons';
import ResearchResultDisplay from './ResearchResultDisplay';
import StatisticalResearch from './StatisticalResearch';

type ResearchTab = 'general' | 'statistical';

const Research: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<ResearchTab>('general');
    
    // State for General Research
    const [topic, setTopic] = useState('');
    const [field, setField] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ResearchResult | null>(null);
    
    // ... other handlers for general research ...

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
                // This is the original content of Research.tsx
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                        <form onSubmit={async (e) => { e.preventDefault(); setIsLoading(true); setError(null); setResult(null); try { 
                            // FIX: Pass settings as the fourth argument.
                            const res = await fetchResearchData(topic, field, keywords, settings); setResult(res); } catch (err) { setError('Error fetching data'); } finally { setIsLoading(false); } }} className="space-y-4">
                            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="موضوع تحقیق..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                             <input value={field} onChange={e => setField(e.target.value)} placeholder="حوزه (مثلا: پزشکی)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                             <button type="submit" disabled={isLoading} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg">تحقیق کن</button>
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
