import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, StatisticsResult, ScientificArticleResult, Credibility, StanceHolder, ChartData } from '../types';
import { fetchStatistics, fetchScientificArticle, fetchReligiousText, generateContextualFilters } from '../services/geminiService';
import { SearchIcon, MagicIcon, LinkIcon, CheckCircleIcon, DocumentTextIcon, ThumbsUpIcon, ThumbsDownIcon, LightBulbIcon, ChartBarIcon, ChartLineIcon, ChartPieIcon, TableCellsIcon } from './icons';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import LineChart from './charts/LineChart';
import TableChart from './charts/TableChart';
import ExportButton from './ExportButton';
import Suggestions from './Suggestions';

type SearchType = 'stats' | 'science' | 'religion';
type UserChartType = 'bar' | 'pie' | 'line' | 'table';

interface StructuredSearchProps {
    searchType: SearchType;
    settings: AppSettings;
    onOpenUrl: (url: string) => void;
    onSettingsChange: (settings: AppSettings) => void;
}

const LoadingSkeleton = () => (
    <div className="p-6 bg-black/20 rounded-2xl border border-cyan-400/10 animate-pulse space-y-4">
      <div className="h-8 bg-gray-700/50 rounded w-3/4"></div>
      <div className="h-4 bg-gray-700/50 rounded w-full"></div>
      <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
      <div className="h-64 bg-gray-700/50 rounded w-full mt-6"></div>
    </div>
);

const getCredibilityClass = (credibility: Credibility | string | null | undefined) => {
    if (credibility == null || credibility === '') {
        return { dot: 'bg-gray-400', text: 'text-gray-300' };
    }
    const credStr = String(credibility);
    if (credStr.includes(Credibility.High)) return { dot: 'bg-green-400', text: 'text-green-300' };
    if (credStr.includes(Credibility.Medium)) return { dot: 'bg-yellow-400', text: 'text-yellow-300' };
    if (credStr.includes(Credibility.Low)) return { dot: 'bg-red-400', text: 'text-red-300' };
    return { dot: 'bg-gray-400', text: 'text-gray-300' };
};

const TagButton: React.FC<{ label: string; isSelected: boolean; onClick: () => void; }> = ({ label, isSelected, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1.5 text-xs rounded-full border-2 transition-colors ${
            isSelected 
            ? 'bg-cyan-500/20 border-cyan-400 text-white' 
            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
);

const StructuredSearch: React.FC<StructuredSearchProps> = ({ searchType, settings, onOpenUrl, onSettingsChange }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<StatisticsResult | ScientificArticleResult | null>(null);
    const [userChartType, setUserChartType] = useState<UserChartType | null>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    // State for Religion Search
    const [fields, setFields] = useState<string[]>([]);
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [regions, setRegions] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [sources, setSources] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [aiLoading, setAiLoading] = useState<'fields' | 'regions' | 'sources' | null>(null);
    

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            let apiResult;
            let fullQuery = query;
            if (searchType === 'religion') {
                 fullQuery = `موضوع: ${query}`;
                 if(selectedFields.length > 0) fullQuery += `\nحوزه: ${selectedFields.join(', ')}`;
                 if(selectedRegions.length > 0) fullQuery += `\nمنطقه: ${selectedRegions.join(', ')}`;
                 if(selectedSources.length > 0) fullQuery += `\nمنبع: ${selectedSources.join(', ')}`;
            }

            const instruction = settings.aiInstructions[`${searchType}-search`];

            if (searchType === 'stats') {
                apiResult = await fetchStatistics(fullQuery, instruction);
            } else if (searchType === 'science') {
                apiResult = await fetchScientificArticle(fullQuery, instruction);
            } else { // religion
                apiResult = await fetchReligiousText(fullQuery, instruction);
            }
            setResult(apiResult);
        } catch (err) {
            console.error(err);
            setError(`خطا در جستجو. لطفا دوباره تلاش کنید.`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateContextualFilters = async (listType: 'fields' | 'regions' | 'sources') => {
        if (!query.trim()) {
            alert('لطفا ابتدا موضوع اصلی را وارد کنید.');
            return;
        }
        setAiLoading(listType);
        try {
            const newItems = await generateContextualFilters(listType, {
                topic: query,
                fields: selectedFields,
                regions: selectedRegions,
            });

            if (listType === 'fields') setFields(prev => [...new Set([...prev, ...newItems])]);
            if (listType === 'regions') setRegions(prev => [...new Set([...prev, ...newItems])]);
            if (listType === 'sources') setSources(prev => [...new Set([...prev, ...newItems])]);
            
        } catch (error) {
            console.error(error);
        } finally {
            setAiLoading(null);
        }
    };
    
     const handleSelection = (
        item: string, 
        currentSelection: string[], 
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setter(
            currentSelection.includes(item)
            ? currentSelection.filter(i => i !== item)
            : [...currentSelection, item]
        );
     };

    const renderChart = (chartData: ChartData) => {
        const type = userChartType || chartData.type;
        switch (type) {
            case 'bar': return <BarChart data={chartData} />;
            case 'pie': return <PieChart data={chartData} />;
            case 'line': return <LineChart data={chartData} />;
            case 'table': return <TableChart data={chartData} />;
            default: return <p>نوع نمودار پشتیبانی نمی‌شود.</p>;
        }
    };

    const AiFilterSection: React.FC<{
        title: string;
        options: string[];
        selectedOptions: string[];
        onSelect: (item: string) => void;
        onGenerate: () => void;
        isLoading: boolean;
        isDisabled?: boolean;
    }> = ({ title, options, selectedOptions, onSelect, onGenerate, isLoading, isDisabled = false }) => (
        <div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <label className={`block text-sm font-medium ${isDisabled ? 'text-gray-500' : 'text-cyan-300'}`}>{title}</label>
                <button type="button" onClick={onGenerate} disabled={isLoading || isDisabled} className="text-purple-400 hover:text-purple-300 disabled:opacity-50" title="تولید خودکار گزینه‌ها با هوش مصنوعی">
                     {isLoading ? <svg className="animate-spin h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <MagicIcon className="w-4 h-4"/>}
                </button>
            </div>
            <div className={`flex flex-wrap gap-2 p-2 bg-gray-900/50 rounded-lg min-h-[40px] ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {options.map(opt => (
                    <TagButton key={opt} label={opt} isSelected={selectedOptions.includes(opt)} onClick={() => !isDisabled && onSelect(opt)} />
                ))}
                {options.length === 0 && <span className="text-xs text-gray-500 p-1">گزینه‌ای وجود ندارد.</span>}
            </div>
        </div>
    );
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <form onSubmit={handleSearch} className="space-y-6">
                     <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">موضوع اصلی</label>
                        <textarea value={query} onChange={e => setQuery(e.target.value)} rows={3} placeholder="موضوع مورد نظر برای تحقیق..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    </div>

                    {searchType === 'religion' ? (
                        <>
                           <AiFilterSection title="۱. حوزه" options={fields} selectedOptions={selectedFields} onSelect={(item) => handleSelection(item, selectedFields, setSelectedFields)} onGenerate={() => handleGenerateContextualFilters('fields')} isLoading={aiLoading === 'fields'} />
                           <AiFilterSection title="۲. منطقه" options={regions} selectedOptions={selectedRegions} onSelect={(item) => handleSelection(item, selectedRegions, setSelectedRegions)} onGenerate={() => handleGenerateContextualFilters('regions')} isLoading={aiLoading === 'regions'} isDisabled={selectedFields.length === 0} />
                           <AiFilterSection title="۳. منبع" options={sources} selectedOptions={selectedSources} onSelect={(item) => handleSelection(item, selectedSources, setSelectedSources)} onGenerate={() => handleGenerateContextualFilters('sources')} isLoading={aiLoading === 'sources'} isDisabled={selectedRegions.length === 0} />
                        </>
                    ) : (
                         <p className="text-xs text-gray-400">برای جستجو در آمار و مقالات علمی، موضوع را به طور دقیق وارد کرده و دکمه جستجو را بزنید.</p>
                    )}
                    
                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                        {isLoading ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <SearchIcon className="w-5 h-5"/>}
                        {isLoading ? 'در حال جستجو...' : 'جستجو'}
                    </button>
                </form>
            </div>
            <div className="lg:col-span-2 space-y-4">
                 <div className="flex justify-end h-10">
                    {result && <ExportButton elementRef={resultRef} data={result} title={query} type="structured" disabled={false} />}
                 </div>
                 <div ref={resultRef}>
                    {isLoading && <LoadingSkeleton />}
                    {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                    {!isLoading && !error && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج تحقیق شما در اینجا نمایش داده خواهد شد.</p></div>}
                    
                    {result && (
                         <div className="p-6 bg-black/30 rounded-2xl border border-cyan-400/20 space-y-6 animate-fade-in">
                            <h2 className="text-2xl font-bold text-cyan-300">{result.title}</h2>
                            <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
                            <div className="flex flex-wrap gap-2">{result.keywords.map(kw => <span key={kw} className="text-xs bg-gray-700 px-2 py-1 rounded-full">{kw}</span>)}</div>
                            
                            {'chart' in result && (
                                <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-center mb-4">
                                         <h3 className="font-semibold text-cyan-200">{result.chart.title}</h3>
                                         <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
                                            {(['bar', 'line', 'pie', 'table'] as const).map(type => (
                                                <button key={type} onClick={() => setUserChartType(type)} className={`p-1 rounded ${ (userChartType || result.chart.type) === type ? 'bg-cyan-500/20' : 'hover:bg-gray-700/50'}`}>
                                                    {type === 'bar' && <ChartBarIcon className="w-5 h-5"/>}
                                                    {type === 'line' && <ChartLineIcon className="w-5 h-5"/>}
                                                    {type === 'pie' && <ChartPieIcon className="w-5 h-5"/>}
                                                    {type === 'table' && <TableCellsIcon className="w-5 h-5"/>}
                                                </button>
                                            ))}
                                         </div>
                                    </div>
                                    <div className="h-[350px]">{renderChart(result.chart)}</div>
                                </div>
                            )}

                             {/* Source & Analysis */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-gray-800/30 rounded-lg space-y-2 text-sm">
                                     <h4 className="font-semibold text-cyan-200 mb-3 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5"/> جزئیات منبع</h4>
                                     <p><strong>نام:</strong> <a href={result.sourceDetails.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{result.sourceDetails.name}</a></p>
                                     <p><strong>نویسنده:</strong> {result.sourceDetails.author}</p>
                                     <p><strong>تاریخ انتشار:</strong> {result.sourceDetails.publicationDate}</p>
                                     <p className="flex items-center gap-2"><strong>اعتبار:</strong> <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-900/50 ${getCredibilityClass(result.sourceDetails.credibility).text}`}><span className={`w-2 h-2 rounded-full ${getCredibilityClass(result.sourceDetails.credibility).dot}`}></span>{result.sourceDetails.credibility || 'نامشخص'}</span></p>
                                </div>
                                <div className="p-4 bg-gray-800/30 rounded-lg space-y-2 text-sm">
                                    <h4 className="font-semibold text-cyan-200 mb-3">تحلیل</h4>
                                    <p><strong>میزان پذیرش:</strong> {result.analysis.acceptancePercentage}%</p>
                                    <p><strong>اعتبار فعلی:</strong> {result.analysis.currentValidity}</p>
                                    {result.analysis.alternativeResults && <p><strong>نتایج جایگزین:</strong> {result.analysis.alternativeResults}</p>}
                                </div>
                            </div>

                             {result.groundingSources && result.groundingSources.length > 0 && (
                                <div className="pt-3 border-t border-gray-700/50">
                                    <h4 className="font-semibold text-cyan-200 text-sm">منابع جستجوی آنلاین (AI):</h4>
                                    <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                                    {result.groundingSources.map((source, i) => (
                                        <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate" title={source.uri}>{source.title || "منبع بدون عنوان"}</a></li>
                                    ))}
                                    </ul>
                                </div>
                            )}
                            
                            <Suggestions suggestions={result.relatedSuggestions} onSuggestionClick={(q) => { setQuery(q); handleSearch(); }}/>

                         </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default StructuredSearch;