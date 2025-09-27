import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AppAIModelSettings, ApiKeyStatus, AIModelProvider } from '../../types';
import { BrainIcon, CheckCircleIcon, CloseIcon, OpenAIIcon, OpenRouterIcon, GroqIcon, DownloadIcon, ImportIcon } from '../icons';
import { testOpenAIConnection, testOpenRouterConnection, testGroqConnection } from '../../services/integrationService';
import { exportToJson } from '../../services/exportService';

interface AIModelSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const AIModelSettings: React.FC<AIModelSettingsProps> = ({ settings, onSettingsChange }) => {
    const [geminiRealStatus, setGeminiRealStatus] = useState<ApiKeyStatus>('checking');
    const [openaiStatus, setOpenaiStatus] = useState<TestStatus>('idle');
    const [openrouterStatus, setOpenrouterStatus] = useState<TestStatus>('idle');
    const [groqStatus, setGroqStatus] = useState<TestStatus>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleStatusChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail && customEvent.detail.status) {
                setGeminiRealStatus(customEvent.detail.status);
            }
        };
        window.addEventListener('apiKeyStatusChange', handleStatusChange);

        const keyToCheck = settings.aiModelSettings.gemini.apiKey || process.env.API_KEY;
        if (!keyToCheck) {
            setGeminiRealStatus('not_set');
        } else {
            // Let the global status checker handle this, don't set to 'checking' here
            // to avoid flicker if a call is already in progress.
        }

        return () => {
            window.removeEventListener('apiKeyStatusChange', handleStatusChange);
        };
    }, [settings.aiModelSettings.gemini.apiKey]);


    const handleApiKeyChange = (
        provider: keyof AppAIModelSettings, 
        field: string,
        value: string,
        statusSetter: React.Dispatch<React.SetStateAction<TestStatus>>
    ) => {
        statusSetter('idle');
        const newAiModelSettings = {
            ...settings.aiModelSettings,
            [provider]: { ...settings.aiModelSettings[provider], [field]: value }
        };
        onSettingsChange({ ...settings, aiModelSettings: newAiModelSettings });
    };
    
    const handleDefaultProviderChange = (provider: AIModelProvider) => {
        onSettingsChange({ ...settings, defaultProvider: provider });
    };

    const isProviderEnabled = (provider: AIModelProvider): boolean => {
        if (provider === 'gemini') return !!(settings.aiModelSettings.gemini.apiKey || process.env.API_KEY);
        const providerSettings = settings.aiModelSettings[provider as 'openai' | 'openrouter' | 'groq'];
        // @ts-ignore
        return !!(providerSettings && 'apiKey' in providerSettings && providerSettings.apiKey);
    };
    const availableProviders: AIModelProvider[] = (Object.keys(settings.aiModelSettings) as AIModelProvider[]).filter(isProviderEnabled);

    const handleExport = () => {
        exportToJson(settings.aiModelSettings, 'smart-news-ai-models-backup');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const importedData = JSON.parse(text);

                if (typeof importedData !== 'object' || !importedData.gemini || !importedData.openai) {
                    throw new Error("Invalid AI Models settings file format.");
                }
                
                const newAiModelSettings = { ...settings.aiModelSettings, ...importedData };
                onSettingsChange({ ...settings, aiModelSettings: newAiModelSettings });
                alert('تنظیمات مدل‌های AI با موفقیت بارگذاری شد. لطفاً اتصال‌ها را مجدداً تست کنید.');

            } catch (error: any) {
                alert(`خطا در بارگذاری فایل: ${error.message}`);
            } finally {
                if(event.target) event.target.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleTestOpenAI = async () => {
        setOpenaiStatus('testing');
        const success = await testOpenAIConnection(settings.aiModelSettings.openai.apiKey);
        setOpenaiStatus(success ? 'success' : 'error');
        setTimeout(() => setOpenaiStatus('idle'), 4000);
    };

    const handleTestOpenRouter = async () => {
        setOpenrouterStatus('testing');
        const success = await testOpenRouterConnection(settings.aiModelSettings.openrouter.apiKey);
        setOpenrouterStatus(success ? 'success' : 'error');
        setTimeout(() => setOpenrouterStatus('idle'), 4000);
    };

    const handleTestGroq = async () => {
        setGroqStatus('testing');
        const success = await testGroqConnection(settings.aiModelSettings.groq.apiKey);
        setGroqStatus(success ? 'success' : 'error');
        setTimeout(() => setGroqStatus('idle'), 4000);
    };
    
    const renderStatusIcon = (status: TestStatus | ApiKeyStatus) => {
        if (status === 'testing' || status === 'checking') return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>;
        if (status === 'success' || status === 'valid') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        if (status === 'error' || status === 'invalid_key' || status === 'not_set') return <CloseIcon className="w-5 h-5 text-red-400" />;
        if (status === 'network_error' || status === 'quota_exceeded') return <CloseIcon className="w-5 h-5 text-yellow-400" />;
        return null;
    }

    const renderGeminiStatusBadge = () => {
        switch (geminiRealStatus) {
            case 'valid':
                return <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">متصل</span>;
            case 'invalid_key':
            case 'not_set':
                return <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">پیکربندی نشده</span>;
            case 'network_error':
                 return <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">خطای شبکه</span>;
             case 'quota_exceeded':
                 return <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">سهمیه تمام شده</span>;
            case 'checking':
                 return <span className="text-xs bg-gray-500/20 text-gray-300 px-2 py-1 rounded-full">در حال بررسی...</span>;
        }
    }
    
    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-cyan-300">تنظیمات مدل هوش مصنوعی</h2>
                <div className="flex gap-2">
                    <button onClick={handleImportClick} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm">
                        <ImportIcon className="w-4 h-4" />
                        <span>بازیابی</span>
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm">
                        <DownloadIcon className="w-4 h-4" />
                        <span>پشتیبان‌گیری</span>
                    </button>
                </div>
            </div>
            
            <div className="mb-8 p-4 bg-gray-900/30 rounded-lg border border-cyan-400/20">
                <label htmlFor="default-provider" className="block text-sm font-medium text-cyan-300 mb-2">
                    ارائه‌دهنده پیش‌فرض هوش مصنوعی
                </label>
                <p className="text-xs text-gray-400 mb-3">
                    این مدل برای قابلیت‌هایی استفاده می‌شود که مدل خاصی به آن‌ها در تب "تخصیص مدل‌ها" اختصاص داده نشده است.
                </p>
                <select
                    id="default-provider"
                    value={settings.defaultProvider}
                    onChange={(e) => handleDefaultProviderChange(e.target.value as AIModelProvider)}
                    className="w-full max-w-xs bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"
                >
                    {availableProviders.map(provider => (
                        <option key={provider} value={provider}>
                            {provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </option>
                    ))}
                </select>
                {availableProviders.length === 0 && <p className="text-xs text-red-400 mt-2">هیچ ارائه‌دهنده‌ای فعال نیست. لطفاً حداقل یک کلید API وارد کنید.</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gemini Settings */}
                <div className="space-y-4 p-4 border border-cyan-500 rounded-lg bg-gray-900/30 ring-2 ring-cyan-500/50">
                    <h3 className="flex items-center justify-between text-lg font-semibold text-cyan-200">
                        <div className="flex items-center gap-2">
                            <BrainIcon className="w-6 h-6"/>
                            <span>Google Gemini (اصلی)</span>
                        </div>
                        {renderGeminiStatusBadge()}
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">وضعیت کلید API</label>
                        <div className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5 text-sm">
                            {geminiRealStatus === 'not_set' ? (
                                <span className="text-red-400">کلید API برای Gemini تنظیم نشده است. برای راهنمایی، فایل README.md را مطالعه کنید.</span>
                            ) : (
                                <span className="text-green-400">کلید API از طریق متغیر محیطی برنامه یا فیلد زیر تنظیم شده است.</span>
                            )}
                        </div>
                         <input id="gemini-apiKey" name="apiKey" type="password" value={settings.aiModelSettings.gemini.apiKey} onChange={(e) => { const newSettings = {...settings, aiModelSettings: {...settings.aiModelSettings, gemini: {apiKey: e.target.value}}}; onSettingsChange(newSettings); }} placeholder="برای اولویت دادن، کلید را اینجا وارد کنید" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5 mt-2"/>
                    </div>
                </div>

                {/* OpenAI Settings */}
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
                        <OpenAIIcon className="w-6 h-6"/>
                        <span>OpenAI</span>
                    </h3>
                    <div>
                        <label htmlFor="openai-apiKey" className="block text-sm font-medium text-gray-300 mb-2">کلید API</label>
                        <input id="openai-apiKey" name="apiKey" type="password" value={settings.aiModelSettings.openai.apiKey} onChange={(e) => handleApiKeyChange('openai', 'apiKey', e.target.value, setOpenaiStatus)} placeholder="کلید API خود را وارد کنید (sk-...)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5"/>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleTestOpenAI} disabled={!settings.aiModelSettings.openai.apiKey || openaiStatus === 'testing'} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                        <div className="w-5 h-5">{renderStatusIcon(openaiStatus)}</div>
                    </div>
                    <p className="text-xs text-gray-400 pt-2 border-t border-gray-700/50">
                        پس از تست موفق، می‌توانید این مدل را در تب <strong className="text-cyan-300">'تخصیص مدل‌ها'</strong> به قابلیت‌های مختلف اختصاص دهید.
                    </p>
                </div>
                
                {/* OpenRouter Settings */}
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-900/30 md:col-span-2">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
                        <OpenRouterIcon className="w-6 h-6"/>
                        <span>OpenRouter</span>
                    </h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="openrouter-apiKey" className="block text-sm font-medium text-gray-300 mb-2">کلید API</label>
                            <input id="openrouter-apiKey" name="apiKey" type="password" value={settings.aiModelSettings.openrouter.apiKey} onChange={(e) => handleApiKeyChange('openrouter', 'apiKey', e.target.value, setOpenrouterStatus)} placeholder="کلید API خود را وارد کنید (sk-or-...)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5" />
                        </div>
                         <div>
                            <label htmlFor="openrouter-modelName" className="block text-sm font-medium text-gray-300 mb-2">نام کامل مدل</label>
                            <input id="openrouter-modelName" name="modelName" type="text" value={settings.aiModelSettings.openrouter.modelName} onChange={(e) => handleApiKeyChange('openrouter', 'modelName', e.target.value, setOpenrouterStatus)} placeholder="mistralai/mistral-7b-instruct" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">برای استفاده از مدل‌های خاص یا رایگان، نام کامل مدل را از سایت OpenRouter کپی کرده و در فیلد بالا وارد کنید.</p>
                     <div className="flex items-center gap-2">
                        <button onClick={handleTestOpenRouter} disabled={!settings.aiModelSettings.openrouter.apiKey || openrouterStatus === 'testing'} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                        <div className="w-5 h-5">{renderStatusIcon(openrouterStatus)}</div>
                    </div>
                     <p className="text-xs text-gray-400 pt-2 border-t border-gray-700/50">
                        پس از تست موفق، می‌توانید این مدل را در تب <strong className="text-cyan-300">'تخصیص مدل‌ها'</strong> به قابلیت‌های مختلف اختصاص دهید.
                    </p>
                </div>

                {/* Groq Settings */}
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
                        <GroqIcon className="w-6 h-6"/>
                        <span>Groq</span>
                    </h3>
                    <div>
                        <label htmlFor="groq-apiKey" className="block text-sm font-medium text-gray-300 mb-2">کلید API</label>
                        <input id="groq-apiKey" name="apiKey" type="password" value={settings.aiModelSettings.groq.apiKey} onChange={(e) => handleApiKeyChange('groq', 'apiKey', e.target.value, setGroqStatus)} placeholder="کلید API خود را وارد کنید (gsk_...)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5"/>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleTestGroq} disabled={!settings.aiModelSettings.groq.apiKey || groqStatus === 'testing'} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                        <div className="w-5 h-5">{renderStatusIcon(groqStatus)}</div>
                    </div>
                     <p className="text-xs text-gray-400 pt-2 border-t border-gray-700/50">
                        پس از تست موفق، می‌توانید این مدل را در تب <strong className="text-cyan-300">'تخصیص مدل‌ها'</strong> به قابلیت‌های مختلف اختصاص دهید.
                    </p>
                </div>
            </div>
            <p className="text-xs text-gray-500 pt-4 mt-4 border-t border-gray-700/50">
                توجه: برای استفاده از مدل‌های غیر از Gemini، پیاده‌سازی منطق مربوط به هر سرویس‌دهنده در فایل `geminiService.ts` ضروری است.
            </p>
        </div>
    );
};

export default AIModelSettings;