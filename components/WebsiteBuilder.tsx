import React, { useState } from 'react';
import { AppSettings } from '../types';
import ContentCreator from './ContentCreator';
import PageBuilder from './PageBuilder';
import { DocumentTextIcon, SparklesIcon } from './icons';

type BuilderTab = 'content-creator' | 'page-builder';

interface WebsiteBuilderProps {
    settings: AppSettings;
}

const WebsiteBuilder: React.FC<WebsiteBuilderProps> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<BuilderTab>('page-builder');

    const renderTabButton = (tabId: BuilderTab, label: string, icon: React.ReactNode) => (
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
                {renderTabButton('content-creator', 'محتوا ساز', <SparklesIcon className="w-5 h-5" />)}
                {renderTabButton('page-builder', 'صفحه ساز', <DocumentTextIcon className="w-5 h-5" />)}
            </div>
            <div>
                {activeTab === 'content-creator' && <ContentCreator settings={settings} />}
                {activeTab === 'page-builder' && <PageBuilder settings={settings} />}
            </div>
        </div>
    );
};

export default WebsiteBuilder;
