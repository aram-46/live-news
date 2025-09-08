import React, { useState, useCallback, useRef } from 'react';
import { AppSettings, MediaFile, WordPressThemePlan } from '../types';
import { generateWordPressThemePlan, generateWordPressThemeCode } from '../services/geminiService';
import { SparklesIcon, UploadIcon, CloseIcon, ClipboardIcon, CheckCircleIcon, WordPressIcon } from './icons';

interface WordPressThemeGeneratorProps {
    settings: AppSettings;
}

type GenerationState = 'idle' | 'planning' | 'done' | 'error';
type CodeTabs = 'header.php' | 'index.php' | 'sidebar.php' | 'footer.php' | 'style.css' | 'functions.js' | 'functions.php';

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    return (
        <pre className="bg-gray-900 rounded-md p-4 overflow-x-auto relative group">
            <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-gray-800/80 rounded-full text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="کپی">
                {isCopied ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
            </button>
            <code className="language-php text-sm text-cyan-200 whitespace-pre-wrap">{code}</code>
        </pre>
    );
};

const WordPressThemeGenerator: React.FC<WordPressThemeGeneratorProps> = ({ settings }) => {
    const [themeType, setThemeType] = useState('وبلاگی');
    const [inspirationUrl, setInspirationUrl] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<MediaFile | null>(null);
    
    const [state, setState] = useState<GenerationState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [plan, setPlan] = useState<WordPressThemePlan | null>(null);

    const [activeCodeTab, setActiveCodeTab] = useState<CodeTabs>('header.php');
    const [generatedCode, setGeneratedCode] = useState<Partial<Record<CodeTabs, string>>>({});
    const [generatingTabs, setGeneratingTabs] = useState<Partial<Record<CodeTabs, boolean>>>({});
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = (e.target?.result as string).split(',')[1];
            setImageFile({ name: file.name, type: file.type, data: base64Data, url: URL.createObjectURL(file) });
        };
        reader.readAsDataURL(file);
    };
    
    const handlePlan = async () => {
        if (!description.trim() && !inspirationUrl.trim() && !imageFile) {
            setError('لطفا حداقل یکی از موارد (توضیحات، لینک یا تصویر) را برای شروع وارد کنید.');
            return;
        }
        setState('planning');
        setError(null);
        setPlan(null);
        setGeneratedCode({});
        try {
            const imageDesc = imageFile ? `An uploaded image showing a theme design with these characteristics: [Describe visual elements from image]` : '';
            const generatedPlan = await generateWordPressThemePlan(themeType, inspirationUrl, description, imageDesc, settings.aiInstructions['wordpress-theme']);
            setPlan(generatedPlan);
            setState('done'); 
        } catch (err) {
            setError('خطا در تحلیل اولیه و ساخت پلن. لطفا دوباره تلاش کنید.');
            setState('error');
        }
    };
    
    const handleGenerateCodeForTab = useCallback(async (tab: CodeTabs) => {
        if (!plan || generatedCode[tab] || generatingTabs[tab]) return;
        setGeneratingTabs(prev => ({ ...prev, [tab]: true }));
        try {
            const code = await generateWordPressThemeCode(plan, tab);
            setGeneratedCode(prev => ({...prev, [tab]: code}));
        } catch(err) {
            setError(`خطا در تولید کد برای ${tab}`);
        } finally {
            setGeneratingTabs(prev => ({ ...prev, [tab]: false }));
        }
    }, [plan, generatedCode, generatingTabs]);

    const renderCodeOutput = () => {
        if (generatingTabs[activeCodeTab]) {
            return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>;
        }
        if (generatedCode[activeCodeTab]) {
            return <CodeBlock code={generatedCode[activeCodeTab]!} />;
        }
        return <div className="flex items-center justify-center h-full text-center text-gray-500">برای تولید کد، روی این تب کلیک کنید.</div>;
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel: Inputs & Plan */}
            <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-xl shadow-cyan-500/10 space-y-6">
                <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-3"><WordPressIcon className="w-6 h-6"/> تولیدکننده قالب وردپرس</h2>
                <p className="text-xs text-amber-300 bg-amber-900/30 border border-amber-500/30 rounded-lg p-3">
                    <strong>توجه:</strong> این ابزار یک نقطه شروع برای توسعه‌دهندگان است و کدهای اسکلت (scaffold) یک قالب را تولید می‌کند، نه یک قالب کامل و قابل نصب.
                </p>
                <div className="space-y-4">
                    <select value={themeType} onChange={e => setThemeType(e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5">
                        {['فروشگاهی', 'خبری', 'وبلاگی', 'شخصی', 'پروفایل', 'رزومه', 'چند منظوره', 'سفارشی'].map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input type="url" value={inspirationUrl} onChange={e => setInspirationUrl(e.target.value)} placeholder="لینک سایت برای الهام گرفتن (اختیاری)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="توضیح دهید چه قالبی با چه امکاناتی می‌خواهید..." className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"/>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                    {imageFile ? (
                        <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <img src={imageFile.url} alt="preview" className="w-10 h-10 rounded"/>
                                <span className="text-xs text-gray-300">{imageFile.name}</span>
                            </div>
                            <button onClick={() => setImageFile(null)}><CloseIcon className="w-5 h-5"/></button>
                        </div>
                    ) : (
                         <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-400 hover:text-cyan-300">
                             <UploadIcon className="w-5 h-5"/> آپلود تصویر طرح (اختیاری)
                        </button>
                    )}
                    <button onClick={handlePlan} disabled={state === 'planning'} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-bold py-3 px-4 rounded-lg transition">
                         <SparklesIcon className="w-5 h-5" />
                         {state === 'planning' ? 'در حال تحلیل...' : 'تحلیل و ساخت پلن'}
                    </button>
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                {plan && (
                    <div className="space-y-4 pt-4 border-t border-cyan-400/20 animate-fade-in">
                        <h3 className="font-bold text-green-300">پلن ساخت قالب آماده شد</h3>
                        <div className="p-3 bg-gray-900/50 rounded-lg text-sm space-y-2">
                           <p><strong>نام قالب:</strong> {plan.themeName}</p>
                           <p><strong>درک کلی:</strong> {plan.understanding}</p>
                           <p><strong>پالت رنگ:</strong></p>
                           <div className="flex gap-2">
                               {Object.values(plan.colorPalette).map((color, i) => <div key={i} className="w-6 h-6 rounded" style={{backgroundColor: color}} title={color}></div>)}
                           </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Right Panel: Code Output */}
            <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-xl shadow-cyan-500/10 flex flex-col min-h-[80vh]">
                 <div className="flex border-b border-cyan-400/20 mb-4 overflow-x-auto">
                    {(['header.php', 'index.php', 'sidebar.php', 'footer.php', 'style.css', 'functions.js', 'functions.php'] as CodeTabs[]).map(tab => 
                        <button key={tab} disabled={!plan} onClick={() => { setActiveCodeTab(tab); handleGenerateCodeForTab(tab); }} className={`px-4 py-2 text-sm font-mono whitespace-nowrap transition-colors ${activeCodeTab === tab ? 'border-b-2 border-cyan-400 text-cyan-300' : 'text-gray-400'} disabled:text-gray-600 disabled:cursor-not-allowed`}>{tab}</button>
                    )}
                </div>
                <div className="flex-grow">
                    {!plan ? (
                        <div className="flex items-center justify-center h-full text-gray-500">ابتدا پلن را بسازید تا کدها در اینجا نمایش داده شوند.</div>
                    ) : renderCodeOutput()}
                </div>
            </div>
        </div>
    );
};

export default WordPressThemeGenerator;
