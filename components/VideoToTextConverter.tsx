
import React, { useState } from 'react';
import { AppSettings, VideoFactCheckResult, VideoTimestampResult } from '../types';
import { analyzeVideoFromUrl } from '../services/geminiService';
import { LinkIcon, CheckCircleIcon, CloseIcon, SearchIcon } from './icons';

interface VideoToTextConverterProps {
    settings: AppSettings;
    onOpenUrl: (url: string) => void;
}

type AnalysisType = 'summary' | 'analysis' | 'fact-check' | 'timestamp';

const LoadingSkeleton = () => (
    <div className="p-6 bg-black/20 rounded-2xl border border-cyan-400/10 animate-pulse space-y-4">
        <div className="h-6 bg-gray-700/50 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700/50 rounded w-full"></div>
        <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
        <div className="h-32 bg-gray-700/50 rounded w-full mt-4"></div>
    </div>
);

const VideoToTextConverter: React.FC<VideoToTextConverterProps> = ({ settings, onOpenUrl }) => {
    const [videoUrl, setVideoUrl] = useState('');
    const [analysisType, setAnalysisType] = useState<AnalysisType>('summary');
    const [keywords, setKeywords] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);

    const handleAnalyze = async () => {
        if (!videoUrl.trim()) {
            setError('لطفا آدرس لینک ویدئو را وارد کنید.');
            return;
        }
        if (analysisType === 'timestamp' && !keywords.trim()) {
            setError('لطفا کلمات کلیدی مورد نظر برای جستجو را وارد کنید.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            // FIX: Pass the correct instruction string from settings instead of the whole object.
            const apiResult = await analyzeVideoFromUrl(videoUrl, analysisType, keywords, settings.aiInstructions['video-converter']);
            setResult(apiResult);
        } catch (err) {
            console.error("Error during video analysis:", err);
            setError("خطا در تحلیل ویدئو. لطفا از معتبر بودن لینک و دسترسی عمومی آن اطمینان حاصل کنید.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const analysisOptions: { id: AnalysisType; label: string; description: string }[] = [
        { id: 'summary', label: 'خلاصه', description: 'ارائه یک خلاصه از ویدئو در چند خط.' },
        { id: 'analysis', label: 'تحلیل جامع', description: 'بررسی و تحلیل موضوعات و ادعاهای مطرح شده در ویدئو.' },
        { id: 'fact-check', label: 'راستی‌آزمایی عمیق', description: 'تحلیل منطقی ادعاها و بررسی اعتبار اسناد ارائه شده.' },
        { id: 'timestamp', label: 'یافتن کلمات کلیدی', description: 'پیدا کردن زمان دقیق بیان کلمات یا عبارات در ویدئو.' },
    ];
    
    const renderResult = () => {
        if (!result) return null;

        switch (analysisType) {
            case 'summary':
            case 'analysis':
                return (
                     <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700 space-y-2">
                        <h3 className="font-semibold text-cyan-200">{analysisType === 'summary' ? 'خلاصه ویدئو' : 'گزارش تحلیلی'}</h3>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{result.summary || result.comprehensiveReport || 'نتیجه‌ای یافت نشد.'}</p>
                    </div>
                );
            case 'fact-check':
                const factCheckResult = result as VideoFactCheckResult;
                return (
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-800/30 border border-gray-700 rounded-lg">
                            <h3 className="font-semibold text-cyan-200">نتیجه کلی: <span className="text-white">{factCheckResult.overallVerdict}</span></h3>
                        </div>
                        {factCheckResult.claims.map((claim, index) => (
                            <div key={index} className="p-4 bg-black/20 border border-cyan-400/10 rounded-lg space-y-3">
                                <p className="font-semibold text-gray-200">ادعای شماره {index + 1}: <span className="font-normal">"{claim.claimText}"</span></p>
                                <p className="text-xs text-gray-400 border-l-2 border-cyan-500 pl-2"><strong>تحلیل منطقی:</strong> {claim.analysis}</p>
                                {claim.evidence.map((ev, evIndex) => (
                                     <div key={evIndex} className="p-2 bg-gray-800/40 rounded-md text-xs space-y-1">
                                        <p><strong>مدرک:</strong> "{ev.evidenceText}"</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                            <span className={`flex items-center gap-1 ${ev.isReal ? 'text-green-400' : 'text-red-400'}`}>{ev.isReal ? <CheckCircleIcon className="w-4 h-4"/> : <CloseIcon className="w-4 h-4"/>} واقعی</span>
                                            <span className={`flex items-center gap-1 ${ev.isCredible ? 'text-green-400' : 'text-red-400'}`}>{ev.isCredible ? <CheckCircleIcon className="w-4 h-4"/> : <CloseIcon className="w-4 h-4"/>} معتبر</span>
                                            <span className={`flex items-center gap-1 ${ev.isRelevant ? 'text-green-400' : 'text-red-400'}`}>{ev.isRelevant ? <CheckCircleIcon className="w-4 h-4"/> : <CloseIcon className="w-4 h-4"/>} مرتبط</span>
                                            {ev.sourceLink && <a href={ev.sourceLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline"><LinkIcon className="w-3 h-3"/> مشاهده منبع</a>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                );
            case 'timestamp':
                 const timestampResult = result as VideoTimestampResult;
                 return (
                    <div className="p-4 bg-gray-800/30 border border-gray-700 rounded-lg space-y-3">
                        {timestampResult.found ? (
                            <>
                                <h3 className="font-semibold text-green-300 flex items-center gap-2"><CheckCircleIcon className="w-5 h-5"/> کلمات کلیدی یافت شدند:</h3>
                                <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-cyan-200 uppercase bg-gray-900/50"><tr><th className="px-2 py-1">زمان</th><th className="px-2 py-1">جمله یافت شده</th></tr></thead>
                                    <tbody>
                                    {timestampResult.timestamps.map((ts, index) => (
                                        <tr key={index} className="border-b border-gray-700/50">
                                            <td className="p-2 font-mono text-cyan-300">{ts.timestamp}</td>
                                            <td className="p-2 text-gray-300">"{ts.sentence}"</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                </div>
                            </>
                        ) : (
                             <h3 className="font-semibold text-red-300 flex items-center gap-2"><CloseIcon className="w-5 h-5"/> کلمات کلیدی مورد نظر در ویدئو یافت نشدند.</h3>
                        )}
                    </div>
                 );
            default: return null;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">لینک ویدئو</label>
                    <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://example.com/video.mp4" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">هدف تحلیل</label>
                    <div className="space-y-2">
                        {analysisOptions.map(opt => (
                            <label key={opt.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-700/50 has-[:checked]:bg-cyan-500/10 has-[:checked]:border-cyan-400 border border-transparent">
                                <input type="radio" name="analysisType" value={opt.id} checked={analysisType === opt.id} onChange={() => setAnalysisType(opt.id)} className="mt-1 w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500" />
                                <div>
                                    <span className="font-semibold text-gray-200">{opt.label}</span>
                                    <p className="text-xs text-gray-400">{opt.description}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {analysisType === 'timestamp' && (
                    <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-cyan-300 mb-2">کلمات/عبارات برای جستجو</label>
                        <textarea value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="هر کلمه یا عبارت را با کاما (,) جدا کنید" rows={3} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                )}
                 <button onClick={handleAnalyze} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                    {isLoading ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <SearchIcon className="w-5 h-5"/>}
                    <span>{isLoading ? 'در حال تحلیل...' : 'شروع تحلیل'}</span>
                </button>
            </div>
             <div className="lg:col-span-2 space-y-4">
                 {isLoading && <LoadingSkeleton />}
                 {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                 {!isLoading && !error && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>برای شروع، لینک ویدئو و هدف تحلیل را مشخص کنید.</p></div>}
                 {result && <div className="animate-fade-in">{renderResult()}</div>}
             </div>
        </div>
    );
};

export default VideoToTextConverter;
