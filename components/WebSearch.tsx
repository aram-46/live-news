

import React, { useState, useCallback, useRef } from 'react';
import { AppSettings, Filters, WebResult, GroundingSource, SearchTab } from '../types';
import { fetchWebResults } from '../services/geminiService';
import FilterPanel from './FilterPanel';
import { LinkIcon, NewsIcon, ClipboardIcon, CheckCircleIcon } from './icons';
import ExportButton from './ExportButton';
import Suggestions from './Suggestions';

interface WebResultCardProps {
    result: WebResult;
    onOpenUrl: (url: string) => void;
}

const WebResultCard: React.FC<WebResultCardProps> = ({ result, onOpenUrl }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopyLink = () => {
        navigator.clipboard.writeText(result.link);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <article className="bg-black/20 backdrop-blur-lg rounded-xl border border-cyan-400/10 p-4 flex gap-4 transition-all duration-300 hover:border-cyan-400/30 hover:bg-black/30">
            {result.imageUrl ? (
                <img src={result.imageUrl} alt={result.title} className="w-24 h-24 object-cover rounded-lg flex-shrink-0 bg-gray-800" onError={(e) => e.currentTarget.style.display = 'none'} />
            ) : (
                <div className="w-24 h-24 flex-shrink-0 bg-gray-800 rounded-lg flex items-center justify-center">
                    <NewsIcon className="w-10 h-10 text-gray-600" />
                </div>
            )}
            <div className="flex flex-col flex-grow">
                <h3 className="text-base font-bold text-cyan-200 hover:text-white transition-colors">
                    <button onClick={() => onOpenUrl(result.link)}>{result.title}</button>
                </h3>
                <span className="text-xs text-purple-300 mb-1">{result.source}</span>
                <p className="text-sm text-gray-300 leading-relaxed flex-grow">{result.description}</p>
                <div className="flex items-center gap-2 mt-2 self-start">
                    <button
                      onClick={() => onOpenUrl(result.link)}
                      className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-200 transition-colors text-xs"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>مشاهده</span>
                    </button>
                     <button onClick={handleCopyLink} className="p-1 rounded-md bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white" aria-label="کپی لینک">
                         {isCopied ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </article>
    );
}


const LoadingSkeleton: React.FC = () => (
    <div className="bg-black/20 rounded-xl border border-cyan-400/10 p-4 flex gap-4 animate-pulse">
      <div className="w-24 h-24 rounded-lg flex-shrink-0 bg-gray-700/50"></div>
      <div className="flex flex-col flex-grow gap-2">
        <div className="h-5 bg-gray-700/50 rounded w-3/4"></div>
        <div className="h-3 bg-gray-700/50 rounded w-1/4"></div>
        <div className="h-4 bg-gray-700/50 rounded w-full"></div>
        <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
      </div>
    </div>
  );


interface WebSearchProps {
    searchType: 'video' | 'audio' | 'book' | 'music' | 'dollar';
    settings: AppSettings;
    onOpenUrl: (url: string) => void;
    onSettingsChange: (settings: AppSettings) => void;
}

const WebSearch: React.FC<WebSearchProps> = ({ searchType, settings, onOpenUrl, onSettingsChange }) => {
    const [results, setResults] = useState<WebResult[]>([]);
    const [sources, setSources] = useState<GroundingSource[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastQuery, setLastQuery] = useState<string>('');
    const webResultsRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback(async (filters: Filters) => {
        setIsLoading(true);
        setError(null);
        setResults([]);
        setSources([]);
        setSuggestions([]);
        setLastQuery(filters.query);

        try {
            const instructionMap = {
                video: 'video-search',
                audio: 'audio-search',
                book: 'book-search',
                music: 'music-search',
                dollar: 'dollar-search'
            };
            const instruction = settings.aiInstructions[instructionMap[searchType]];
            const { results: apiResults, sources: apiSources, suggestions: apiSuggestions } = await fetchWebResults(searchType, filters, instruction);
            setResults(apiResults);
            setSources(apiSources);
            setSuggestions(apiSuggestions);
        } catch (err) {
            console.error(err);
            setError(`خطا در جستجو برای ${searchType}. لطفا دوباره تلاش کنید.`);
        } finally {
            setIsLoading(false);
        }
    }, [searchType, settings.aiInstructions]);

    const currentSearchOptions = settings.searchOptions[searchType];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <FilterPanel
                    onSearch={handleSearch}
                    isLoading={isLoading}
                    categories={currentSearchOptions.categories}
                    regions={currentSearchOptions.regions}
                    sources={currentSearchOptions.sources}
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                    searchType={searchType}
                />
            </div>
            <div className="lg:col-span-2" ref={webResultsRef}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-300 animate-fade-in">
                        {lastQuery && `نتایج برای: `} <span className="text-cyan-300">"{lastQuery}"</span>
                    </h2>
                    <ExportButton
                        elementRef={webResultsRef}
                        data={results}
                        title={lastQuery}
                        type="web"
                        disabled={isLoading || results.length === 0}
                    />
                </div>
                <div className="space-y-4">
                    {isLoading && Array.from({ length: 5 }).map((_, i) => <LoadingSkeleton key={i} />)}
                    
                    {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}

                    {!isLoading && !error && results.length === 0 && (
                        <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400">
                            <p>برای شروع، موضوع مورد نظر خود را در پنل جستجو وارد کنید.</p>
                        </div>
                    )}
                    
                    {results.map((result, index) => (
                        <WebResultCard key={`${result.link}-${index}`} result={result} onOpenUrl={onOpenUrl} />
                    ))}
                    
                    <Suggestions 
                      suggestions={suggestions} 
                      onSuggestionClick={(query) => handleSearch({ query, categories:[], regions:[], sources:[] })}
                    />

                    {sources.length > 0 && (
                        <div className="p-4 bg-black/20 rounded-lg border border-cyan-400/10 mt-6">
                            <h4 className="text-sm font-semibold text-cyan-300 mb-2">منابع استفاده شده توسط هوش مصنوعی:</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {sources.map((source, index) => (
                                    <li key={index} className="text-xs">
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate" title={source.uri}>
                                            {source.title || source.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WebSearch;
