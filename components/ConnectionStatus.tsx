import React, { useState, useEffect } from 'react';
import { checkApiKeyStatus, ApiKeyStatus } from '../services/geminiService';
import ApiKeyHelpModal from './ApiKeyHelpModal';
import { AppSettings } from '../types';

interface ConnectionStatusProps {
    settings: AppSettings;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ settings }) => {
    const [status, setStatus] = useState<ApiKeyStatus | 'checking'>('checking');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const verifyConnection = async () => {
            const keyToCheck = settings.aiModelSettings.gemini.apiKey || process.env.API_KEY;
            const result = await checkApiKeyStatus(keyToCheck);
            setStatus(result);
        };
        // Delay check slightly to not block initial render
        const timer = setTimeout(verifyConnection, 500);
        return () => clearTimeout(timer);
    }, [settings.aiModelSettings.gemini.apiKey]);

    const getStatusInfo = () => {
        switch (status) {
            case 'valid':
                return { color: 'bg-green-500', text: 'اتصال با Gemini برقرار است', canOpenModal: false };
            case 'invalid_key':
                return { color: 'bg-red-500', text: 'کلید API نامعتبر است. برای راهنمایی کلیک کنید.', canOpenModal: true };
            case 'not_set':
                 return { color: 'bg-red-500', text: 'کلید API تنظیم نشده است. برای راهنمایی کلیک کنید.', canOpenModal: true };
            case 'network_error':
                return { color: 'bg-yellow-500', text: 'خطا در ارتباط با سرور Gemini', canOpenModal: false };
            case 'checking':
                return { color: 'bg-gray-500 animate-pulse', text: 'در حال بررسی اتصال...', canOpenModal: false };
            default:
                return { color: 'bg-gray-500', text: 'وضعیت نامشخص', canOpenModal: false };
        }
    };

    const { color, text, canOpenModal } = getStatusInfo();

    const handleClick = () => {
        if (canOpenModal) {
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <button
                onClick={handleClick}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors ${canOpenModal ? 'cursor-pointer hover:bg-gray-700/50' : 'cursor-default'}`}
                title={text}
                aria-label={text}
            >
                <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                <span className="text-gray-400 hidden sm:inline">{
                    status === 'checking' ? 'بررسی اتصال...' :
                    status === 'valid' ? 'متصل' : 'خطای اتصال'
                }</span>
            </button>
            {isModalOpen && <ApiKeyHelpModal onClose={() => setIsModalOpen(false)} />}
        </>
    );
};

export default ConnectionStatus;
