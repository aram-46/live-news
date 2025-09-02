
import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, StatisticsResult, ScientificArticleResult, Credibility, StanceHolder, ChartData } from '../types';
import { fetchStatistics, fetchScientificArticle, fetchReligiousText, generateEditableListItems } from '../services/geminiService';
import { SearchIcon, PlusIcon, TrashIcon, MagicIcon, LinkIcon, CheckCircleIcon, UserIcon, CalendarIcon, DocumentTextIcon, ThumbsUpIcon, ThumbsDownIcon, LightBulbIcon, ChartBarIcon, ChartLineIcon, ChartPieIcon, TableCellsIcon } from './icons';
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

const getCredibilityClass = (credibility?: Credibility | string) => {
    if (!credibility) return { dot: 'bg-gray-400', text: 'text-gray-300' };
    const credStr = credibility.toString();
    if (credStr.includes(Credibility.High)) return { dot: 'bg-green-400', text: 'text-green-300' };
    if (credStr.includes(Credibility.Medium)) return { dot: 'bg-yellow-400', text: 'text-yellow-300' };
    if (credStr.includes(Credibility.Low)) return { dot: 'bg-red-400', text: 'text-red-300' };
    return { dot: 'bg-gray-400', text: 'text-gray-300' };
};

const CredibilityBadge: React.FC<{ credibility: string }> = ({ credibility }) => {
    const { dot, text } = getCredibilityClass(credibility);
    return (
        <div className="flex items-center gap-1.5 text-xs bg-gray-900/50 px-2 py-1 rounded-full">
            <span className={`w-2 h-2 rounded-full ${dot}`}></span>
            <span className={text}>{credibility}</span>
        </div>
    );
};


const StructuredSearch: React.FC<StructuredSearchProps> = ({ searchType, settings, onOpenUrl, onSettingsChange }) => {
    const [query, setQuery] = useState('');
    const [comparisonItems, setComparisonItems] = useState<string[]>([]);
    const [currentComparison, setCurrentComparison] = useState('');
    const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<StatisticsResult | ScientificArticleResult | null>(null);
    const [isAiLoading, setIsAiLoading] = useState<string | null>(null);
    const [userSelectedChartType, setUserSelectedChartType] = useState<UserChartType | null>(null);
    const [lastQuery, setLastQuery] = useState('');
    const structuredResultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (result && 'chart' in result && result.chart) {
            setUserSelectedChartType(result.chart.type);
        } else {
            setUserSelectedChartType(null);
        }
    }, [result]);


    const getInstructionKey = () => {
        switch(searchType) {
            case 'stats': return 'statistics-search';
            case 'science': return 'science-search';
            case 'religion': return 'religion-search';
        }
    }

    const handleSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) return;
        setQuery(searchQuery);
        setIsLoading(true);
        setError(null);
        setResult(null);
        setLastQuery(searchQuery);

        try {
            let fullQuery = `موضوع اصلی: "${searchQuery}"`;
            if (comparisonItems.length > 0) {
                fullQuery += `. موارد برای مقایسه: "${comparisonItems.join(', ')}"`;
            }
            if (selectedDomains.length > 0) {
                fullQuery += `. حوزه‌ها: "${selectedDomains.join(', ')}"`;
            }
            if (selectedRegions.length > 0) {
                fullQuery += `. مناطق: "${selectedRegions.join(', ')}"`;
            }
            if (selectedSources.length > 0) {
                fullQuery += `. منابع: "${selectedSources.join(', ')}"`;
            }

            let apiResult;
            if (searchType === 'stats') {
                // FIX: Pass the correct instruction string from settings instead of the whole object.
                apiResult = await fetchStatistics(fullQuery, settings.aiInstructions['statistics-search']);
            } else if (searchType === 'science') {
                // FIX: Pass the correct instruction string from settings instead of the whole object.
                apiResult = await fetchScientificArticle(fullQuery, settings.aiInstructions['science-search']);
            } else if (searchType === 'religion') {
                // FIX: Pass the correct instruction string from settings instead of the whole object.
                apiResult = await fetchReligiousText(fullQuery, settings.aiInstructions['religion-search']);
            }
            setResult(apiResult);
        } catch (err) {
            console.error("Error during structured search:", err);
            setError("خطا در انجام جستجو. لطفا دوباره تلاش کنید.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateList = async (listType: 'structuredSearchDomains' | 'structuredSearchRegions' | 'structuredSearchSources') => {
        setIsAiLoading(listType);
        try {
            const currentItems = settings[listType];
            const listName = {
                structuredSearchDomains: 'حوزه‌های علمی/دینی/اقتصادی',
                structuredSearchRegions: 'مناطق جغرافیایی مهم',
                structuredSearchSources: 'منابع معتبر آماری/علمی/دینی'
            }[listType];

            // FIX: Removed extra 'settings' argument from the function call.
            const newItems = await generateEditableListItems(listName, currentItems);
            
            const updatedItems = [...new Set([...currentItems, ...newItems])];
            onSettingsChange({ ...settings, [listType]: updatedItems });

        } catch (error) {
            console.error(`Failed to generate items for ${listType}`, error);
            alert(`خطا در تولید موارد برای ${listType}`);
        } finally {
            setIsAiLoading(null);
        }
    };

    const renderMultiSelect = (
        label: string, 
        options: string[], 
        selected: string[], 
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        listType: 'structuredSearchDomains' | 'structuredSearchRegions' | 'structuredSearchSources'
      ) => (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-cyan-300">{label}</label>
                <button type="button" onClick={() => handleGenerateList(listType)} disabled={isAiLoading === listType} className="text-purple-400 hover:text-purple-300 disabled:opacity-50" title="افزودن موارد جدید با هوش مصنوعی">
                    {isAiLoading === listType 
                        ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> 
                        : <MagicIcon className="w-4 h-4"/>
                    }
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => setter(s => s.includes(opt) ? s.filter(i => i !== opt) : [...s, opt])}
                        className={`px-3 py-1.5 text-xs rounded-full border-2 transition-colors ${
                            selected.includes(opt) 
                            ? 'bg-cyan-500/20 border-cyan-400 text-white' 
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
      );
    
    const ChartContainer: React.FC<{ chartData: ChartData }> = ({ chartData }) => {
        if (!userSelectedChartType) return null;
    
        const isPieDisabled = chartData.datasets.length > 1;
    
        const chartTypes: { id: UserChartType; icon: React.ReactNode; disabled?: boolean; title: string }[] = [
            { id: 'bar', icon: <ChartBarIcon className="w-5 h-5" />, title: "نمودار میله‌ای" },
            { id: 'line', icon: <ChartLineIcon className="w-5 h-5" />, title: "نمودار خطی" },
            { id: 'pie', icon: <ChartPieIcon className="w-5 h-5" />, disabled: isPieDisabled, title: isPieDisabled ? "نمودار دایره‌ای برای داده‌های چند بخشی مناسب نیست" : "نمودار دایره‌ای" },
            { id: 'table', icon: <TableCellsIcon className="w-5 h-5" />, title: "جدول" },
        ];
    
        const renderChart = () => {
            switch (userSelectedChartType) {
                case 'bar': return <BarChart data={chartData} />;
                case 'pie': return isPieDisabled ? <div className="flex items-center justify-center h-full text-sm text-gray-400">نمودار دایره‌ای برای این داده مناسب نیست.</div> : <PieChart data={chartData} />;
                case 'line': return <LineChart data={chartData} />;
                case 'table': return <TableChart data={chartData} />;
                default: return null;
            }
        };
    
        return (
            <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30 xl:row-span-2 flex flex-col justify-center min-h-[400px]">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-cyan-200 text-center flex-grow">{chartData.title}</h3>
                    <div className="flex items-center gap-1 p-1 bg-gray-900/50 rounded-lg border border-gray-700">
                        {chartTypes.map(ct => (
                            <button
                                key={ct.id}
                                onClick={() => !ct.disabled && setUserSelectedChartType(ct.id)}
                                disabled={ct.disabled}
                                title={ct.title}
                                className={`p-1.5 rounded-md transition-colors ${
                                    userSelectedChartType === ct.id
                                    ? 'bg-cyan-500/30 text-white'
                                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                {ct.icon}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={userSelectedChartType === 'table' ? 'h-auto flex-grow' : 'h-80 flex-grow'}>
                    {renderChart()}
                </div>
            </div>
        );
    };

    const renderResult = () => {
        if (!result) return null;
        const statsResult = result as StatisticsResult;
        const scientificResult = result as ScientificArticleResult;

        return (
             <div className="mt-8 space-y-6 animate-fade-in">
                {/* Header */}
                <div className="p-4 rounded-lg border border-cyan-400/20 bg-black/20">
                    <h2 className="text-2xl font-bold text-cyan-300 mb-2">{result.title}</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {result.keywords.map(kw => <span key={kw} className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded-full">{kw}</span>)}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Left Column: Details & Analysis */}
                    <div className="space-y-6">
                        {/* Source Details */}
                        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                            <h4 className="font-semibold text-cyan-200 mb-3">جزئیات منبع</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2 col-span-full"><UserIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">منبع:</strong> <a href={result.sourceDetails.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{result.sourceDetails.name}</a></div>
                                <div className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">تاریخ:</strong> {result.sourceDetails.publicationDate}</div>
                                <div className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">مولف:</strong> {result.sourceDetails.author}</div>
                                {statsResult.sourceDetails?.methodology && <div className="flex items-center gap-2 col-span-full"><DocumentTextIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">متدولوژی:</strong> {statsResult.sourceDetails.methodology}</div>}
                                {statsResult.sourceDetails?.sampleSize && <div className="flex items-center gap-2"><DocumentTextIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">حجم نمونه:</strong> {statsResult.sourceDetails.sampleSize}</div>}
                                {scientificResult.sourceDetails?.researchType && <div className="flex items-center gap-2 col-span-full"><DocumentTextIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">نوع تحقیق:</strong> {scientificResult.sourceDetails.researchType}</div>}
                                <div className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">اعتبار:</strong> <CredibilityBadge credibility={result.sourceDetails.credibility} /></div>
                            </div>
                        </div>

                         {/* Analysis */}
                        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                            <h4 className="font-semibold text-cyan-200 mb-3">تحلیل و نظرات</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><h5 className="flex items-center gap-2 font-semibold text-green-300"><ThumbsUpIcon className="w-5 h-5"/>موافقین</h5>{result.analysis.proponents.map((p, i) => <div key={i} className="p-2 bg-green-900/30 rounded-md text-xs"><strong className="block text-green-200">{p.name}</strong><p className="text-gray-300">{p.argument}</p></div>)}{result.analysis.proponents.length === 0 && <p className="text-xs text-gray-500">موردی یافت نشد.</p>}</div>
                                <div className="space-y-2"><h5 className="flex items-center gap-2 font-semibold text-red-300"><ThumbsDownIcon className="w-5 h-5"/>مخالفین</h5>{result.analysis.opponents.map((o, i) => <div key={i} className="p-2 bg-red-900/30 rounded-md text-xs"><strong className="block text-red-200">{o.name}</strong><p className="text-gray-300">{o.argument}</p></div>)}{result.analysis.opponents.length === 0 && <p className="text-xs text-gray-500">موردی یافت نشد.</p>}</div>
                            </div>
                        </div>
                    </div>
                    {/* Right Column: Chart */}
                    {searchType === 'stats' && statsResult.chart && (
                        <ChartContainer chartData={statsResult.chart} />
                    )}
                </div>

                {/* Further Reading */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.references?.length > 0 && <div><h5 className="font-semibold text-cyan-200 mb-2">منابع مرتبط</h5><ul className="space-y-2">{result.references.map((s, i) => <li key={i}><button onClick={() => onOpenUrl(s.url)} className="flex items-center gap-2 text-sm text-blue-400 hover:underline p-2 bg-gray-800/30 rounded-md w-full text-right"><LinkIcon className="w-4 h-4 flex-shrink-0" /><span className="truncate">{s.title}</span></button></li>)}</ul></div>}
                    <div/>
                </div>
                <Suggestions 
                    suggestions={result.relatedSuggestions}
                    onSuggestionClick={handleSearch}
                />
             </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">موضوع اصلی</label>
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="موضوع اصلی را وارد کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">موارد برای مقایسه (اختیاری)</label>
                    <div className="flex gap-2">
                        <input type="text" value={currentComparison} onChange={e => setCurrentComparison(e.target.value)} placeholder="افزودن مورد..." className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                        <button onClick={() => { if(currentComparison.trim()) { setComparisonItems(s => [...s, currentComparison]); setCurrentComparison(''); } }} className="p-2.5 bg-cyan-600 rounded-lg text-black"><PlusIcon className="w-5 h-5"/></button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {comparisonItems.map(item => <div key={item} className="flex items-center gap-1 bg-gray-700 text-xs px-2 py-1 rounded-full">{item} <button onClick={() => setComparisonItems(s => s.filter(i => i !== item))}><TrashIcon className="w-3 h-3 text-red-400"/></button></div>)}
                    </div>
                </div>
                 {renderMultiSelect('حوزه', settings.structuredSearchDomains, selectedDomains, setSelectedDomains, 'structuredSearchDomains')}
                 {renderMultiSelect('منطقه', settings.structuredSearchRegions, selectedRegions, setSelectedRegions, 'structuredSearchRegions')}
                 {renderMultiSelect('منبع', settings.structuredSearchSources, selectedSources, setSelectedSources, 'structuredSearchSources')}
                 <button onClick={() => handleSearch(query)} disabled={isLoading || !query.trim()} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                    {isLoading ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <SearchIcon className="w-5 h-5"/>}
                    <span>{isLoading ? 'در حال جستجو...' : 'جستجو'}</span>
                </button>
            </div>
            <div className="lg:col-span-2" ref={structuredResultRef}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-300 animate-fade-in">
                        {lastQuery && `نتایج برای: `} <span className="text-cyan-300">"{lastQuery}"</span>
                    </h2>
                    {result && (
                        <ExportButton
                            elementRef={structuredResultRef}
                            data={result}
                            title={lastQuery}
                            type="structured"
                            disabled={isLoading || !result}
                        />
                    )}
                </div>
                {isLoading && <LoadingSkeleton />}
                {error && <div className="flex items-center justify-center h-full p-6 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300"><p>{error}</p></div>}
                {!isLoading && !error && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>برای شروع، موضوع مورد نظر خود را در پنل جستجو وارد کنید.</p></div>}
                {result && renderResult()}
            </div>
        </div>
    );
};

export default StructuredSearch;
