



import React, { useState } from 'react';
import { AppSettings } from '../types';
import ThemeSelector from './ThemeSelector';
import SourcesManager from './SourcesManager';
import AIInstructionsSettings from './AIInstructions';
import IntegrationSettings from './IntegrationSettings';
import CustomCssSettings from './CustomCssSettings';
import AIModelSettings from './AIModelSettings';
import ContentSettings from './ContentSettings';
import BackendSettings from './settings/BackendSettings';
import CloudflareSettings from './settings/CloudflareSettings';
import GitHubSettings from './settings/GitHubSettings';
import AboutTab from './settings/AboutTab';
import FontSettingsEditor from './settings/FontSettingsEditor';
import PasswordSettings from './settings/PasswordSettings';

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type SettingsTab = 'content' | 'theme' | 'sources' | 'ai' | 'integrations' | 'backend' | 'cloudflare' | 'github' | 'about' | 'security';

const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('content');

  const handlePartialChange = (change: Partial<AppSettings>) => {
    onSettingsChange({ ...settings, ...change });
  };

  const renderTabButton = (tabId: SettingsTab, label: string) => (
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
        {renderTabButton('content', 'محتوا و نمایش')}
        {renderTabButton('theme', 'تم / استایل')}
        {renderTabButton('sources', 'منابع')}
        {renderTabButton('ai', 'هوش مصنوعی')}
        {renderTabButton('integrations', 'اتصالات')}
        {renderTabButton('security', 'امنیت')}
        {renderTabButton('backend', 'بک‌اند و دیتابیس')}
        {renderTabButton('cloudflare', 'کلودفلر')}
        {renderTabButton('github', 'گیت‌هاب')}
        {renderTabButton('about', 'درباره برنامه')}
      </div>

      <div className="space-y-8">
        {activeTab === 'theme' && (
          <>
            <ThemeSelector
              themes={[{ id: 'base', name: 'پیش‌فرض (اقیانوس)', className: 'theme-base' }, { id: 'neon-dreams', name: 'رویای نئونی', className: 'theme-neon-dreams' }, { id: 'solar-flare', name: 'شراره خورشیدی', className: 'theme-solar-flare' }]}
              selectedTheme={settings.theme}
              onThemeChange={(theme) => handlePartialChange({ theme })}
            />
            <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
                <FontSettingsEditor
                    fontSettings={settings.liveNewsSpecifics.font}
                    onFontSettingsChange={(font) => handlePartialChange({ liveNewsSpecifics: { ...settings.liveNewsSpecifics, font }})}
                />
            </div>
            <CustomCssSettings
              customCss={settings.customCss}
              onCustomCssChange={(customCss) => handlePartialChange({ customCss })}
            />
          </>
        )}
        
        {activeTab === 'content' && (
            <ContentSettings
                settings={settings}
                onSettingsChange={onSettingsChange}
            />
        )}

        {activeTab === 'ai' && (
             <>
                <AIInstructionsSettings
                    instructions={settings.aiInstructions}
                    onInstructionsChange={(aiInstructions) => handlePartialChange({ aiInstructions })}
                />
                <AIModelSettings
                    settings={settings.aiModelSettings}
                    onSettingsChange={(aiModelSettings) => handlePartialChange({ aiModelSettings })}
                />
            </>
        )}

        {activeTab === 'integrations' && (
            <IntegrationSettings
                settings={settings.integrations}
                onSettingsChange={(integrations) => handlePartialChange({ integrations })}
            />
        )}
        
        {activeTab === 'sources' && (
            <SourcesManager
                sources={settings.sources}
                onSourcesChange={(sources) => handlePartialChange({ sources })}
            />
        )}

        {activeTab === 'security' && (
            <PasswordSettings
                password={settings.password || ''}
                onPasswordChange={(password) => handlePartialChange({ password })}
            />
        )}

        {activeTab === 'backend' && <BackendSettings />}
        {activeTab === 'cloudflare' && <CloudflareSettings />}
        {activeTab === 'github' && <GitHubSettings />}
        {activeTab === 'about' && <AboutTab />}
      </div>
    </div>
  );
};

export default Settings;