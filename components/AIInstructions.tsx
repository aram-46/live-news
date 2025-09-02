
import React, { useState } from 'react';
import { AIInstructions, AIInstructionType, aiInstructionLabels, AppSettings } from '../types';
import { generateAIInstruction, testAIInstruction } from '../services/geminiService';
import { MagicIcon, CheckCircleIcon, CloseIcon } from './icons';

interface AIInstructionsProps {
  instructions: AIInstructions;
  onInstructionsChange: (instructions: AIInstructions) => void;
  settings: AppSettings; // Add settings to props
}

const AIInstructionsSettings: React.FC<AIInstructionsProps> = ({ instructions, onInstructionsChange, settings }) => {
  const [loadingInstruction, setLoadingInstruction] = useState<AIInstructionType | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({});


  const handleChange = (type: AIInstructionType, value: string) => {
    onInstructionsChange({
      ...instructions,
      [type]: value,
    });
     setTestStatus(prev => ({ ...prev, [type]: 'idle' }));
  };

  const handleGenerateWithAI = async (type: AIInstructionType) => {
    setLoadingInstruction(type);
    try {
      // FIX: Removed extra 'settings' argument.
      const generatedInstruction = await generateAIInstruction(aiInstructionLabels[type]);
      handleChange(type, generatedInstruction);
    } catch (error) {
      console.error("Failed to generate instruction with AI", error);
      alert(`خطا در تولید دستورالعمل برای "${aiInstructionLabels[type]}"`);
    } finally {
      setLoadingInstruction(null);
    }
  };

  const handleTestInstruction = async (type: AIInstructionType) => {
      setTestStatus(prev => ({...prev, [type]: 'testing'}));
      // FIX: Removed extra 'settings' argument.
      const success = await testAIInstruction(instructions[type]);
      setTestStatus(prev => ({...prev, [type]: success ? 'success' : 'error'}));
      setTimeout(() => setTestStatus(prev => ({...prev, [type]: 'idle'})), 4000);
  };
  
  const renderStatusIcon = (status: 'idle' | 'testing' | 'success' | 'error') => {
        if (status === 'testing') return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>;
        if (status === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        if (status === 'error') return <CloseIcon className="w-5 h-5 text-red-400" />;
        return <div className="w-5 h-5" />;
  }


  return (
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <h2 className="text-xl font-bold mb-4 text-cyan-300">
        تنظیمات رفتار هوش مصنوعی
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        در این بخش می‌توانید دستورالعمل‌های خاصی برای هوش مصنوعی در وظایف مختلف تعریف کنید.
      </p>
      <div className="space-y-6">
        {(Object.keys(aiInstructionLabels) as AIInstructionType[]).map((key) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor={`instruction-${key}`} className="block text-sm font-medium text-cyan-300">
                {aiInstructionLabels[key]}
              </label>
              <button
                onClick={() => handleGenerateWithAI(key)}
                disabled={loadingInstruction === key}
                className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 disabled:opacity-50"
              >
                {loadingInstruction === key ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                ) : (
                  <MagicIcon className="w-4 h-4" />
                )}
                <span>تولید با AI (فارسی)</span>
              </button>
            </div>
            <div className="flex items-start gap-2">
                <textarea
                  id={`instruction-${key}`}
                  value={instructions[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  rows={4}
                  className="flex-grow w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5"
                  placeholder={`دستورالعمل‌های خود را برای ${aiInstructionLabels[key]} وارد کنید...`}
                />
                <div className="flex flex-col gap-2 items-center">
                    <button
                        onClick={() => handleTestInstruction(key)}
                        disabled={testStatus[key] === 'testing' || !instructions[key]}
                        className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold p-2 rounded-lg transition duration-300 flex-shrink-0 disabled:opacity-50"
                        title="تست و اعمال دستورالعمل"
                    >
                        تست
                    </button>
                    {renderStatusIcon(testStatus[key] || 'idle')}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIInstructionsSettings;
