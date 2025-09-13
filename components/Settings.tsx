
import React, { useState } from 'react';
import { AppSettings } from '../types';
import SourcesManager from './SourcesManager';
import RSSFeedManager from './RSSFeedManager';
import AIInstructionsSettings from './AIInstructions';
import AIModelSettings from './settings/AIModelSettings';
import ContentSettings from './ContentSettings';
import PasswordSettings from './settings/PasswordSettings';
import ThemeSettings from './settings/ThemeSettings';
import DiscordBotSettings from './settings/DiscordBotSettings';
import AIModelAssignments from './settings/AIModelAssignments';
import SetupGuides from './settings/SetupGuides';
import TelegramBotSettings from './settings/TelegramBotSettings';
import TwitterBotSettings from './settings/TwitterBotSettings';
import IntegrationSettings from './IntegrationSettings';
import AboutTab from './settings/AboutTab';
import DataManagementSettings from './settings/DataManagementSettings';


interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type SettingsTab = 
    | 'content' | 'theme' | 'sources' | 'rss-feeds' | 'ai-instructions' | 'ai-models' | 'ai-assignments' 
    | 'setup-guides' | 'telegram-bot' | 'discord-bot' | 'twitter-bot' 
    | 'integrations' | 'security' | 'about';

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
        {renderTabButton('rss-feeds', 'خبرخوان‌ها')}
        {renderTabButton('ai-instructions', 'دستورالعمل‌های AI')}
        {renderTabButton('ai-models', 'مدل‌های AI')}
        {renderTabButton('ai-assignments', 'تخصیص مدل‌ها')}
        {renderTabButton('setup-guides', 'نصب و راه‌اندازی')}
        {renderTabButton('telegram-bot', 'ربات تلگرام')}
        {renderTabButton('discord-bot', 'ربات دیسکورد')}
        {renderTabButton('twitter-bot', 'ربات توییتر')}
        {renderTabButton('integrations', 'اتصالات دیگر')}
        {renderTabButton('security', 'امنیت و داده‌ها')}
        {renderTabButton('about', 'درباره برنامه')}
      </div>

      <div className="space-y-8">
        {activeTab === 'theme' && (
            <ThemeSettings settings={settings} onSettingsChange={onSettingsChange} />
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
                settings={settings}
                onSettingsChange={onSettingsChange}
            />
        )}
        
        {activeTab === 'ai-assignments' && (
            <AIModelAssignments
                settings={settings}
                onAssignmentsChange={(modelAssignments) => handlePartialChange({ modelAssignments })}
            />
        )}

        {activeTab === 'setup-guides' && <SetupGuides settings={settings} onSettingsChange={onSettingsChange} />}

        {activeTab === 'telegram-bot' && (
            <TelegramBotSettings 
                settings={settings.integrations.telegram}
                onSettingsChange={(telegram) => handlePartialChange({ integrations: { ...settings.integrations, telegram }})}
            />
        )}
        
        {activeTab === 'discord-bot' && (
            <DiscordBotSettings />
        )}

        {activeTab === 'twitter-bot' && (
            <TwitterBotSettings 
                settings={settings.integrations.twitter}
                onSettingsChange={(twitter) => handlePartialChange({ integrations: { ...settings.integrations, twitter }})}
            />
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
                settings={settings}
            />
        )}

        {activeTab === 'rss-feeds' && (
            <RSSFeedManager
                feeds={settings.rssFeeds}
                onFeedsChange={(rssFeeds) => handlePartialChange({ rssFeeds })}
                settings={settings}
            />
        )}

        {activeTab === 'security' && (
            <div className="space-y-8">
                <PasswordSettings
                    password={settings.password || ''}
                    onPasswordChange={(password) => handlePartialChange({ password })}
                />
                <DataManagementSettings />
            </div>
        )}
        
        {activeTab === 'about' && <AboutTab />}
      </div>
    </div>
  );
};

export default Settings;
