

import React, { useRef } from 'react';
import { AppSettings, AIInstructionType, aiInstructionLabels, AIModelProvider } from '../../types';
import { DownloadIcon, ImportIcon } from '../icons';
import { exportToJson } from '../../services/exportService';


interface AIModelAssignmentsProps {
  settings: AppSettings;
  onAssignmentsChange: (assignments: Partial<Record<AIInstructionType, AIModelProvider>>) => void;
}

const AIModelAssignments: React.FC<AIModelAssignmentsProps> = ({ settings, onAssignmentsChange }) => {
    const { aiModelSettings, modelAssignments } = settings;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAssignmentChange = (task: AIInstructionType, provider: AIModelProvider) => {
        onAssignmentsChange({
            ...modelAssignments,
            [task]: provider
        });
    };

    const isProviderEnabled = (provider: AIModelProvider): boolean => {
        if (provider === 'gemini') return !!(settings.aiModelSettings.gemini.apiKey || process.env.API_KEY);
        const providerSettings = aiModelSettings[provider as 'openai' | 'openrouter' | 'groq'];
        return !!(providerSettings && 'apiKey' in providerSettings && providerSettings.apiKey);
    }
    
    const handleExport = () => {
        exportToJson(modelAssignments, 'smart-news-model-assignments');
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
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File is not readable");
                
                const importedAssignments = JSON.parse(text);

                if (typeof importedAssignments !== 'object' || Array.isArray(importedAssignments)) {
                    throw new Error("Invalid JSON format. Expected an object.");
                }

                const newAssignments = { ...modelAssignments, ...importedAssignments };
                onAssignmentsChange(newAssignments);
                alert('تخصیص مدل‌ها با موفقیت بارگذاری شد.');

            } catch (error: any) {
                console.error("Failed to import assignments:", error);
                alert(`خطا در بارگذاری فایل. لطفاً از معتبر بودن فایل JSON اطمینان حاصل کنید. (${error.message})`);
            } finally {
                if(event.target) event.target.value = "";
            }
        };
        reader.readAsText(file);
    };


    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
             <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div>
                    <h2 className="text-xl font-bold mb-2 text-cyan-300">تخصیص مدل به قابلیت‌ها</h2>
                    <p className="text-sm text-gray-400">
                        برای هر قابلیت، مدل هوش مصنوعی مورد نظر خود را انتخاب کنید. مدل‌هایی که کلید API آن‌ها در تب "مدل‌های AI" وارد نشده باشد، غیرفعال خواهند بود.
                    </p>
                </div>
                 <div className="flex gap-2 flex-shrink-0">
                     <button onClick={handleImportClick} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm">
                        <ImportIcon className="w-4 h-4" />
                        <span>بارگذاری</span>
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm">
                        <DownloadIcon className="w-4 h-4" />
                        <span>خروجی</span>
                    </button>
                </div>
            </div>
            <div className="space-y-4">
                 {(Object.keys(aiInstructionLabels) as AIInstructionType[]).map(taskKey => (
                    <div key={taskKey} className="grid grid-cols-2 gap-4 items-center p-2 rounded-lg hover:bg-gray-800/50">
                        <label htmlFor={`assign-${taskKey}`} className="text-sm font-medium text-cyan-300 justify-self-start">
                           {aiInstructionLabels[taskKey]}
                        </label>
                        <select
                            id={`assign-${taskKey}`}
                            value={modelAssignments[taskKey] || settings.defaultProvider}
                            onChange={(e) => handleAssignmentChange(taskKey, e.target.value as AIModelProvider)}
                             className="w-full max-w-xs bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm justify-self-end"
                        >
                            <option value="gemini" disabled={!isProviderEnabled('gemini')}>Google Gemini (پیش‌فرض)</option>
                            <option value="openai" disabled={!isProviderEnabled('openai')}>OpenAI</option>
                            <option value="openrouter" disabled={!isProviderEnabled('openrouter')}>OpenRouter</option>
                            <option value="groq" disabled={!isProviderEnabled('groq')}>Groq</option>
                        </select>
                    </div>
                 ))}
            </div>
        </div>
    );
};

export default AIModelAssignments;