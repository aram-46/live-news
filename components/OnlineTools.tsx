import React, { useState } from 'react';
import { AppSettings } from '../types';
import WebsiteBuilder from './WebsiteBuilder';
import { SparklesIcon, DocumentTextIcon } from './icons';
import TextFormatter from './TextFormatter';

type ToolTab = 'website-builder' | 'text-formatter';

interface OnlineToolsProps {
    settings: AppSettings;
}

const OnlineTools: React.FC<OnlineToolsProps> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<ToolTab>('website-builder');
    
    const renderTabButton = (tabId: ToolTab, label: string, icon: React.ReactNode) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
                activeTab === tabId
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex border-b border-cyan-400/20 overflow-x-auto">
                {renderTabButton('website-builder', 'سایت ساز', <SparklesIcon className="w-5 h-5" />)}
                {renderTabButton('text-formatter', 'متن ساز', <DocumentTextIcon className="w-5 h-5" />)}
                {/* Future tools can be added here */}
            </div>
            <div>
                {activeTab === 'website-builder' && <WebsiteBuilder settings={settings} />}
                {activeTab === 'text-formatter' && <TextFormatter settings={settings} />}
            </div>
        </div>
    );
};

export default OnlineTools;