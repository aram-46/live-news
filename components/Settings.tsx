

import React, { useState } from 'react';
import { AppSettings } from '../types';
import ThemeSelector from './ThemeSelector';
import SourcesManager from './SourcesManager';
import AIInstructionsSettings from './AIInstructions';
import DisplaySettings from './DisplaySettings';
import TickerSettings from './TickerSettings';
import IntegrationSettings from './IntegrationSettings';
import DatabaseSettings from './DatabaseSettings';
import CustomCssSettings from './CustomCssSettings';
import FilterOptionsSettings from './FilterOptionsSettings';
import AIModelSettings from './AIModelSettings';

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type SettingsTab = 'theme' | 'display' | 'ai' | 'integrations' | 'sources';

const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme');

  const handlePartialChange = (change: Partial<AppSettings>) => {
    onSettingsChange({ ...settings, ...change });
  };

  const renderTabButton = (tabId: SettingsTab, label: string) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
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
        {renderTabButton('theme', 'تم / استایل')}
        {renderTabButton('display', 'نمایش / نوار اخبار')}
        {renderTabButton('ai', 'رفتار هوش مصنوعی')}
        {renderTabButton('integrations', 'اتصالات')}
        {renderTabButton('sources', 'مدیریت منابع')}
      </div>

      <div className="space-y-8">
        {activeTab === 'theme' && (
          <>
            <ThemeSelector
              themes={[{ id: 'base', name: 'پیش‌فرض (اقیانوس)', className: 'theme-base' }, { id: 'neon-dreams', name: 'رویای نئونی', className: 'theme-neon-dreams' }, { id: 'solar-flare', name: 'شراره خورشیدی', className: 'theme-solar-flare' }]}
              selectedTheme={settings.theme}
              onThemeChange={(theme) => handlePartialChange({ theme })}
            />
            <CustomCssSettings
              customCss={settings.customCss}
              onCustomCssChange={(customCss) => handlePartialChange({ customCss })}
            />
          </>
        )}
        
        {activeTab === 'display' && (
            <>
                <DisplaySettings
                    settings={settings.display}
                    allCategories={settings.searchCategories}
                    onSettingsChange={(display) => handlePartialChange({ display })}
                />
                <TickerSettings
                    settings={settings.ticker}
                    allCategories={settings.allTickerCategories}
                    onSettingsChange={(ticker) => handlePartialChange({ ticker })}
                />
                <FilterOptionsSettings
                    searchCategories={settings.searchCategories}
                    searchRegions={settings.searchRegions}
                    allTickerCategories={settings.allTickerCategories}
                    onSettingsChange={handlePartialChange}
                />
            </>
        )}

        {activeTab === 'ai' && (
            <AIInstructionsSettings
                instructions={settings.aiInstructions}
                onInstructionsChange={(aiInstructions) => handlePartialChange({ aiInstructions })}
            />
        )}

        {activeTab === 'integrations' && (
            <>
                <AIModelSettings
                    settings={settings.aiModelSettings}
                    onSettingsChange={(aiModelSettings) => handlePartialChange({ aiModelSettings })}
                />
                <IntegrationSettings
                    settings={settings.integrations}
                    onSettingsChange={(integrations) => handlePartialChange({ integrations })}
                />
                <DatabaseSettings
                    settings={settings.database}
                    onSettingsChange={(database) => handlePartialChange({ database })}
                />
            </>
        )}
        
        {activeTab === 'sources' && (
            <SourcesManager
                sources={settings.sources}
                onSourcesChange={(sources) => handlePartialChange({ sources })}
            />
        )}
      </div>
    </div>
  );
};

export default Settings;