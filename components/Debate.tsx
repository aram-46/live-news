import React, { useState } from 'react';
import { AppSettings } from '../types';
import DebateSimulator from './DebateSimulator';
import ConductDebate from './ConductDebate';
import { BrainIcon, GavelIcon } from './icons';

interface DebateProps {
    settings: AppSettings;
}

const Debate: React.FC<DebateProps> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<'simulator' | 'conduct'>('simulator');

    const renderTabButton = (tabId: 'simulator' | 'conduct', label: string, icon: React.ReactNode) => (
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
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-3">
                    <BrainIcon className="w-6 h-6"/>
                    استودیو مناظره
                </h2>
                <div className="flex border-b border-cyan-400/20">
                    {renderTabButton('simulator', 'شبیه‌ساز مناظره', <BrainIcon className="w-5 h-5" />)}
                    {renderTabButton('conduct', 'مناظره با AI', <GavelIcon className="w-5 h-5" />)}
                </div>
            </div>
            
            {activeTab === 'simulator' && <DebateSimulator settings={settings} />}
            {activeTab === 'conduct' && <ConductDebate settings={settings} />}
        </div>
    );
};

export default Debate;