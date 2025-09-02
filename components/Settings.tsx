
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
import AppwriteSettings from './settings/AppwriteSettings';
import GitHubSettings from './settings/GitHubSettings';
import AboutTab from './settings/AboutTab';
import FontSettingsEditor from './settings/FontSettingsEditor';
import PasswordSettings from './settings/PasswordSettings';
import ThemeSettings from './settings/ThemeSettings';
import { ALL_THEMES } from '../data/defaults';
import DiscordBotSettings from './settings/DiscordBotSettings';
import InstallationGuide from './settings/InstallationGuide';
import AIModelAssignments from './settings/AIModelAssignments';


interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type SettingsTab = 'content' | 'theme' | 'sources' | 'ai-instructions' | 'ai-models' | 'ai-assignments' | 'integrations' | 'discord-bot' | 'backend' | 'cloudflare' | 'appwrite' | 'github' | 'about' | 'security' | 'installation';

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
        {renderTabButton('ai-instructions', 'دستورالعمل‌های AI')}
        {renderTabButton('ai-models', 'مدل‌های AI')}
        {renderTabButton('ai-assignments', 'تخصیص مدل‌ها')}
        {renderTabButton('installation', 'نصب و راه‌اندازی')}
        {renderTabButton('integrations', 'اتصالات وب‌سایت')}
        {renderTabButton('discord-bot', 'ربات دیسکورد')}
        {renderTabButton('security', 'امنیت')}
        {renderTabButton('backend', 'بک‌اند و دیتابیس')}
        {renderTabButton('cloudflare', 'کلودفلر')}
        {renderTabButton('appwrite', 'اپ‌رایت')}
        {renderTabButton('github', 'گیت‌هاب')}
        {renderTabButton('about', 'درباره برنامه')}
      </div>

      <div className="space-y-8">
        {activeTab === 'theme' && (
          <>
            <ThemeSelector
              themes={ALL_THEMES}
              selectedTheme={settings.theme}
              onThemeChange={(theme) => handlePartialChange({ theme })}
            />
            <ThemeSettings settings={settings} onSettingsChange={onSettingsChange} />
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

        {activeTab === 'ai-instructions' && (
            <AIInstructionsSettings
                settings={settings}
                instructions={settings.aiInstructions}
                onInstructionsChange={(aiInstructions) => handlePartialChange({ aiInstructions })}
            />
        )}

        {activeTab === 'ai-models' && (
            <AIModelSettings
                settings={settings.aiModelSettings}
                onSettingsChange={(aiModelSettings) => handlePartialChange({ aiModelSettings })}
            />
        )}
        
        {activeTab === 'ai-assignments' && (
            <AIModelAssignments
                settings={settings}
                onAssignmentsChange={(modelAssignments) => handlePartialChange({ modelAssignments })}
            />
        )}

        {activeTab === 'installation' && <InstallationGuide />}

        {activeTab === 'integrations' && (
            <IntegrationSettings
                settings={settings.integrations}
                onSettingsChange={(integrations) => handlePartialChange({ integrations })}
            />
        )}
        
        {activeTab === 'discord-bot' && (
            <DiscordBotSettings />
        )}

        {activeTab === 'sources' && (
            <SourcesManager
                sources={settings.sources}
                onSourcesChange={(sources) => handlePartialChange({ sources })}
                settings={settings}
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
        {activeTab === 'appwrite' && <AppwriteSettings settings={settings.integrations.appwrite} onSettingsChange={(appwrite) => handlePartialChange({ integrations: { ...settings.integrations, appwrite }})} />}
        {activeTab === 'github' && <GitHubSettings />}
        {activeTab === 'about' && <AboutTab />}
      </div>
    </div>
  );
};

export default Settings;
