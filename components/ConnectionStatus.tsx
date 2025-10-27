import React, { useState, useEffect } from 'react';
import { AppSettings, ApiKeyStatus } from '../types';
import ApiKeyHelpModal from './ApiKeyHelpModal';

interface ConnectionStatusProps {
    settings: AppSettings;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ settings }) => {
    const [status, setStatus] = useState<ApiKeyStatus>('checking');
    const [attemptInfo, setAttemptInfo] = useState<{ attempt: number, maxRetries: number } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const handleStatusChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail) {
                if (customEvent.detail.status) {
                    setStatus(customEvent.detail.status);
                }
                if (customEvent.detail.status === 'retrying') {
                    setAttemptInfo({ attempt: customEvent.detail.attempt, maxRetries: customEvent.detail.maxRetries });
                } else {
                    // Reset attempt info for any other status
                    setAttemptInfo(null);
                }
            }
        };
        window.addEventListener('apiKeyStatusChange', handleStatusChange);

        // Initial check for 'not_set' case if no API call is made immediately.
        const keyToCheck = settings.aiModelSettings.gemini.apiKey || process.env.API_KEY;
        if (!keyToCheck) {
            setStatus('not_set');
        }

        return () => {
            window.removeEventListener('apiKeyStatusChange', handleStatusChange);
        };
    }, [settings.aiModelSettings.gemini.apiKey]);

    const getStatusInfo = () => {
        switch (status) {
            case 'valid':
                return { color: 'bg-green-500', text: 'اتصال با Gemini برقرار است', canOpenModal: false };
            case 'invalid_key':
                return { color: 'bg-red-500', text: 'کلید API نامعتبر است. برای راهنمایی کلیک کنید.', canOpenModal: true };
            case 'not_set':
                 return { color: 'bg-red-500', text: 'کلید API تنظیم نشده است. برای راهنمایی کلیک کنید.', canOpenModal: true };
            case 'quota_exceeded':
                return { color: 'bg-yellow-500', text: 'سهمیه API تمام شده است. برای راهنمایی کلیک کنید.', canOpenModal: true };
            case 'network_error':
                return { color: 'bg-yellow-500', text: 'خطا در ارتباط با سرور Gemini', canOpenModal: false };
            case 'retrying':
                const attemptText = attemptInfo ? ` (تلاش ${attemptInfo.attempt}/${attemptInfo.maxRetries})` : '';
                return { color: 'bg-yellow-500 animate-pulse', text: `خطای موقت، در حال تلاش مجدد...${attemptText}`, canOpenModal: false };
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
                    status === 'valid' ? 'متصل' :
                    status === 'retrying' ? `تلاش مجدد...` : 'خطای اتصال'
                }</span>
            </button>
            {isModalOpen && <ApiKeyHelpModal onClose={() => setIsModalOpen(false)} />}
        </>
    );
};

export default ConnectionStatus;