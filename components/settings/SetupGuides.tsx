import React, { useState } from 'react';
import InstallationGuide from './InstallationGuide'; // cPanel
import BackendSettings from './BackendSettings';
import CloudflareSettings from './CloudflareSettings';
import AppwriteSettings from './AppwriteSettings';
import GitHubSettings from './GitHubSettings';
import { AppSettings } from '../../types';

interface SetupGuidesProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type GuideTab = 'cpanel' | 'backend' | 'cloudflare' | 'appwrite' | 'github';

const SetupGuides: React.FC<SetupGuidesProps> = ({ settings, onSettingsChange }) => {
    const [activeTab, setActiveTab] = useState<GuideTab>('cpanel');

    const handlePartialChange = (change: Partial<AppSettings>) => {
        onSettingsChange({ ...settings, ...change });
    };

    const renderTabButton = (tabId: GuideTab, label: string) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-3 py-2 text-sm font-medium transition-colors duration-300 border-b-2 whitespace-nowrap ${
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
                {renderTabButton('cpanel', 'نصب در cPanel')}
                {renderTabButton('backend', 'بک‌اند (Node.js)')}
                {renderTabButton('cloudflare', 'کلودفلر (Serverless)')}
                {renderTabButton('appwrite', 'اپ‌رایت (BaaS)')}
                {renderTabButton('github', 'گیت‌هاب (Actions)')}
            </div>
            
            {activeTab === 'cpanel' && <InstallationGuide />}
            {activeTab === 'backend' && <BackendSettings />}
            {activeTab === 'cloudflare' && <CloudflareSettings />}
            {activeTab === 'appwrite' && <AppwriteSettings settings={settings.integrations.appwrite} onSettingsChange={(appwrite) => handlePartialChange({ integrations: { ...settings.integrations, appwrite }})} />}
            {activeTab === 'github' && <GitHubSettings />}
        </div>
    );
};
export default SetupGuides;
