import React, { useRef, useState } from 'react';
import { StatisticalResearchResult, AnalysisStance, ChartData } from '../types';
import { ThumbsUpIcon, ThumbsDownIcon, CircleIcon, LinkIcon, DocumentTextIcon, UsersIcon, ClipboardListIcon, VariableIcon, ShieldCheckIcon, ScaleIcon, ChartBarIcon, ChartPieIcon, ChartLineIcon, TableCellsIcon } from './icons';
import ExportButton from './ExportButton';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import LineChart from './charts/LineChart';
import TableChart from './charts/TableChart';

const StanceView: React.FC<{ title: string; icon: React.ReactNode; stances: AnalysisStance[]; className: string }> = ({ title, icon, stances, className }) => (
    <div className="space-y-2">
        <h5 className={`flex items-center gap-2 font-semibold ${className}`}>{icon}{title}</h5>
        {stances && stances.length > 0 ? stances.map((s, i) => (
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

const MetricCard: React.FC<{ icon: React.ReactNode, title: string, value: string | number, unit?: string, description?: string, themeClass: string }> = ({ icon, title, value, unit, description, themeClass }) => (
    <div className={`metric-card p-4 rounded-xl shadow-xl ${themeClass}`}>
        <div className="metric-card-inner h-full flex flex-col justify-between">
            <div className="flex items-center gap-2 metric-title-container">
                <div className="metric-icon">{icon}</div>
                <h4 className="text-sm font-semibold">{title}</h4>
            </div>
            <div className="text-center my-2">
                <span className="metric-value text-3xl font-bold">{value}</span>
                {unit && <span className="metric-unit text-lg ml-1">{unit}</span>}
            </div>
            {description && <p className="text-xs text-gray-400 text-center">{description}</p>}
        </div>
    </div>
);

const StatisticalResearchResultDisplay: React.FC<{ result: StatisticalResearchResult; topic: string; }> = ({ result, topic }) => {
    const resultRef = useRef<HTMLDivElement>(null);
    const [chartTab, setChartTab] = useState(result.charts?.[0]?.type || 'bar');
    
    if (!result.validationMetrics) return <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">داده‌های دریافتی ناقص است و قابل نمایش نیست.</div>;

    const { validationMetrics, charts } = result;

    const chartToDisplay = charts.find(c => c.type === chartTab) || charts[0];

    return (
        <div ref={resultRef} className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8 animate-fade-in">
             <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-300 mb-2">نتایج تحقیق آماری: {topic}</h2>
                    <p className="italic text-gray-400 text-sm">"{result.understanding}"</p>
                </div>
                <ExportButton elementRef={resultRef} data={result} title={`stat-research-${topic}`} type="structured" disabled={false} />
            </div>

            <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-cyan-200 mb-2">خلاصه جامع</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
            </div>
            
            {/* Validation Metrics */}
            <div>
                <h3 className="text-lg font-semibold text-cyan-200 mb-4 text-center">اعتبارسنجی داده‌ها</h3>
                <div className="perspective-container grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard themeClass="metric-card-theme-cyan" icon={<ShieldCheckIcon className="w-5 h-5"/>} title="اعتبار آماری" value={validationMetrics.statisticalCredibilityScore} unit="/ 100" description={validationMetrics.credibilityValidation} />
                    <MetricCard themeClass="metric-card-theme-purple" icon={<DocumentTextIcon className="w-5 h-5"/>} title="اعتبار اسناد" value={validationMetrics.documentCredibility} description="ارزیابی کلی منابع" />
                    <MetricCard themeClass="metric-card-theme-green" icon={<UsersIcon className="w-5 h-5"/>} title="شرکت‌کنندگان" value={validationMetrics.participants} description="حجم نمونه یا جامعه آماری" />
                    <MetricCard themeClass="metric-card-theme-amber" icon={<ScaleIcon className="w-5 h-5"/>} title="اعتبار روش" value={validationMetrics.methodCredibilityPercentage} unit="%" description={validationMetrics.statisticalMethod} />
                </div>
            </div>

            {/* Charts */}
            {charts && charts.length > 0 && (
                <div className="chart-container-shiny p-4 bg-gray-900/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-cyan-200">{chartToDisplay?.title}</h3>
                        <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
                            {charts.map(chart => (
                                <button key={chart.type} onClick={() => setChartTab(chart.type)} className={`p-1 rounded ${chartTab === chart.type ? 'bg-cyan-500/20' : 'hover:bg-gray-700/50'}`}>
                                    {chart.type === 'bar' && <ChartBarIcon className="w-5 h-5"/>}
                                    {chart.type === 'line' && <ChartLineIcon className="w-5 h-5"/>}
                                    {chart.type === 'pie' && <ChartPieIcon className="w-5 h-5"/>}
                                    {chart.type === 'table' && <TableCellsIcon className="w-5 h-5"/>}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[350px]">
                        {chartToDisplay.type === 'bar' && <BarChart data={chartToDisplay} />}
                        {chartToDisplay.type === 'pie' && <PieChart data={chartToDisplay} />}
                        {chartToDisplay.type === 'line' && <LineChart data={chartToDisplay} />}
                        {chartToDisplay.type === 'table' && <TableChart data={chartToDisplay} />}
                    </div>
                </div>
            )}
            
            {/* Viewpoints */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <StanceView title="دیدگاه موافقین" icon={<ThumbsUpIcon className="w-5 h-5"/>} stances={result.proponents} className="text-green-300" />
                 <StanceView title="دیدگاه مخالفین" icon={<ThumbsDownIcon className="w-5 h-5"/>} stances={result.opponents} className="text-red-300" />
                 <StanceView title="دیدگاه بی‌طرف" icon={<CircleIcon className="w-5 h-5"/>} stances={result.neutral} className="text-gray-300" />
            </div>

            {/* Sources */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-700">
                <div>
                    <h4 className="font-semibold text-cyan-200 mb-2 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5"/>منابع آکادمیک</h4>
                    <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {result.academicSources.map((s, i) => <li key={i} className="text-sm">
                            <a href={s.link} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-400 hover:underline">{s.title}</a>
                            <p className="text-xs text-gray-400 mt-1">{s.snippet}</p>
                        </li>)}
                    </ul>
                </div>
                <div>
                     <h4 className="font-semibold text-cyan-200 mb-2 flex items-center gap-2"><LinkIcon className="w-5 h-5"/>موضوعات مرتبط</h4>
                     <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                         {result.relatedTopics.map((s, i) => <li key={i}><a href={s.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:underline"><span className="truncate">{s.title}</span></a></li>)}
                     </ul>
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

export default StatisticalResearchResultDisplay;