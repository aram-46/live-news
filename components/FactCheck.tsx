
import React, { useState, useCallback, useRef } from 'react';
import { FactCheckResult, Credibility, AppSettings, MediaFile } from '../types';
import { CheckCircleIcon, LinkIcon, UploadIcon, ImageIcon, AudioIcon, VideoIcon, UserIcon, CalendarIcon, DocumentTextIcon, ThumbsUpIcon, ThumbsDownIcon, LightBulbIcon } from './icons';
import { factCheckNews } from '../services/geminiService';

interface FactCheckProps {
  settings: AppSettings;
  onOpenUrl: (url: string) => void;
}

type FactCheckType = 'text' | 'image' | 'audio' | 'video' | 'url';

const getCredibilityClass = (credibility?: Credibility | string) => {
    if (!credibility) return { border: 'border-gray-600/50', text: 'text-gray-300', bg: 'bg-gray-800/50', dot: 'bg-gray-400' };
    const credStr = credibility.toString();
    if (credStr.includes(Credibility.High)) {
      return { border: 'border-green-500/50', text: 'text-green-300', bg: 'bg-green-900/30', dot: 'bg-green-400' };
    }
    if (credStr.includes(Credibility.Medium)) {
      return { border: 'border-yellow-500/50', text: 'text-yellow-300', bg: 'bg-yellow-900/30', dot: 'bg-yellow-400' };
    }
    if (credStr.includes(Credibility.Low)) {
      return { border: 'border-red-500/50', text: 'text-red-300', bg: 'bg-red-900/30', dot: 'bg-red-400' };
    }
    return { border: 'border-gray-600/50', text: 'text-gray-300', bg: 'bg-gray-800/50', dot: 'bg-gray-400' };
};


const FactCheck: React.FC<FactCheckProps> = ({ settings, onOpenUrl }) => {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<FactCheckType>('text');
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        setMediaFile({
            name: file.name,
            type: file.type,
            data: base64Data,
            url: URL.createObjectURL(file)
        });
    };
    reader.readAsDataURL(file);
  };

  const handleFactCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
        const fileData = mediaFile ? { data: mediaFile.data, mimeType: mediaFile.type } : null;
        const checkUrl = activeTab === 'url' ? url : undefined;
        // FIX: Pass the correct instruction string from settings instead of the whole object.
        const apiResult = await factCheckNews(text, fileData, checkUrl, settings.aiInstructions['fact-check']);
        setResult(apiResult);
    } catch (err) {
        console.error('Error during fact-check:', err);
        setError('خطا در بررسی محتوا. لطفاً دوباره تلاش کنید.');
    } finally {
        setIsLoading(false);
    }
  }, [text, mediaFile, url, activeTab, settings]);
  
  const resultCredibilityClasses = getCredibilityClass(result?.overallCredibility);

  const renderCredibilityBadge = (credibility: string) => {
      const { dot, text } = getCredibilityClass(credibility);
      return (
          <div className="flex items-center gap-1.5 text-xs bg-gray-900/50 px-2 py-1 rounded-full">
              <span className={`w-2 h-2 rounded-full ${dot}`}></span>
              <span className={text}>{credibility}</span>
          </div>
      );
  };
  
  const resetInputs = () => {
      setMediaFile(null);
      setUrl('');
      setText('');
  };

  const renderTabs = () => (
    <div className="flex border-b border-cyan-400/20 mb-4">
        {([
            {id: 'text', label: 'متن'},
            {id: 'image', label: 'تصویر'},
            {id: 'audio', label: 'صدا'},
            {id: 'video', label: 'ویدئو'},
            {id: 'url', label: 'لینک'},
        ] as const).map(tab => (
            <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); resetInputs(); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
                activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                }`}
            >
                {tab.label}
            </button>
        ))}
    </div>
  );
  
  const getAcceptType = () => {
    switch(activeTab) {
        case 'image': return 'image/*';
        case 'audio': return 'audio/*';
        case 'video': return 'video/*';
        default: return '';
    }
  }
  
  const isSubmitDisabled = () => {
      if (isLoading) return true;
      if (activeTab === 'text') return !text.trim();
      if (activeTab === 'url') return !url.trim();
      if (['image', 'audio', 'video'].includes(activeTab)) return !mediaFile;
      return true;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <h2 className="text-xl font-bold mb-4 text-cyan-300 flex items-center gap-3">
        <CheckCircleIcon className="w-6 h-6" />
        فکت چک و ردیابی شایعات
      </h2>
      <p className="text-sm text-gray-400 mb-6">متن، تصویر، صدا، ویدئو یا لینک مورد نظر خود را برای بررسی اعتبار و **ردیابی منبع اولیه** در شبکه‌های اجتماعی، وارد کنید.</p>
      
      {renderTabs()}

      <div className="space-y-4">
          {['image', 'audio', 'video'].includes(activeTab) && (
            <div>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept={getAcceptType()} 
                    className="hidden" 
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
                >
                    <UploadIcon className="w-8 h-8"/>
                    <span>برای آپلود کلیک کنید یا فایل را اینجا بکشید</span>
                    <span className="text-xs">{getAcceptType()}</span>
                </button>

                {mediaFile && (
                    <div className="mt-4 p-2 bg-gray-800/50 rounded-lg">
                        {activeTab === 'image' && <img src={mediaFile.url} alt="Preview" className="max-h-48 rounded-md mx-auto" />}
                        {activeTab === 'audio' && <audio controls src={mediaFile.url} className="w-full" />}
                        {activeTab === 'video' && <video controls src={mediaFile.url} className="max-h-48 rounded-md mx-auto" />}
                        <p className="text-xs text-center mt-2 text-gray-400">{mediaFile.name}</p>
                    </div>
                )}
            </div>
          )}
          
          {activeTab === 'url' && (
             <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="لینک (URL) مورد نظر را اینجا وارد کنید..."
              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5"
            />
          )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={activeTab === 'text' ? 'متن خبر را اینجا وارد کنید...' : 'برای کمک به هوش مصنوعی، توضیح دهید چه چیزی باید در این محتوا بررسی شود...'}
          rows={activeTab === 'text' ? 5 : 3}
          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5"
        />
        <button
          onClick={handleFactCheck}
          disabled={isSubmitDisabled()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-400/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              در حال بررسی...
            </>
          ) : (
            'بررسی اعتبار'
          )}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-400 bg-red-900/30 p-3 rounded-lg">{error}</p>}
      
      {result && (
        <div className="mt-8 space-y-6 animate-fade-in">
            {/* Overall Result */}
            <div className={`p-4 rounded-lg border ${resultCredibilityClasses.border} ${resultCredibilityClasses.bg}`}>
                <h4 className={`font-bold text-lg mb-2 ${resultCredibilityClasses.text}`}>نتیجه کلی: {result.overallCredibility}</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
            </div>

            {/* Original Source */}
            <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                <h4 className="font-semibold text-cyan-200 mb-3">ردیابی و بررسی منبع اولیه</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">منبع:</strong> <a href={result.originalSource.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{result.originalSource.name}</a></div>
                    <div className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">تاریخ انتشار:</strong> {result.originalSource.publicationDate}</div>
                    <div className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">منتشر کننده:</strong> {result.originalSource.author}</div>
                    <div className="flex items-center gap-2"><DocumentTextIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">نوع مدرک:</strong> {result.originalSource.evidenceType}</div>
                    <div className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">اعتبار منبع:</strong> {renderCredibilityBadge(result.originalSource.credibility)}</div>
                    <div className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">اعتبار مدرک:</strong> {renderCredibilityBadge(result.originalSource.evidenceCredibility)}</div>
                    <div className="flex items-center gap-2 lg:col-span-3"><CheckCircleIcon className="w-5 h-5 text-cyan-400"/><strong className="ml-1">اعتبار منتشر کننده:</strong> {renderCredibilityBadge(result.originalSource.authorCredibility)}</div>
                </div>
            </div>

            {/* Public Reception */}
            <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                 <h4 className="font-semibold text-cyan-200 mb-3">میزان پذیرش و استدلال‌ها</h4>
                 <div className="mb-4">
                     <div className="flex justify-between items-center text-xs text-gray-400 mb-1"><span>میزان پذیرش ادعا</span><span>{result.acceptancePercentage}%</span></div>
                     <div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-cyan-500 h-2.5 rounded-full" style={{width: `${result.acceptancePercentage}%`}}></div></div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h5 className="flex items-center gap-2 font-semibold text-green-300"><ThumbsUpIcon className="w-5 h-5"/>موافقین</h5>
                        {result.proponents.map((p, i) => <div key={i} className="p-2 bg-green-900/30 rounded-md text-xs"><strong className="block text-green-200">{p.name}</strong><p className="text-gray-300">{p.argument}</p></div>)}
                        {result.proponents.length === 0 && <p className="text-xs text-gray-500">موافق قابل توجهی یافت نشد.</p>}
                    </div>
                     <div className="space-y-2">
                        <h5 className="flex items-center gap-2 font-semibold text-red-300"><ThumbsDownIcon className="w-5 h-5"/>مخالفین</h5>
                        {result.opponents.map((o, i) => <div key={i} className="p-2 bg-red-900/30 rounded-md text-xs"><strong className="block text-red-200">{o.name}</strong><p className="text-gray-300">{o.argument}</p></div>)}
                        {result.opponents.length === 0 && <p className="text-xs text-gray-500">مخالف قابل توجهی یافت نشد.</p>}
                    </div>
                 </div>
            </div>

             {/* Further Reading */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.relatedSuggestions && result.relatedSuggestions.length > 0 && (
                    <div>
                        <h5 className="font-semibold text-cyan-200 mb-2 flex items-center gap-2"><LightBulbIcon className="w-5 h-5"/>پیشنهاد برای درک بهتر</h5>
                        <ul className="space-y-2 list-disc list-inside">
                            {result.relatedSuggestions.map((suggestion, index) => (
                                <li key={index} className="text-sm text-gray-300">{suggestion}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {result.relatedSources && result.relatedSources.length > 0 && (
                    <div>
                        <h5 className="font-semibold text-cyan-200 mb-2">منابع مرتبط</h5>
                        <ul className="space-y-2">
                            {result.relatedSources.map((source, index) => (
                                <li key={index}>
                                    <button
                                        onClick={() => onOpenUrl(source.url)}
                                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors p-2 bg-gray-800/30 rounded-md w-full text-right"
                                    >
                                        <LinkIcon className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{source.title}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default FactCheck;
