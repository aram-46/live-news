import React, { useState } from 'react';
import { AppSettings, AnalyzerTabId, analyzerTabLabels } from '../types';
import DeepAnalysis from './DeepAnalysis';
import MediaAnalyzer from './MediaAnalyzer';

interface AnalyzerProps {
  settings: AppSettings;
}

const Analyzer: React.FC<AnalyzerProps> = ({ settings }) => {
    const [activeTab, setActiveTab] = useState<AnalyzerTabId>('political');

    const renderTabButton = (tabId: AnalyzerTabId, label: string) => (
        <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 whitespace-nowrap ${
                activeTab === tabId
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex border-b border-cyan-400/20 mb-6 overflow-x-auto">
                {(Object.keys(analyzerTabLabels) as AnalyzerTabId[]).map(key =>
                    renderTabButton(key, analyzerTabLabels[key])
                )}
            </div>
            <div>
                {activeTab === 'media' ? (
                    <MediaAnalyzer settings={settings} />
                ) : (
                    <DeepAnalysis settings={settings} activeAnalysisTab={activeTab} />
                )}
            </div>
        </div>
    );
};

export default Analyzer;
