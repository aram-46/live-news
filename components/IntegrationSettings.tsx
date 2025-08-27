


import React, { useState } from 'react';
import { IntegrationSettings, WebsiteSettings } from '../types';
import { TelegramIcon, DiscordIcon, CheckCircleIcon, CloseIcon, WebsiteIcon, TwitterIcon, AppwriteIcon, SupabaseIcon, PlusIcon, TrashIcon } from './icons';
import { testTelegramConnection, testDiscordConnection, testWebsiteConnection, testTwitterConnection, testAppwriteConnection, testSupabaseConnection } from '../services/integrationService';
import HelpModal from './HelpModal';


interface IntegrationSettingsProps {
  settings: IntegrationSettings;
  onSettingsChange: (settings: IntegrationSettings) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const RoomIdInput: React.FC<{ roomIds: string[]; onRoomIdsChange: (ids: string[]) => void }> = ({ roomIds, onRoomIdsChange }) => {
    const [currentId, setCurrentId] = useState('');
    const handleAdd = () => {
        if (currentId.trim() && !roomIds.includes(currentId.trim())) {
            onRoomIdsChange([...roomIds, currentId.trim()]);
            setCurrentId('');
        }
    };
    const handleRemove = (idToRemove: string) => {
        onRoomIdsChange(roomIds.filter(id => id !== idToRemove));
    };
    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={currentId}
                    onChange={(e) => setCurrentId(e.target.value)}
                    placeholder="شناسه اتاق یا آدرس صفحه..."
                    className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }}}
                />
                <button onClick={handleAdd} className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold p-2.5 rounded-lg">
                    <PlusIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[30px]">
                {roomIds.map(id => (
                    <div key={id} className="flex items-center gap-1.5 bg-gray-700 rounded-full px-2 py-1 text-xs">
                        <span>{id}</span>
                        <button onClick={() => handleRemove(id)} className="text-gray-400 hover:text-red-400">
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};


const IntegrationSettingsComponent: React.FC<IntegrationSettingsProps> = ({ settings, onSettingsChange }) => {
    const [status, setStatus] = useState<Record<string, TestStatus>>({});
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    
    // FIX: Correctly handle updates for nested setting objects and fix spread type errors.
    // The subfield logic was flawed and unused. This version correctly updates 2-level deep settings.
    const handleChange = (platform: keyof IntegrationSettings, field: string, value: any) => {
        setStatus(prev => ({...prev, [platform]: 'idle'}));
        const platformValue = settings[platform];

        if (typeof platformValue === 'object' && platformValue !== null) {
            onSettingsChange({
                ...settings,
                [platform]: {
                    ...(platformValue as object),
                    [field]: value
                }
            });
        }
    };

    const runTest = async (platform: string, testFn: () => Promise<boolean>) => {
        setStatus(prev => ({...prev, [platform]: 'testing' }));
        const success = await testFn();
        setStatus(prev => ({...prev, [platform]: success ? 'success' : 'error' }));
        setTimeout(() => setStatus(prev => ({...prev, [platform]: 'idle' })), 4000);
    };

    const renderStatusIcon = (platformStatus: TestStatus) => {
        if (platformStatus === 'testing') return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
        if (platformStatus === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        if (platformStatus === 'error') return <CloseIcon className="w-5 h-5 text-red-400" />;
        return null;
    }


  return (
    <>
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-cyan-300">اتصالات و یکپارچه‌سازی</h2>
        <button onClick={() => setIsHelpOpen(true)} className="text-sm text-cyan-400 hover:underline">راهنمای کامل</button>
      </div>

        {/* --- Communication Integrations --- */}
        <div className="space-y-6">
            <h3 className="font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">ارتباطات و شبکه‌های اجتماعی</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Telegram */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-200"><TelegramIcon className="w-6 h-6"/><span>تلگرام</span></h4>
                    <input type="password" value={settings.telegram.botToken} onChange={(e) => handleChange('telegram', 'botToken', e.target.value)} placeholder="توکن ربات (Bot Token)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <input type="text" value={settings.telegram.chatId} onChange={(e) => handleChange('telegram', 'chatId', e.target.value)} placeholder="شناسه چت (Chat ID)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <div className="flex items-center gap-2"><button onClick={() => runTest('telegram', () => testTelegramConnection(settings.telegram))} disabled={!settings.telegram.botToken || status['telegram'] === 'testing'} className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست</button><div className="w-5 h-5">{renderStatusIcon(status['telegram'])}</div></div>
                </div>
                 {/* Discord */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-200"><DiscordIcon className="w-6 h-6"/><span>دیسکورد</span></h4>
                    <input type="password" value={settings.discord.webhookUrl} onChange={(e) => handleChange('discord', 'webhookUrl', e.target.value)} placeholder="آدرس وبهوک (Webhook URL)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <div className="flex items-center gap-2"><button onClick={() => runTest('discord', () => testDiscordConnection(settings.discord))} disabled={!settings.discord.webhookUrl || status['discord'] === 'testing'} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست</button><div className="w-5 h-5">{renderStatusIcon(status['discord'])}</div></div>
                </div>
                 {/* Website */}
                <div className="space-y-4 md:col-span-2">
                    <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-200"><WebsiteIcon className="w-6 h-6"/><span>وب‌سایت (Grupo Chat)</span></h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" value={settings.website.apiUrl} onChange={(e) => handleChange('website', 'apiUrl', e.target.value)} placeholder="آدرس سایت (API URL)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        <input type="password" value={settings.website.apiKey} onChange={(e) => handleChange('website', 'apiKey', e.target.value)} placeholder="کلید API" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        <input type="text" value={settings.website.botUserId} onChange={(e) => handleChange('website', 'botUserId', e.target.value)} placeholder="شناسه کاربری ربات" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                         <div className="sm:col-span-2">
                             <label className="block text-sm font-medium text-cyan-300 mb-2">شناسه اتاق‌ها / صفحات</label>
                             <RoomIdInput roomIds={settings.website.roomIds} onRoomIdsChange={(ids) => handleChange('website', 'roomIds', ids)} />
                         </div>
                    </div>
                    <div className="flex items-center gap-2"><button onClick={() => runTest('website', () => testWebsiteConnection(settings.website))} disabled={!settings.website.apiUrl || !settings.website.apiKey || status['website'] === 'testing'} className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست</button><div className="w-5 h-5">{renderStatusIcon(status['website'])}</div></div>
                </div>
                {/* Twitter */}
                <div className="space-y-4 md:col-span-2">
                    <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-200"><TwitterIcon className="w-6 h-6"/><span>توییتر (X)</span></h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="password" value={settings.twitter.apiKey} onChange={(e) => handleChange('twitter', 'apiKey', e.target.value)} placeholder="API Key" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        <input type="password" value={settings.twitter.apiSecretKey} onChange={(e) => handleChange('twitter', 'apiSecretKey', e.target.value)} placeholder="API Secret Key" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        <input type="password" value={settings.twitter.accessToken} onChange={(e) => handleChange('twitter', 'accessToken', e.target.value)} placeholder="Access Token" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                        <input type="password" value={settings.twitter.accessTokenSecret} onChange={(e) => handleChange('twitter', 'accessTokenSecret', e.target.value)} placeholder="Access Token Secret" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    </div>
                    <div className="flex items-center gap-2"><button onClick={() => runTest('twitter', () => testTwitterConnection(settings.twitter))} disabled={!settings.twitter.apiKey || status['twitter'] === 'testing'} className="text-sm bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست</button><div className="w-5 h-5">{renderStatusIcon(status['twitter'])}</div></div>
                </div>
             </div>
        </div>

        {/* --- Platform Integrations --- */}
        <div className="space-y-6">
            <h3 className="font-semibold text-cyan-200 border-b border-cyan-400/20 pb-2">پلتفرم و استقرار (ویژگی پیشرفته)</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Appwrite */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-200"><AppwriteIcon className="w-6 h-6"/><span>Appwrite</span></h4>
                    <input type="text" value={settings.appwrite.endpoint} onChange={(e) => handleChange('appwrite', 'endpoint', e.target.value)} placeholder="Endpoint URL" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <input type="text" value={settings.appwrite.projectId} onChange={(e) => handleChange('appwrite', 'projectId', e.target.value)} placeholder="Project ID" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <input type="password" value={settings.appwrite.apiKey} onChange={(e) => handleChange('appwrite', 'apiKey', e.target.value)} placeholder="API Key" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <div className="flex items-center gap-2"><button onClick={() => runTest('appwrite', () => testAppwriteConnection(settings.appwrite))} disabled={!settings.appwrite.projectId || status['appwrite'] === 'testing'} className="text-sm bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست</button><div className="w-5 h-5">{renderStatusIcon(status['appwrite'])}</div></div>
                </div>
                {/* Supabase */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-lg font-semibold text-cyan-200"><SupabaseIcon className="w-6 h-6"/><span>Supabase</span></h4>
                    <input type="text" value={settings.supabase.projectUrl} onChange={(e) => handleChange('supabase', 'projectUrl', e.target.value)} placeholder="Project URL" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <input type="password" value={settings.supabase.anonKey} onChange={(e) => handleChange('supabase', 'anonKey', e.target.value)} placeholder="Anon (Public) Key" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <div className="flex items-center gap-2"><button onClick={() => runTest('supabase', () => testSupabaseConnection(settings.supabase))} disabled={!settings.supabase.projectUrl || status['supabase'] === 'testing'} className="text-sm bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50">تست</button><div className="w-5 h-5">{renderStatusIcon(status['supabase'])}</div></div>
                </div>
             </div>
        </div>

    </div>
    {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </>
  );
};

export default IntegrationSettingsComponent;