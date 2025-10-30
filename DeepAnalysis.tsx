import React, { useState, useRef } from 'react';
import { AppSettings, MediaFile, AnalysisResult, FallacyResult, AnalyzerTabId, analyzerTabLabels, AIInstructionType } from '../types';
import { analyzeContentDeeply, findFallacies } from '../services/geminiService';
import { saveHistoryItem } from '../services/historyService';
import { SearchIcon, UploadIcon, CloseIcon } from './icons';
import DeepAnalysisResultDisplay from './AnalysisResult';
import MediaAnalyzer from './MediaAnalyzer';

interface DeepAnalysisProps {
  settings: AppSettings;
  activeAnalysisTab: Exclude<AnalyzerTabId, 'media'>;
}

const DeepAnalysis: React.FC<DeepAnalysisProps> = ({ settings, activeAnalysisTab }) => {
    const [topic, setTopic] = useState('');
    const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | FallacyResult | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = (e.target?.result as string).split(',')[1];
            setMediaFile({ name: file.name, type: file.type, data: base64Data, url: URL.createObjectURL(file) });
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() && !mediaFile) {
            setError("لطفا یک موضوع یا یک فایل برای تحلیل وارد کنید.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const fileData = mediaFile ? { data: mediaFile.data, mimeType: mediaFile.type } : null;
            let apiResult;
            
            const isFallacyFinder = activeAnalysisTab === 'fallacy-finder';
            const instructionKey = isFallacyFinder 
                ? 'analyzer-fallacy-finder' 
                : `analyzer-${activeAnalysisTab}` as AIInstructionType;
            
            const instruction = settings.aiInstructions[instructionKey] || `You are an expert ${analyzerTabLabels[activeAnalysisTab]} analyst.`;

            if (isFallacyFinder) {
                apiResult = await findFallacies(topic, fileData, instruction, settings);
            } else {
                apiResult = await analyzeContentDeeply(topic, fileData, instruction, settings, instructionKey);
            }
            setResult(apiResult);
            const summary = isFallacyFinder 
                ? `${(apiResult as FallacyResult).identifiedFallacies.length} مغالطه شناسایی شد.`
                : `تحلیل انجام شد. ${(apiResult as AnalysisResult).proponentPercentage}% موافق.`;

            saveHistoryItem({
                type: isFallacyFinder ? 'analyzer-fallacy-finder' : `analyzer-${activeAnalysisTab}`,
                query: topic || (mediaFile ? mediaFile.name : `تحلیل ${analyzerTabLabels[activeAnalysisTab]}`),
                resultSummary: summary,
                data: apiResult,
            });
        } catch (err: any) {
            console.error(err);
            setError(err.message || "خطا در انجام تحلیل. لطفا دوباره تلاش کنید.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const resetInputs = () => {
        setMediaFile(null);
        setTopic('');
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <form onSubmit={handleAnalyze} className="space-y-4">
                    <h3 className="text-lg font-semibold text-cyan-200">ورودی تحلیلگر {analyzerTabLabels[activeAnalysisTab]}</h3>
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        rows={6}
                        placeholder={`موضوع، متن، یا ادعای مورد نظر برای ${analyzerTabLabels[activeAnalysisTab]} را اینجا وارد کنید...`}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*, .txt, .md"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        <UploadIcon className="w-5 h-5"/> ضمیمه فایل (اختیاری)
                    </button>

                    {mediaFile && (
                        <div className="p-2 bg-gray-900/50 rounded-lg flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-400 truncate">فایل: {mediaFile.name}</p>
                            <button type="button" onClick={resetInputs}><CloseIcon className="w-4 h-4 text-gray-500 hover:text-white"/></button>
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition"
                    >
                        {isLoading ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <SearchIcon className="w-5 h-5"/>}
                        {isLoading ? 'در حال تحلیل...' : 'شروع تحلیل'}
                    </button>
                </form>
            </div>
            <div className="lg:col-span-2">
                {isLoading && <div className="p-6 bg-black/20 rounded-2xl border border-cyan-400/10 animate-pulse h-96"></div>}
                {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                {!isLoading && !error && !result && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج تحلیل عمیق شما در اینجا نمایش داده خواهد شد.</p></div>}
                {result && <DeepAnalysisResultDisplay result={result} />}
            </div>
        </div>
    );
};

export default DeepAnalysis;