

import React, { useState } from 'react';
import { AppAIModelSettings } from '../types';
import { BrainIcon, CheckCircleIcon, CloseIcon, OpenAIIcon, OpenRouterIcon, GroqIcon } from './icons';
import { testGeminiConnection } from '../services/geminiService';
import { testOpenAIConnection, testOpenRouterConnection, testGroqConnection } from '../services/integrationService';

interface AIModelSettingsProps {
  settings: AppAIModelSettings;
  onSettingsChange: (settings: AppAIModelSettings) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const AIModelSettings: React.FC<AIModelSettingsProps> = ({ settings, onSettingsChange }) => {
    const [geminiStatus, setGeminiStatus] = useState<TestStatus>('idle');
    const [openaiStatus, setOpenaiStatus] = useState<TestStatus>('idle');
    const [openrouterStatus, setOpenrouterStatus] = useState<TestStatus>('idle');
    const [groqStatus, setGroqStatus] = useState<TestStatus>('idle');

    const handleApiKeyChange = (
        provider: keyof AppAIModelSettings, 
        e: React.ChangeEvent<HTMLInputElement>,
        statusSetter: React.Dispatch<React.SetStateAction<TestStatus>>
    ) => {
        statusSetter('idle');
        onSettingsChange({
            ...settings,
            [provider]: { ...settings[provider], apiKey: e.target.value }
        });
    };

    const handleTestGemini = async () => {
        setGeminiStatus('testing');
        const success = await testGeminiConnection(settings.gemini.apiKey);
        setGeminiStatus(success ? 'success' : 'error');
        setTimeout(() => setGeminiStatus('idle'), 4000);
    };

    const handleTestOpenAI = async () => {
        setOpenaiStatus('testing');
        const success = await testOpenAIConnection(settings.openai.apiKey);
        setOpenaiStatus(success ? 'success' : 'error');
        setTimeout(() => setOpenaiStatus('idle'), 4000);
    };

    const handleTestOpenRouter = async () => {
        setOpenrouterStatus('testing');
        const success = await testOpenRouterConnection(settings.openrouter.apiKey);
        setOpenrouterStatus(success ? 'success' : 'error');
        setTimeout(() => setOpenrouterStatus('idle'), 4000);
    };

    const handleTestGroq = async () => {
        setGroqStatus('testing');
        const success = await testGroqConnection(settings.groq.apiKey);
        setGroqStatus(success ? 'success' : 'error');
        setTimeout(() => setGroqStatus('idle'), 4000);
    };
    
    const renderStatusIcon = (status: TestStatus) => {
        if (status === 'testing') return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
        if (status === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        if (status === 'error') return <CloseIcon className="w-5 h-5 text-red-400" />;
        return null;
    }
    
    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-xl font-bold mb-6 text-cyan-300">تنظیمات مدل هوش مصنوعی</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gemini Settings */}
                <div className="space-y-4 p-4 border border-cyan-500 rounded-lg bg-gray-900/30 ring-2 ring-cyan-500/50">
                    <h3 className="flex items-center justify-between text-lg font-semibold text-cyan-200">
                        <div className="flex items-center gap-2">
                            <BrainIcon className="w-6 h-6"/>
                            <span>Google Gemini (اصلی)</span>
                        </div>
                        <span className="text-xs bg-cyan-500/20 text-cyan-200 px-2 py-1 rounded-full">فعال</span>
                    </h3>
                    <div>
                        <label htmlFor="gemini-apiKey" className="block text-sm font-medium text-cyan-300 mb-2">کلید API</label>
                        <input
                            id="gemini-apiKey"
                            name="apiKey"
                            type="password"
                            value={settings.gemini.apiKey}
                            onChange={(e) => handleApiKeyChange('gemini', e, setGeminiStatus)}
                            placeholder="کلید API جمینای خود را وارد کنید"
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5"
                        />
                         <p className="text-xs text-amber-400 mt-2">
                            <strong>هشدار امنیتی:</strong> ذخیره کلید API در مرورگر امن نیست. هر کسی با دسترسی به این کامپیوتر می‌تواند آن را مشاهده کند. این روش فقط برای استفاده شخصی و تست مناسب است.
                        </p>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleTestGemini} disabled={!settings.gemini.apiKey || geminiStatus === 'testing'} className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                        <div className="w-5 h-5">{renderStatusIcon(geminiStatus)}</div>
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
                        <input
                            id="openai-apiKey"
                            name="apiKey"
                            type="password"
                            value={settings.openai.apiKey}
                            onChange={(e) => handleApiKeyChange('openai', e, setOpenaiStatus)}
                            placeholder="کلید API خود را وارد کنید (sk-...)"
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5"
                        />
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleTestOpenAI} disabled={!settings.openai.apiKey || openaiStatus === 'testing'} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                        <div className="w-5 h-5">{renderStatusIcon(openaiStatus)}</div>
                    </div>
                </div>
                
                {/* OpenRouter Settings */}
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
                        <OpenRouterIcon className="w-6 h-6"/>
                        <span>OpenRouter</span>
                    </h3>
                    <div>
                        <label htmlFor="openrouter-apiKey" className="block text-sm font-medium text-gray-300 mb-2">کلید API</label>
                        <input
                            id="openrouter-apiKey"
                            name="apiKey"
                            type="password"
                            value={settings.openrouter.apiKey}
                            onChange={(e) => handleApiKeyChange('openrouter', e, setOpenrouterStatus)}
                            placeholder="کلید API خود را وارد کنید (sk-or-...)"
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5"
                        />
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleTestOpenRouter} disabled={!settings.openrouter.apiKey || openrouterStatus === 'testing'} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                        <div className="w-5 h-5">{renderStatusIcon(openrouterStatus)}</div>
                    </div>
                </div>

                {/* Groq Settings */}
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
                        <GroqIcon className="w-6 h-6"/>
                        <span>Groq</span>
                    </h3>
                    <div>
                        <label htmlFor="groq-apiKey" className="block text-sm font-medium text-gray-300 mb-2">کلید API</label>
                        <input
                            id="groq-apiKey"
                            name="apiKey"
                            type="password"
                            value={settings.groq.apiKey}
                            onChange={(e) => handleApiKeyChange('groq', e, setGroqStatus)}
                            placeholder="کلید API خود را وارد کنید (gsk_...)"
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5"
                        />
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleTestGroq} disabled={!settings.groq.apiKey || groqStatus === 'testing'} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                        <div className="w-5 h-5">{renderStatusIcon(groqStatus)}</div>
                    </div>
                </div>
            </div>
            <p className="text-xs text-gray-500 pt-4 mt-4 border-t border-gray-700/50">
                توجه: اتصال به این سرویس‌ها در حال حاضر به صورت نمایشی است و برای فعال‌سازی کامل، نیاز به پیاده‌سازی منطق مربوطه در کد برنامه دارد.
            </p>
        </div>
    );
};

export default AIModelSettings;