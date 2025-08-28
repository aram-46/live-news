

import React, { useState } from 'react';
import { AppwriteSettings } from '../../types';
import { backendFiles } from '../../data/fileContent';
import { AppwriteIcon, CheckCircleIcon, CloseIcon } from '../icons';
import { testAppwriteConnection } from '../../services/integrationService';

interface AppwriteSettingsProps {
  settings: AppwriteSettings;
  onSettingsChange: (settings: AppwriteSettings) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const DownloadButton: React.FC<{ content: string; filename: string; mimeType?: string }> = ({ content, filename, mimeType = 'text/plain;charset=utf-8' }) => {
    const handleDownload = () => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleDownload}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm"
        >
            دانلود {filename}
        </button>
    );
};

const AppwriteSettingsComponent: React.FC<AppwriteSettingsProps> = ({ settings, onSettingsChange }) => {
    const [currentSettings, setCurrentSettings] = useState<AppwriteSettings>(settings);
    const [status, setStatus] = useState<TestStatus>('idle');

    const handleSaveAndTest = async () => {
        onSettingsChange(currentSettings);
        setStatus('testing');
        const success = await testAppwriteConnection(currentSettings);
        setStatus(success ? 'success' : 'error');
        setTimeout(() => setStatus('idle'), 5000);
    };

    const renderStatusIcon = (status: TestStatus) => {
        if (status === 'testing') return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>;
        if (status === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        if (status === 'error') return <CloseIcon className="w-5 h-5 text-red-400" />;
        return null;
    };

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
            <div className="flex items-center gap-3">
                <AppwriteIcon className="w-8 h-8 text-pink-400" />
                <div>
                    <h2 className="text-xl font-bold text-cyan-300">یکپارچه‌سازی با Appwrite</h2>
                    <p className="text-sm text-gray-400">
                        از Appwrite برای ذخیره تنظیمات، آرشیو اخبار، تاریخچه چت و اجرای ربات‌ها روی توابع (Functions) استفاده کنید.
                    </p>
                </div>
            </div>

            <div className="space-y-4 p-6 bg-gray-900/30 rounded-lg border border-cyan-400/20">
                <h3 className="text-lg font-semibold text-cyan-200">اتصال برنامه به پروژه Appwrite</h3>
                <p className="text-sm text-gray-400">
                    پس از راه‌اندازی پروژه خود در Appwrite طبق راهنمای زیر، اطلاعات اتصال را در این بخش وارد کنید.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input value={currentSettings.endpoint} onChange={e => setCurrentSettings({...currentSettings, endpoint: e.target.value})} placeholder="Endpoint (e.g., https://cloud.appwrite.io/v1)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <input value={currentSettings.projectId} onChange={e => setCurrentSettings({...currentSettings, projectId: e.target.value})} placeholder="Project ID" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <input value={currentSettings.apiKey} type="password" onChange={e => setCurrentSettings({...currentSettings, apiKey: e.target.value})} placeholder="API Key (Secret)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <input value={currentSettings.databaseId} onChange={e => setCurrentSettings({...currentSettings, databaseId: e.target.value})} placeholder="Database ID" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <input value={currentSettings.settingsCollectionId} onChange={e => setCurrentSettings({...currentSettings, settingsCollectionId: e.target.value})} placeholder="Settings Collection ID" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                    <input value={currentSettings.newsArticlesCollectionId} onChange={e => setCurrentSettings({...currentSettings, newsArticlesCollectionId: e.target.value})} placeholder="News Articles Collection ID (اختیاری)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                     <input value={currentSettings.chatHistoryCollectionId} onChange={e => setCurrentSettings({...currentSettings, chatHistoryCollectionId: e.target.value})} placeholder="Chat History Collection ID (اختیاری)" className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5" />
                </div>
                 <div className="flex items-center gap-3">
                    <button onClick={handleSaveAndTest} disabled={status === 'testing' || !currentSettings.projectId} className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm disabled:opacity-50">
                        ذخیره و تست اتصال
                    </button>
                    <div className="w-5 h-5">{renderStatusIcon(status)}</div>
                </div>
            </div>
            
             <div className="space-y-4 p-6 bg-gray-900/30 rounded-lg border border-gray-700/50">
                <h3 className="text-lg font-semibold text-cyan-200">راهنمای راه‌اندازی (روش دستی از طریق سایت)</h3>
                 <p className="text-sm text-gray-400">برای راه‌اندازی بک‌اند خود روی Appwrite، راهنمای زیر را دنبال کنید. فایل‌های زیر برای مرجع (در صورت تمایل به استفاده از CLI) قرار داده شده‌اند.</p>
                <div className="flex flex-wrap gap-4 items-center">
                    <DownloadButton content={backendFiles.appwriteJson} filename="appwrite.json" mimeType="application/json;charset=utf-8" />
                </div>
                <div className="mt-4 text-sm text-gray-300 space-y-3 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: backendFiles.appwriteGuideMd.replace(/\n/g, '<br/>').replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-amber-300 px-1 py-0.5 rounded text-xs">$1</code>').replace(/---/g, '<hr class="border-gray-600 my-4">')}} />
            </div>

        </div>
    );
};

export default AppwriteSettingsComponent;