import React, { useState, useRef, useCallback } from 'react';
import { AppSettings, MediaFile, SiteValidationResult, ComparisonValidationResult, GroundingSource } from '../types';
import { SearchIcon, UploadIcon, CloseIcon, MagicIcon, LinkIcon, CheckCircleIcon, ShieldCheckIcon, UsersIcon, ScaleIcon, ClipboardListIcon } from './icons';
import { validateSite, validateArticleOrDoc, compareSites } from '../services/geminiService';
import { saveHistoryItem } from '../services/historyService';
import ExportButton from './ExportButton';
import RadarChart from './charts/RadarChart';

// --- Reusable & Helper Components ---

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

const SiteValidationResultDisplay: React.FC<{ result: SiteValidationResult, topic: string }> = ({ result, topic }) => {
    const resultRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={resultRef} className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8 animate-fade-in">
             <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-300 mb-2">نتایج اعتبارسنجی: {result.siteName}</h2>
                    <a href={result.mainUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">{result.mainUrl}</a>
                </div>
                <ExportButton elementRef={resultRef} data={result} title={`validation-${topic}`} type="structured" disabled={false} />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 perspective-container">
                 <MetricCard themeClass="metric-card-theme-cyan" icon={<ShieldCheckIcon className="w-5 h-5"/>} title="امتیاز اعتبار" value={result.credibilityScore} unit="/ 100" description="امتیاز کلی اعتبار سایت" />
                 <MetricCard themeClass="metric-card-theme-green" icon={<UsersIcon className="w-5 h-5"/>} title="تعداد کارشناسان" value={result.expertCount} description="تعداد متخصصین شناخته شده" />
                 {/* FIX: Added missing 'value' prop to the MetricCard component. */}
                 <MetricCard themeClass="metric-card-theme-amber" icon={<ClipboardListIcon className="w-5 h-5"/>} title="تعداد پروژه‌ها" value={result.totalProjects} description="تعداد پروژه‌های انجام شده" />
                 <MetricCard themeClass="metric-card-theme-purple" icon={<ScaleIcon className="w-5 h-5"/>} title="فاند خارجی" value={result.fundingSources.hasExternalFunding ? 'دارد' : 'ندارد'} />
            </div>
            <div className="space-y-4">
                <div className="p-3 bg-gray-800/40 rounded-lg">
                    <strong className="text-gray-400">تحلیل اعتبار: </strong>
                    <p className="text-sm text-gray-300 inline">{result.credibilityAnalysis}</p>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-lg">
                    <strong className="text-gray-400">تحلیل منابع مالی: </strong>
                    <p className="text-sm text-gray-300 inline">{result.fundingSources.analysis}</p>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-lg">
                    <strong className="text-gray-400">تحلیل پروژه‌های اسپانسری: </strong>
                    <p className="text-sm text-gray-300 inline">{result.sponsoredProjects.analysis}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-gray-800/40 rounded-lg">
                    <strong className="block text-gray-400">محل ثبت</strong>
                    <span className="text-gray-200">{result.registrationLocation}</span>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-lg">
                    <strong className="block text-gray-400">موسس</strong>
                    <span className="text-gray-200">{result.founder}</span>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-lg">
                    <strong className="block text-gray-400">حوزه کاری</strong>
                    <span className="text-gray-200">{result.fieldOfWork}</span>
                </div>
                 <div className="p-3 bg-gray-800/40 rounded-lg">
                    <strong className="block text-gray-400">وضعیت فعالیت</strong>
                    <span className={`text-gray-200 ${result.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {result.isActive ? 'فعال' : 'غیرفعال'} {result.lastActivityDate && `(${result.lastActivityDate})`}
                    </span>
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


const Validation: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    type ValidationTab = 'site' | 'article' | 'document' | 'comparison';
    const [activeTab, setActiveTab] = useState<ValidationTab>('site');
    
    // Shared state
    const [topic, setTopic] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [file, setFile] = useState<MediaFile | null>(null);
    
    // Comparison specific
    const [topicB, setTopicB] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SiteValidationResult | ComparisonValidationResult | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setTopic('');
        setTopicB('');
        setKeywords([]);
        setFile(null);
        setIsLoading(false);
        setIsKeywordsLoading(false);
        setError(null);
        setResult(null);
    };

    const handleTabChange = (tab: ValidationTab) => {
        setActiveTab(tab);
        resetState();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = (e.target?.result as string).split(',')[1];
            setFile({ name: selectedFile.name, type: selectedFile.type, data: base64Data, url: URL.createObjectURL(selectedFile) });
        };
        reader.readAsDataURL(selectedFile);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((activeTab !== 'comparison' && !topic.trim() && !file) || (activeTab === 'comparison' && (!topic.trim() || !topicB.trim()))) {
            setError('لطفا ورودی‌های لازم را تکمیل کنید.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setResult(null);
        
        try {
            let apiResult: SiteValidationResult | ComparisonValidationResult;
            if (activeTab === 'site') {
                apiResult = await validateSite(topic, keywords, settings);
            } else if (activeTab === 'article' || activeTab === 'document') {
                const fileData = file ? { data: file.data, mimeType: file.type } : null;
                apiResult = await validateArticleOrDoc(topic, fileData, activeTab, settings);
            } else { // comparison
                apiResult = await compareSites(topic, topicB, settings);
            }
            setResult(apiResult);
            saveHistoryItem({
                type: `validation-${activeTab}`,
                query: activeTab === 'comparison' ? `${topic} vs ${topicB}` : topic,
                resultSummary: 'اعتبارسنجی انجام شد.',
                data: apiResult
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در انجام اعتبارسنجی.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderInputSection = () => {
        const topicLabel = activeTab === 'site' ? 'نام یا آدرس سایت' : activeTab === 'article' ? 'نام یا آدرس مقاله' : activeTab === 'document' ? 'عنوان سند' : 'سایت/موسسه اول';
        
        return (
             <form onSubmit={handleSearch} className="space-y-4">
                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={2} placeholder={`${topicLabel}...`} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                {activeTab === 'comparison' && (
                     <textarea value={topicB} onChange={e => setTopicB(e.target.value)} rows={2} placeholder="سایت/موسسه دوم..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                )}
                {(activeTab === 'article' || activeTab === 'document') && (
                    <div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-sm p-2 bg-gray-700 rounded-lg flex items-center justify-center gap-2"><UploadIcon className="w-4 h-4"/> آپلود فایل</button>
                        {file && <div className="text-xs text-gray-400 mt-1">{file.name}</div>}
                    </div>
                )}
                <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg disabled:bg-cyan-800">
                    {isLoading ? <svg className="animate-spin h-5 w-5" /> : <SearchIcon className="w-5 h-5"/>}
                    {isLoading ? 'در حال اعتبارسنجی...' : 'شروع اعتبارسنجی'}
                </button>
             </form>
        );
    };
    
    return (
        <div className="space-y-6">
             <div className="flex border-b border-cyan-400/20 mb-6 overflow-x-auto">
                <button onClick={() => handleTabChange('site')} className={`px-4 py-2 text-sm ${activeTab === 'site' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400'}`}>اعتبارسنجی سایت</button>
                <button onClick={() => handleTabChange('article')} className={`px-4 py-2 text-sm ${activeTab === 'article' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400'}`}>اعتبارسنجی مقاله</button>
                <button onClick={() => handleTabChange('document')} className={`px-4 py-2 text-sm ${activeTab === 'document' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400'}`}>اعتبارسنجی سند</button>
                <button onClick={() => handleTabChange('comparison')} className={`px-4 py-2 text-sm ${activeTab === 'comparison' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400'}`}>مقایسه دو سایت</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
                    {renderInputSection()}
                </div>
                <div className="lg:col-span-2">
                    {isLoading && <div className="p-6 bg-black/20 rounded-2xl animate-pulse h-96"></div>}
                    {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                    {!isLoading && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج اعتبارسنجی در اینجا نمایش داده خواهد شد.</p></div>}
                    {result && activeTab === 'comparison' && (
                         <div className="space-y-8">
                             <SiteValidationResultDisplay result={(result as ComparisonValidationResult).siteA} topic={topic} />
                             <SiteValidationResultDisplay result={(result as ComparisonValidationResult).siteB} topic={topicB} />
                         </div>
                    )}
                    {result && activeTab !== 'comparison' && <SiteValidationResultDisplay result={result as SiteValidationResult} topic={topic} />}
                </div>
            </div>
        </div>
    );
};

export default Validation;