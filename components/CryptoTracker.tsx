import React, { useState, useEffect, useCallback, memo } from 'react';
import { AppSettings, CryptoCoin, SimpleCoin, CryptoSearchResult, CryptoAnalysisResult, Credibility } from '../types';
import { fetchCryptoData, fetchCoinList, searchCryptoCoin, fetchCryptoAnalysis } from '../services/geminiService';
import TradingViewWidget from './TradingViewWidget';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { StarIcon, SearchIcon, LinkIcon, ChartPieIcon, CheckCircleIcon } from './icons';

// --- TYPE DEFINITIONS ---
type CryptoTab = 'live' | 'favorites' | 'gainers' | 'losers' | 'newest' | 'search' | 'analysis';
type Timeframe = '1h' | '24h' | '7d' | '30d' | '1y';

// --- HELPER FUNCTIONS & CONSTANTS ---
const NEON_COLORS = ['#39ff14', '#fe019a', '#01fef4', '#f80000', '#fdf200'];
const TIMEFRAME_OPTIONS: { id: Timeframe, label: string }[] = [
    { id: '1h', label: '۱ ساعت' },
    { id: '24h', label: '۲۴ ساعت' },
    { id: '7d', label: '۷ روز' },
    { id: '30d', label: '۳۰ روز' },
    { id: '1y', label: '۱ سال' },
];

const getCredibilityClass = (credibility?: Credibility | string | null) => {
    if (credibility == null || credibility === '') return { dot: 'bg-gray-400' };
    const credStr = String(credibility);
    if (credStr.includes(Credibility.High)) return { dot: 'bg-green-400' };
    if (credStr.includes(Credibility.Medium)) return { dot: 'bg-yellow-400' };
    if (credStr.includes(Credibility.Low)) return { dot: 'bg-red-400' };
    return { dot: 'bg-gray-400' };
};

const formatPrice = (price?: number) => {
    if (typeof price !== 'number') {
        return 'N/A';
    }
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: price > 1 ? 2 : 8 });
};

const formatPercentage = (percentage: number) => {
    const isPositive = percentage >= 0;
    return (
        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
            {isPositive ? '▲' : '▼'} {Math.abs(percentage).toFixed(2)}%
        </span>
    );
};

// --- SUB-COMPONENTS ---

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; initialOpen?: boolean }> = ({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    return (
        <div className="border border-gray-700/50 rounded-lg">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-right bg-gray-800/40 hover:bg-gray-700/50 rounded-t-lg">
                <span className="font-semibold text-cyan-300">{title}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && <div className="p-4 space-y-4 text-sm text-gray-300">{children}</div>}
        </div>
    );
};

const LoadingRow: React.FC = () => (
    <tr className="border-b border-gray-700/50 animate-pulse">
        <td className="p-3"><div className="h-5 bg-gray-700/50 rounded"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-700/50 rounded"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-700/50 rounded"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-700/50 rounded"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-700/50 rounded"></div></td>
    </tr>
);

const CoinSelectionModal: React.FC<{
    allCoins: SimpleCoin[];
    favoriteIds: string[];
    onClose: () => void;
    onSave: (ids: string[]) => void;
}> = ({ allCoins, favoriteIds, onClose, onSave }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>(favoriteIds);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleFavorite = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const filteredCoins = allCoins.filter(coin => 
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-900 border border-cyan-400/30 rounded-lg shadow-2xl w-full max-w-md flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-cyan-300 p-4 border-b border-gray-700">افزودن به علاقه‌مندی‌ها</h3>
                <div className="p-4">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="جستجوی نام یا نماد ارز..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                </div>
                <div className="flex-grow overflow-y-auto px-4">
                    {filteredCoins.map(coin => (
                        <label key={coin.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800/50 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.includes(coin.id)} onChange={() => toggleFavorite(coin.id)} className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-cyan-500 focus:ring-cyan-600"/>
                            <span className="font-semibold">{coin.name}</span>
                            <span className="text-gray-400 uppercase">{coin.symbol}</span>
                        </label>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">انصراف</button>
                    <button onClick={() => { onSave(selectedIds); onClose(); }} className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 rounded-lg">ذخیره</button>
                </div>
            </div>
        </div>
    );
};

const SearchTabComponent: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<CryptoSearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await searchCryptoCoin(query, settings.aiInstructions['crypto-search'], settings);
            setResult(data);
        } catch (err) {
            setError('خطا در جستجوی ارز. لطفاً دوباره تلاش کنید.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-2">
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="نام ارز دیجیتال را وارد کنید (مثال: Bitcoin)" className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                <button type="submit" disabled={isLoading} className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold p-3 rounded-lg transition">
                    {isLoading ? <svg className="animate-spin h-5 w-5"/> : <SearchIcon className="w-5 h-5"/>}
                </button>
            </form>
            {isLoading && <div className="text-center p-4">در حال جستجو...</div>}
            {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
            {result && (
                <div className="space-y-4 animate-fade-in">
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-cyan-400/20 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="md:col-span-1 flex items-center gap-4">
                            {result.coin.image && <img src={result.coin.image} alt={result.coin.name} className="w-12 h-12"/>}
                            <div>
                                <h3 className="text-xl font-bold text-white">{result.coin.name}</h3>
                                <p className="text-gray-400 uppercase">{result.coin.symbol}</p>
                            </div>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4 text-center md:text-right">
                            <div>
                                <p className="text-sm text-gray-400">قیمت (دلار)</p>
                                <p className="text-lg font-mono font-bold text-white">${formatPrice(result.coin.price_usd)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">قیمت (تومان)</p>
                                <p className="text-lg font-mono font-bold text-white">{formatPrice(result.coin.price_toman)}</p>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <p className="text-sm text-gray-400">تغییر ۲۴ ساعته</p>
                                <p className="text-lg font-mono font-bold">{formatPercentage(result.coin.price_change_percentage_24h)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="font-semibold text-cyan-200 mb-2">خلاصه وضعیت</h4>
                        <p className="text-sm text-gray-300">{result.summary}</p>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="font-semibold text-cyan-200 mb-3">منابع قیمت</h4>
                        <ul className="space-y-2">
                            {result.sources.map((source, i) => (
                                <li key={i} className="flex items-center justify-between text-sm p-2 bg-gray-900/50 rounded-md">
                                    <a href={source.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-2">
                                        <LinkIcon className="w-4 h-4"/> {source.name}
                                    </a>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                        <span className={`w-2.5 h-2.5 rounded-full ${getCredibilityClass(source.credibility).dot}`}></span>
                                        {source.credibility || 'نامشخص'}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

const AnalysisTabComponent: React.FC<{ settings: AppSettings; allCoins: SimpleCoin[] }> = ({ settings, allCoins }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCoin, setSelectedCoin] = useState<SimpleCoin | null>(null);
    const [result, setResult] = useState<CryptoAnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filteredCoins = searchTerm
        ? allCoins.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.symbol.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5)
        : [];

    const handleSelectCoin = async (coin: SimpleCoin) => {
        setSearchTerm('');
        setSelectedCoin(coin);
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await fetchCryptoAnalysis(coin.name, settings.aiInstructions['crypto-analysis'], settings);
            setResult(data);
        } catch(err) {
            setError('خطا در دریافت تحلیل. لطفا دوباره تلاش کنید.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const SentimentBar: React.FC<{score: number}> = ({score}) => {
        const percentage = score;
        const color = percentage > 70 ? 'bg-green-500' : percentage > 40 ? 'bg-yellow-500' : 'bg-red-500';
        const textColor = percentage > 70 ? 'text-green-300' : percentage > 40 ? 'text-yellow-300' : 'text-red-300';
        const label = percentage > 75 ? 'بسیار صعودی' : percentage > 60 ? 'صعودی' : percentage > 40 ? 'خنثی' : percentage > 25 ? 'نزولی' : 'بسیار نزولی';
        return (
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>بسیار نزولی</span><span>بسیار صعودی</span></div>
                <div className="w-full bg-gray-700 rounded-full h-2.5"><div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div></div>
                <div className={`text-center text-sm font-bold mt-2 ${textColor}`}>{label} ({score}/100)</div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="نام ارز مورد نظر برای تحلیل را جستجو کنید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                {filteredCoins.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg z-10">
                        {filteredCoins.map(coin => (
                            <button key={coin.id} onClick={() => handleSelectCoin(coin)} className="w-full text-right p-2 hover:bg-gray-800/50 flex gap-2">
                                <span className="font-semibold">{coin.name}</span>
                                <span className="text-gray-400">{coin.symbol.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {isLoading && <div className="text-center p-4">در حال دریافت تحلیل...</div>}
            {error && <div className="p-4 bg-red-900/20 text-red-300 rounded-lg">{error}</div>}
            
            {!isLoading && !result && (
                <div className="text-center p-6 text-gray-500">
                    {selectedCoin ? `در حال دریافت تحلیل برای ${selectedCoin.name}...` : 'یک ارز را برای مشاهده تحلیل آن انتخاب کنید.'}
                </div>
            )}

            {result && (
                <div className="space-y-4 animate-fade-in">
                    <h2 className="text-2xl font-bold text-cyan-300">تحلیل جامع {result.coinName} ({result.symbol.toUpperCase()})</h2>
                    <div className="p-4 bg-gray-800/50 rounded-lg space-y-2">
                        <h4 className="font-semibold text-cyan-200">خلاصه تحلیل</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
                    </div>
                     <CollapsibleSection title={result.technicalAnalysis.title}>
                        <p className="text-sm text-gray-300 leading-relaxed">{result.technicalAnalysis.content}</p>
                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                            <div className="bg-green-900/30 p-2 rounded">
                                <h5 className="font-semibold text-green-300 mb-1">سطوح حمایت</h5>
                                <ul className="list-disc list-inside">{result.technicalAnalysis.keyLevels.support.map((s,i) => <li key={i}>{s}</li>)}</ul>
                            </div>
                             <div className="bg-red-900/30 p-2 rounded">
                                <h5 className="font-semibold text-red-300 mb-1">سطوح مقاومت</h5>
                                <ul className="list-disc list-inside">{result.technicalAnalysis.keyLevels.resistance.map((r,i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                        </div>
                    </CollapsibleSection>
                     <CollapsibleSection title={result.fundamentalAnalysis.title}>
                        <p className="text-sm text-gray-300 leading-relaxed">{result.fundamentalAnalysis.content}</p>
                         <div className="mt-4">
                            <h5 className="font-semibold text-cyan-200 mb-2">معیارهای کلیدی</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {result.fundamentalAnalysis.keyMetrics.map((m,i) => <div key={i} className="bg-gray-900/50 p-2 rounded"><strong className="text-gray-300">{m.name}:</strong> <span className="text-white">{m.value}</span></div>)}
                            </div>
                        </div>
                    </CollapsibleSection>
                     <CollapsibleSection title={result.sentimentAnalysis.title}>
                        <p className="text-sm text-gray-300 leading-relaxed">{result.sentimentAnalysis.content}</p>
                        <div className="mt-4"><SentimentBar score={result.sentimentAnalysis.score} /></div>
                    </CollapsibleSection>
                    <div className="p-4 bg-gray-800/50 rounded-lg space-y-2">
                        <h4 className="font-semibold text-cyan-200">چشم‌انداز آینده</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">{result.futureOutlook}</p>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- MAIN COMPONENT ---
const CryptoTracker: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<CryptoTab>('live');
    const [allCoins, setAllCoins] = useState<SimpleCoin[]>([]);
    const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>('crypto-favorites', ['bitcoin', 'ethereum']);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const getCoinList = async () => {
            try {
                const data = await fetchCoinList(settings.aiInstructions['crypto-data'], settings);
                setAllCoins(data);
            } catch (err) { console.error("Failed to fetch coin list", err); }
        };
        getCoinList();
    }, [settings]);
    
    const onToggleFavorite = (id: string) => {
        const newIds = favoriteIds.includes(id)
            ? favoriteIds.filter(i => i !== id)
            : [...favoriteIds, id];
        setFavoriteIds(newIds);
    };

    const renderTabButton = (tabId: CryptoTab, label: string, icon?: React.ReactNode) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 whitespace-nowrap ${
                activeTab === tabId ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >{icon}{label}</button>
    );

    const renderCurrentTab = () => {
        switch (activeTab) {
            case 'live': return <LivePricesTab settings={settings} />;
            case 'favorites': return <FavoritesTab settings={settings} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite} />;
            case 'gainers': return <MarketMoversTab mode="gainers" settings={settings} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite} />;
            case 'losers': return <MarketMoversTab mode="losers" settings={settings} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite} />;
            case 'newest': return <MarketMoversTab mode="newest" settings={settings} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite} />;
            case 'search': return <SearchTabComponent settings={settings} />;
            case 'analysis': return <AnalysisTabComponent settings={settings} allCoins={allCoins} />;
            default: return null;
        }
    };
    
    return (
        <div className="space-y-6">
            {isModalOpen && <CoinSelectionModal allCoins={allCoins} favoriteIds={favoriteIds} onClose={() => setIsModalOpen(false)} onSave={setFavoriteIds} />}
            <div className="flex justify-between items-center border-b border-cyan-400/20">
                <div className="flex overflow-x-auto">
                    {renderTabButton('live', 'قیمت لحظه‌ای')}
                    {renderTabButton('search', 'جستجو', <SearchIcon className="w-4 h-4"/>)}
                    {renderTabButton('analysis', 'تحلیل', <ChartPieIcon className="w-4 h-4"/>)}
                    {renderTabButton('favorites', 'علاقه‌مندی‌ها')}
                    {renderTabButton('gainers', 'بیشترین رشد')}
                    {renderTabButton('losers', 'بیشترین افت')}
                    {renderTabButton('newest', 'جدیدترین‌ها')}
                </div>
                 <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 rounded-lg text-sm whitespace-nowrap"><StarIcon className="w-4 h-4"/> مدیریت علاقه‌مندی‌ها</button>
            </div>
            <div className="p-1 text-xs text-amber-300 bg-amber-900/30 border border-amber-500/30 rounded-lg text-center">
                <strong>توجه:</strong> داده‌های این بخش توسط هوش مصنوعی و از طریق جستجوی وب گردآوری شده و ممکن است کاملاً دقیق یا لحظه‌ای نباشند. این بخش برای مقاصد اطلاعاتی است و نباید به عنوان مشاوره مالی تلقی شود.
            </div>
            <div>{renderCurrentTab()}</div>
        </div>
    );
};

// --- TAB SUB-COMPONENTS ---
const LivePricesTab: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [coins, setCoins] = useState<CryptoCoin[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchCryptoData('live', '24h', 50, settings.aiInstructions['crypto-data'], settings);
                const randomCoins = data.sort(() => 0.5 - Math.random()).slice(0, 20);
                setCoins(randomCoins);
            } catch (err) { console.error("Failed to fetch live prices", err); }
            finally { setIsLoading(false); }
        };
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [settings]);

    return (
        <div className="space-y-8">
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {isLoading && Array.from({length: 20}).map((_, i) => <div key={i} className="h-24 bg-gray-800/50 rounded-lg animate-pulse"></div>)}
                {coins.map((coin, index) => (
                    <div key={coin.id} className="p-3 bg-gray-900/50 rounded-lg text-center border border-transparent hover:border-cyan-400/50 transition-all">
                        <h3 
                            className="text-lg font-bold neon-text"
                            style={{ '--neon-color': NEON_COLORS[index % NEON_COLORS.length] } as React.CSSProperties}
                        >{coin.name}</h3>
                        <p className="text-xl font-mono text-white">${formatPrice(coin.price_usd)}</p>
                        <p className="text-sm font-mono text-gray-400">{formatPrice(coin.price_toman)} تومان</p>
                        <div className="text-sm mt-1">{formatPercentage(coin.price_change_percentage_24h)}</div>
                    </div>
                ))}
            </div>
            <TradingViewWidget />
        </div>
    );
};

const MarketMoversTab: React.FC<{ mode: 'gainers' | 'losers' | 'newest'; settings: AppSettings; favoriteIds: string[]; onToggleFavorite: (id: string) => void; }> = ({ mode, settings, favoriteIds, onToggleFavorite }) => {
    const [coins, setCoins] = useState<CryptoCoin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<Timeframe>('24h');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchCryptoData(mode, timeframe, 15, settings.aiInstructions['crypto-data'], settings);
                setCoins(data);
            } catch (err) { console.error(`Failed to fetch ${mode}`, err); }
            finally { setIsLoading(false); }
        };
        fetchData();
    }, [settings, mode, timeframe]);

    return (
        <div className="space-y-4">
            {mode !== 'newest' && (
                <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg">
                    {TIMEFRAME_OPTIONS.map(opt => (
                        <button key={opt.id} onClick={() => setTimeframe(opt.id)} className={`w-full py-1 text-sm rounded ${timeframe === opt.id ? 'bg-cyan-500 text-black' : 'hover:bg-gray-700/50'}`}>{opt.label}</button>
                    ))}
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-cyan-200 uppercase bg-gray-700/50"><tr><th className="p-3">نام</th><th className="p-3">قیمت (دلار)</th><th className="p-3">قیمت (تومان)</th><th className="p-3">تغییرات</th><th className="p-3"></th></tr></thead>
                    <tbody>
                        {isLoading && Array.from({length: 5}).map((_, i) => <LoadingRow key={i} />)}
                        {coins.map(coin => (
                             <tr key={coin.id} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                                <td className="p-3"><div className="flex items-center gap-2"><span className="font-semibold">{coin.name}</span><span className="text-gray-400">{coin.symbol.toUpperCase()}</span></div></td>
                                <td className="p-3 font-mono">${formatPrice(coin.price_usd)}</td>
                                <td className="p-3 font-mono">{formatPrice(coin.price_toman)}</td>
                                <td className="p-3 font-mono">{formatPercentage(coin.price_change_percentage_24h)}</td>
                                 <td className="p-3"><button onClick={() => onToggleFavorite(coin.id)} className={favoriteIds.includes(coin.id) ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-300'}><StarIcon className="w-5 h-5"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const FavoritesTab: React.FC<{ settings: AppSettings; favoriteIds: string[]; onToggleFavorite: (id: string) => void; }> = ({ settings, favoriteIds, onToggleFavorite }) => {
    const [coins, setCoins] = useState<CryptoCoin[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (favoriteIds.length === 0) {
                setCoins([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const data = await fetchCryptoData('favorites', '24h', favoriteIds.length, settings.aiInstructions['crypto-data'], settings, favoriteIds);
                setCoins(data);
            } catch (err) { console.error("Failed to fetch favorites", err); }
            finally { setIsLoading(false); }
        };
        fetchData();
    }, [settings, favoriteIds]);

    if (favoriteIds.length === 0 && !isLoading) {
        return <p className="text-center text-gray-400">شما هنوز ارزی را به علاقه‌مندی‌ها اضافه نکرده‌اید.</p>;
    }
    
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
                <thead className="text-xs text-cyan-200 uppercase bg-gray-700/50"><tr><th className="p-3">نام</th><th className="p-3">قیمت (دلار)</th><th className="p-3">قیمت (تومان)</th><th className="p-3">تغییرات</th><th className="p-3"></th></tr></thead>
                <tbody>
                    {isLoading && Array.from({length: favoriteIds.length}).map((_, i) => <LoadingRow key={i} />)}
                    {coins.map(coin => (
                            <tr key={coin.id} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                            <td className="p-3"><div className="flex items-center gap-2"><span className="font-semibold">{coin.name}</span><span className="text-gray-400">{coin.symbol.toUpperCase()}</span></div></td>
                            <td className="p-3 font-mono">${formatPrice(coin.price_usd)}</td>
                            <td className="p-3 font-mono">{formatPrice(coin.price_toman)}</td>
                            <td className="p-3 font-mono">{formatPercentage(coin.price_change_percentage_24h)}</td>
                                <td className="p-3"><button onClick={() => onToggleFavorite(coin.id)} className="text-yellow-400"><StarIcon className="w-5 h-5"/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CryptoTracker;