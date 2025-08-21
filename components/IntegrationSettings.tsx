
import React, { useState } from 'react';
import { IntegrationSettings } from '../types';
import { TelegramIcon, DiscordIcon, CheckCircleIcon, CloseIcon } from './icons';
import { testTelegramConnection, testDiscordConnection } from '../services/integrationService';
import HelpModal from './HelpModal';


interface IntegrationSettingsProps {
  settings: IntegrationSettings;
  onSettingsChange: (settings: IntegrationSettings) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const IntegrationSettingsComponent: React.FC<IntegrationSettingsProps> = ({ settings, onSettingsChange }) => {
    const [telegramStatus, setTelegramStatus] = useState<TestStatus>('idle');
    const [discordStatus, setDiscordStatus] = useState<TestStatus>('idle');
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    
    const handleTelegramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTelegramStatus('idle');
        onSettingsChange({
            ...settings,
            telegram: { ...settings.telegram, [e.target.name]: e.target.value }
        });
    };

    const handleDiscordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDiscordStatus('idle');
        onSettingsChange({
            ...settings,
            discord: { ...settings.discord, [e.target.name]: e.target.value }
        });
    };

    const handleTestTelegram = async () => {
        setTelegramStatus('testing');
        const success = await testTelegramConnection(settings.telegram);
        setTelegramStatus(success ? 'success' : 'error');
        setTimeout(() => setTelegramStatus('idle'), 4000);
    };

    const handleTestDiscord = async () => {
        setDiscordStatus('testing');
        const success = await testDiscordConnection(settings.discord);
        setDiscordStatus(success ? 'success' : 'error');
         setTimeout(() => setDiscordStatus('idle'), 4000);
    };

    const renderStatusIcon = (status: TestStatus) => {
        if (status === 'testing') return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
        if (status === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        if (status === 'error') return <CloseIcon className="w-5 h-5 text-red-400" />;
        return null;
    }


  return (
    <>
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-cyan-300">تنظیمات اتصالات (Telegram & Discord)</h2>
        <button onClick={() => setIsHelpOpen(true)} className="text-sm text-cyan-400 hover:underline">راهنما</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Telegram Settings */}
        <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-cyan-200">
                <TelegramIcon className="w-6 h-6"/>
                <span>تلگرام</span>
            </h3>
            <div>
                <label htmlFor="botToken" className="block text-sm font-medium text-cyan-300 mb-2">توکن ربات (Bot Token)</label>
                <input
                    id="botToken"
                    name="botToken"
                    type="password"
                    value={settings.telegram.botToken}
                    onChange={handleTelegramChange}
                    placeholder="توکن ربات تلگرام خود را وارد کنید"
                    className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5"
                />
            </div>
            <div>
                <label htmlFor="chatId" className="block text-sm font-medium text-cyan-300 mb-2">شناسه چت (Chat ID)</label>
                <input
                    id="chatId"
                    name="chatId"
                    type="text"
                    value={settings.telegram.chatId}
                    onChange={handleTelegramChange}
                    placeholder="شناسه کانال یا کاربر (مثال: @channelname)"
                    className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5"
                />
            </div>
             <div className="flex items-center gap-2">
                <button onClick={handleTestTelegram} disabled={!settings.telegram.botToken || telegramStatus === 'testing'} className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                <div className="w-5 h-5">{renderStatusIcon(telegramStatus)}</div>
            </div>
        </div>
        
        {/* Discord Settings */}
        <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-cyan-200">
                <DiscordIcon className="w-6 h-6"/>
                <span>دیسکورد</span>
            </h3>
            <div>
                <label htmlFor="webhookUrl" className="block text-sm font-medium text-cyan-300 mb-2">آدرس وبهوک (Webhook URL)</label>
                <input
                    id="webhookUrl"
                    name="webhookUrl"
                    type="password"
                    value={settings.discord.webhookUrl}
                    onChange={handleDiscordChange}
                    placeholder="آدرس وبهوک کانال دیسکورد"
                    className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 p-2.5"
                />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleTestDiscord} disabled={!settings.discord.webhookUrl || discordStatus === 'testing'} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست اتصال</button>
                <div className="w-5 h-5">{renderStatusIcon(discordStatus)}</div>
            </div>
            <p className="text-xs text-gray-500 pt-8">
               توجه: این اطلاعات فقط در مرورگر شما ذخیره می‌شوند و به هیچ سروری ارسال نمی‌گردند.
            </p>
        </div>

      </div>
    </div>
    {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </>
  );
};

export default IntegrationSettingsComponent;
