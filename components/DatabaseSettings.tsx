
import React, { useState } from 'react';
import { DatabaseSettings } from '../types';
import { CheckCircleIcon, CloseIcon } from './icons';

interface DatabaseSettingsProps {
  settings: DatabaseSettings;
  onSettingsChange: (settings: DatabaseSettings) => void;
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

const DatabaseSettingsComponent: React.FC<DatabaseSettingsProps> = ({ settings, onSettingsChange }) => {
    const [status, setStatus] = useState<ConnectionStatus>('idle');
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStatus('idle');
        onSettingsChange({
            ...settings,
            [e.target.name]: e.target.value
        });
    };

    const handleTestConnection = () => {
        setStatus('testing');
        // NOTE: This is a placeholder. A real implementation would require a backend service.
        setTimeout(() => {
            // Simulate a 50/50 chance of success/failure for demonstration
            if (Math.random() > 0.5 && settings.host && settings.name) {
                setStatus('success');
            } else {
                setStatus('error');
            }
             setTimeout(() => setStatus('idle'), 4000);
        }, 1500);
    };
    
    const renderStatus = () => {
        switch(status) {
            case 'testing': return <p className="text-sm text-yellow-300">در حال تست اتصال...</p>;
            case 'success': return <p className="text-sm text-green-400 flex items-center gap-1"><CheckCircleIcon className="w-5 h-5"/>اتصال موفقیت‌آمیز بود.</p>;
            case 'error': return <p className="text-sm text-red-400 flex items-center gap-1"><CloseIcon className="w-5 h-5"/>اتصال ناموفق بود. (ویژگی آزمایشی)</p>;
            default: return null;
        }
    }

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-xl font-bold mb-6 text-cyan-300">اتصال به دیتابیس خارجی (آزمایشی)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="db-host" className="block text-sm font-medium text-cyan-300 mb-2">آدرس هاست</label>
                        <input
                            id="db-host"
                            name="host"
                            type="text"
                            value={settings.host}
                            onChange={handleChange}
                            placeholder="مثال: my-database.server.com"
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"
                        />
                    </div>
                     <div>
                        <label htmlFor="db-name" className="block text-sm font-medium text-cyan-300 mb-2">نام دیتابیس</label>
                        <input
                            id="db-name"
                            name="name"
                            type="text"
                            value={settings.name}
                            onChange={handleChange}
                            placeholder="مثال: news_archive"
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"
                        />
                    </div>
                    <div>
                        <label htmlFor="db-password" className="block text-sm font-medium text-cyan-300 mb-2">رمز عبور</label>
                        <input
                            id="db-password"
                            name="password"
                            type="password"
                            value={settings.password}
                            onChange={handleChange}
                            placeholder="رمز عبور دیتابیس"
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"
                        />
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                        <button 
                            onClick={handleTestConnection}
                            disabled={status === 'testing'}
                            className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
                        >
                            تست و ذخیره اتصال
                        </button>
                        {renderStatus()}
                    </div>
                </div>
                <div className="text-sm text-gray-400 bg-gray-900/50 p-4 rounded-lg flex items-center">
                    <p>
                        توجه: این یک ویژگی نمایشی برای توسعه‌های آینده است. در حال حاضر، اتصال واقعی به دیتابیس نیازمند یک سرور واسط (Backend) بوده و از طریق مرورگر به تنهایی امکان‌پذیر نیست. اطلاعات وارد شده فقط در مرورگر شما ذخیره می‌شوند.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSettingsComponent;
