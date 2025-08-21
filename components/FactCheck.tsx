
import React, { useState, useCallback, useRef } from 'react';
import { FactCheckResult, Credibility, AppSettings, MediaFile } from '../types';
import { CheckCircleIcon, LinkIcon, UploadIcon, ImageIcon, AudioIcon, VideoIcon } from './icons';
import { factCheckNews } from '../services/geminiService';

interface FactCheckProps {
  settings: AppSettings;
  onOpenUrl: (url: string) => void;
}

type FactCheckType = 'text' | 'image' | 'audio' | 'video';

const getCredibilityClass = (credibility?: Credibility) => {
    if (!credibility) return { border: 'border-gray-600/50', text: 'text-gray-300', bg: 'bg-gray-800/50' };
    switch (credibility) {
      case Credibility.High:
        return { border: 'border-green-500/50', text: 'text-green-300', bg: 'bg-green-900/30' };
      case Credibility.Medium:
        return { border: 'border-yellow-500/50', text: 'text-yellow-300', bg: 'bg-yellow-900/30' };
      case Credibility.Low:
        return { border: 'border-red-500/50', text: 'text-red-300', bg: 'bg-red-900/30' };
      default:
        return { border: 'border-gray-600/50', text: 'text-gray-300', bg: 'bg-gray-800/50' };
    }
};


const FactCheck: React.FC<FactCheckProps> = ({ settings, onOpenUrl }) => {
  const [text, setText] = useState('');
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
        const apiResult = await factCheckNews(text, fileData, settings.aiInstructions['fact-check']);
        setResult(apiResult);
    } catch (err) {
        console.error('Error during fact-check:', err);
        setError('خطا در بررسی محتوا. لطفاً دوباره تلاش کنید.');
    } finally {
        setIsLoading(false);
    }
  }, [text, mediaFile, settings.aiInstructions]);
  
  const resultCredibilityClasses = getCredibilityClass(result?.credibility);

  const renderTabs = () => (
    <div className="flex border-b border-cyan-400/20 mb-4">
        {([
            {id: 'text', label: 'متن', icon: <ImageIcon className="w-5 h-5"/>}, // Placeholder icon
            {id: 'image', label: 'تصویر', icon: <ImageIcon className="w-5 h-5"/>},
            {id: 'audio', label: 'صدا', icon: <AudioIcon className="w-5 h-5"/>},
            {id: 'video', label: 'ویدئو', icon: <VideoIcon className="w-5 h-5"/>},
        ] as const).map(tab => (
            <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMediaFile(null); }}
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

  return (
    <div className="max-w-3xl mx-auto p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <h2 className="text-xl font-bold mb-4 text-cyan-300 flex items-center gap-3">
        <CheckCircleIcon className="w-6 h-6" />
        فکت چک محتوا
      </h2>
      <p className="text-sm text-gray-400 mb-6">متن، تصویر، صدا یا ویدئوی مورد نظر خود را برای بررسی اعتبار و منبع، آپلود کنید.</p>
      
      {renderTabs()}

      <div className="space-y-4">
          {activeTab !== 'text' && (
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

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={activeTab === 'text' ? 'متن خبر را اینجا وارد کنید...' : 'در صورت نیاز، متنی برای توضیح زمینه محتوا وارد کنید...'}
          rows={5}
          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5"
        />
        <button
          onClick={handleFactCheck}
          disabled={isLoading || (!text.trim() && !mediaFile)}
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
        <div className="mt-6 space-y-4 animate-fade-in">
            <div className={`p-4 rounded-lg border ${resultCredibilityClasses.border} ${resultCredibilityClasses.bg}`}>
                <h4 className={`font-bold text-lg ${resultCredibilityClasses.text}`}>نتیجه: {result.credibility}</h4>
            </div>
            <div>
                <h5 className="font-semibold text-cyan-200 mb-2">توضیحات:</h5>
                <p className="text-sm text-gray-300 leading-relaxed bg-gray-800/30 p-3 rounded-md">{result.justification}</p>
            </div>
            {result.sources && result.sources.length > 0 && (
                <div>
                    <h5 className="font-semibold text-cyan-200 mb-2">منابع مرتبط:</h5>
                    <ul className="space-y-2">
                        {result.sources.map((source, index) => (
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
      )}
    </div>
  );
};

export default FactCheck;
