
import React from 'react';
import { AppSettings, AIInstructionType, aiInstructionLabels, AIModelProvider } from '../../types';

interface AIModelAssignmentsProps {
  settings: AppSettings;
  onAssignmentsChange: (assignments: Partial<Record<AIInstructionType, AIModelProvider>>) => void;
}

const AIModelAssignments: React.FC<AIModelAssignmentsProps> = ({ settings, onAssignmentsChange }) => {
    const { aiModelSettings, modelAssignments } = settings;

    const handleAssignmentChange = (task: AIInstructionType, provider: AIModelProvider) => {
        onAssignmentsChange({
            ...modelAssignments,
            [task]: provider
        });
    };

    const isProviderEnabled = (provider: AIModelProvider): boolean => {
        if (provider === 'gemini') return !!process.env.API_KEY;
        if (provider === 'openai') return !!aiModelSettings.openai.apiKey;
        if (provider === 'openrouter') return !!aiModelSettings.openrouter.apiKey;
        if (provider === 'groq') return !!aiModelSettings.groq.apiKey;
        return false;
    }

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-xl font-bold mb-2 text-cyan-300">تخصیص مدل به قابلیت‌ها</h2>
            <p className="text-sm text-gray-400 mb-6">
                برای هر قابلیت، مدل هوش مصنوعی مورد نظر خود را انتخاب کنید. مدل‌هایی که کلید API آن‌ها در تب "مدل‌های AI" وارد نشده باشد، غیرفعال خواهند بود.
            </p>
            <div className="space-y-4">
                 {(Object.keys(aiInstructionLabels) as AIInstructionType[]).map(taskKey => (
                    <div key={taskKey} className="grid grid-cols-2 gap-4 items-center p-2 rounded-lg hover:bg-gray-800/50">
                        <label htmlFor={`assign-${taskKey}`} className="text-sm font-medium text-cyan-300 justify-self-start">
                           {aiInstructionLabels[taskKey]}
                        </label>
                        <select
                            id={`assign-${taskKey}`}
                            value={modelAssignments[taskKey] || 'gemini'}
                            onChange={(e) => handleAssignmentChange(taskKey, e.target.value as AIModelProvider)}
                             className="w-full max-w-xs bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2 text-sm justify-self-end"
                        >
                            <option value="gemini" disabled={!isProviderEnabled('gemini')}>Google Gemini</option>
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
