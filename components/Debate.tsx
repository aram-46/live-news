import React, { useState } from 'react';
import { AppSettings } from '../types';
import DebateSimulator from './DebateSimulator';
import { BrainIcon, ChatIcon } from './icons';
import ConductDebate from './ConductDebate';

interface DebateProps {
    settings: AppSettings;
}

type DebateTab = 'simulator' | 'conduct';

const Debate: React.FC<DebateProps> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<DebateTab>('simulator');

    const renderTabButton = (tabId: DebateTab, label: string, icon: React.ReactNode) => (
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
                {renderTabButton('simulator', 'شبیه‌ساز مناظره', <BrainIcon className="w-5 h-5" />)}
                {renderTabButton('conduct', 'مناظره کن', <ChatIcon className="w-5 h-5" />)}
            </div>
            <div>
                {activeTab === 'simulator' && <DebateSimulator settings={settings} />}
                {activeTab === 'conduct' && <ConductDebate settings={settings} />}
            </div>
        </div>
    );
};

export default Debate;