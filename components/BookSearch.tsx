import React, { useState, useCallback, useRef } from 'react';
import { AppSettings, BookResult } from '../types';
import { fetchBookResults } from '../services/geminiService';
import { saveHistoryItem } from '../services/historyService';
import { SearchIcon, MagicIcon, BookOpenIcon, DownloadIcon, FilePdfIcon, FileWordIcon } from './icons';
import ExportButton from './ExportButton';

const BookResultCard: React.FC<{ result: BookResult }> = ({ result }) => {
    const getFormatIcon = (format: string) => {
        const lowerFormat = format.toLowerCase();
        if (lowerFormat.includes('pdf')) return <FilePdfIcon className="w-4 h-4 text-red-400" />;
        if (lowerFormat.includes('docx')) return <FileWordIcon className="w-4 h-4 text-blue-400" />;
        return <DownloadIcon className="w-4 h-4 text-gray-400" />;
    };

    return (
        <article className="p-4 bg-black/20 backdrop-blur-lg rounded-xl border border-cyan-400/10 flex flex-col sm:flex-row gap-4 transition-all duration-300 hover:border-cyan-400/30">
            {result.imageUrl ? (
                <img src={result.imageUrl} alt={result.title} className="w-full sm:w-28 h-40 object-cover rounded-lg flex-shrink-0 bg-gray-800" onError={(e) => (e.currentTarget.style.display = 'none')} />
            ) : (
                <div className="w-full sm:w-28 h-40 flex-shrink-0 bg-gray-800 rounded-lg flex items-center justify-center">
                    <BookOpenIcon className="w-12 h-12 text-gray-600" />
                </div>
            )}
            <div className="flex flex-col flex-grow">
                <h3 className="text-base font-bold text-cyan-200">{result.title}</h3>
                <div className="text-xs text-gray-400 mb-2">
                    <span>{result.authors?.join(', ')}</span>
                    {result.publicationYear && <span> &bull; {result.publicationYear}</span>}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed flex-grow mb-3">{result.summary}</p>
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-cyan-300">لینک‌های دانلود ({result.source}):</h4>
                    <div className="flex flex-wrap gap-2">
                        {result.downloadLinks && result.downloadLinks.length > 0 ? (
                            result.downloadLinks.map((link, index) => (
                                <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors">
                                    {getFormatIcon(link.format)}
                                    <span>{link.format.toUpperCase()}</span>
                                </a>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500">لینک دانلودی یافت نشد.</p>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
};

const LoadingSkeleton: React.FC = () => (
    <div className="p-4 bg-black/20 rounded-xl border border-cyan-400/10 flex gap-4 animate-pulse">
        <div className="w-28 h-40 rounded-lg flex-shrink-0 bg-gray-700/50"></div>
        <div className="flex flex-col flex-grow gap-3">
            <div className="h-5 bg-gray-700/50 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700/50 rounded w-1/4"></div>
            <div className="h-4 bg-gray-700/50 rounded w-full"></div>
            <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
            <div className="h-8 bg-gray-700/50 rounded w-1/2 mt-2"></div>
        </div>
    </div>
);

const CheckboxFilter: React.FC<{ label: string; options: string[]; selected: string[]; onChange: (value: string) => void; }> = ({ label, options, selected, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-cyan-300 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
            {options.map(opt => (
                <button key={opt} type="button" onClick={() => onChange(opt)} className={`px-3 py-1.5 text-xs rounded-full border-2 transition-colors ${selected.includes(opt) ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}>
                    {opt}
                </button>
            ))}
        </div>
    </div>
);

const BookSearch: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [query, setQuery] = useState('');
    const [formats, setFormats] = useState<string[]>(['PDF']);
    const [contentTypes, setContentTypes] = useState<string[]>(['Book']);
    const [languages, setLanguages] = useState<string[]>(['Persian']);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<BookResult[]>([]);
    const resultsRef = useRef<HTMLDivElement>(null);

    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
        setter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
    };

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        try {
            const apiResults = await fetchBookResults(query, formats, contentTypes, languages, settings.aiInstructions['book-search'], settings);
            setResults(apiResults);
            saveHistoryItem({
                type: 'book-search',
                query,
                resultSummary: `${apiResults.length} کتاب/مقاله یافت شد.`,
                data: apiResults,
            });
        } catch (err) {
            console.error(err);
            setError("خطا در جستجوی کتاب. لطفاً دوباره تلاش کنید.");
        } finally {
            setIsLoading(false);
        }
    }, [query, formats, contentTypes, languages, settings]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-6">
                <form onSubmit={handleSearch} className="space-y-4">
                    <textarea value={query} onChange={e => setQuery(e.target.value)} rows={4} placeholder="نام کتاب، مقاله، نویسنده یا موضوع را وارد کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    <CheckboxFilter label="فرمت فایل" options={['PDF', 'EPUB', 'DOCX', 'MOBI']} selected={formats} onChange={(v) => handleFilterChange(setFormats, v)} />
                    <CheckboxFilter label="نوع محتوا" options={['کتاب', 'مقاله', 'تحقیق علمی', 'پایان‌نامه']} selected={contentTypes} onChange={(v) => handleFilterChange(setContentTypes, v)} />
                    <CheckboxFilter label="زبان" options={['فارسی', 'انگلیسی', 'عربی']} selected={languages} onChange={(v) => handleFilterChange(setLanguages, v)} />
                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold py-3 px-4 rounded-lg transition">
                        {isLoading ? <svg className="animate-spin h-5 w-5"/> : <SearchIcon className="w-5 h-5"/>}
                        <span>{isLoading ? 'در حال جستجو...' : 'جستجوی کتاب'}</span>
                    </button>
                </form>
            </div>
            <div className="lg:col-span-2">
                <div ref={resultsRef} className="space-y-4">
                    {isLoading && Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} />)}
                    {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
                    {!isLoading && !error && results.length === 0 && <div className="flex items-center justify-center h-full p-6 bg-gray-800/30 border border-gray-600/30 rounded-lg text-gray-400"><p>نتایج جستجوی کتاب و مقالات در اینجا نمایش داده خواهد شد.</p></div>}
                    {results.map((result, index) => <BookResultCard key={index} result={result} />)}
                </div>
            </div>
        </div>
    );
};

export default BookSearch;