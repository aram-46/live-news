import React, { useState } from 'react';
import { AppSettings } from '../types';
import { BrowserIcon, SparklesIcon } from './icons';
import SourceSearch from './browser/SourceSearch';
import WebAgent from './browser/WebAgent';

interface BrowserUseProps {
    settings: AppSettings;
}

type BrowserTab = 'source-search' | 'web-agent';

const BrowserUse: React.FC<BrowserUseProps> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<BrowserTab>('source-search');

    const renderTabButton = (tabId: BrowserTab, label: string, icon: React.ReactNode) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
                activeTab === tabId
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex border-b border-cyan-400/20 overflow-x-auto">
                {renderTabButton('source-search', 'جستجو در منابع', <BrowserIcon className="w-5 h-5" />)}
                {renderTabButton('web-agent', 'عامل هوشمند وب', <SparklesIcon className="w-5 h-5" />)}
            </div>

            <div>
                {activeTab === 'source-search' && <SourceSearch settings={settings} />}
                {activeTab === 'web-agent' && <WebAgent settings={settings} />}
            </div>
        </div>
    );
};

export default BrowserUse;
