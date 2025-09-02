
import React, { useState } from 'react';
import { AppSettings } from '../types';
import { SpeakerWaveIcon, MicrophoneIcon, VideoIcon } from './icons';
import VideoToTextConverter from './VideoToTextConverter';

interface ConverterProps {
    settings: AppSettings;
    onOpenUrl: (url: string) => void;
}

type ConverterTab = 'text-to-speech' | 'speech-to-text' | 'video-to-text';

const Converter: React.FC<ConverterProps> = ({ settings, onOpenUrl }) => {
    const [activeTab, setActiveTab] = useState<ConverterTab>('video-to-text');

    const renderTabButton = (tabId: ConverterTab, label: string, icon: React.ReactNode) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300 border-b-2 ${
                activeTab === tabId
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    const renderCurrentTab = () => {
        switch(activeTab) {
            case 'video-to-text':
                return <VideoToTextConverter settings={settings} onOpenUrl={onOpenUrl} />;
            case 'text-to-speech':
                return <div className="p-6 text-center text-gray-400">قابلیت تبدیل متن به صدا به زودی اضافه خواهد شد.</div>;
            case 'speech-to-text':
                return <div className="p-6 text-center text-gray-400">قابلیت تبدیل صوت به متن به زودی اضافه خواهد شد.</div>;
            default:
                return null;
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex border-b border-cyan-400/20 overflow-x-auto">
                {renderTabButton('text-to-speech', 'متن به صدا', <SpeakerWaveIcon className="w-5 h-5" />)}
                {renderTabButton('speech-to-text', 'صوت به متن', <MicrophoneIcon className="w-5 h-5" />)}
                {renderTabButton('video-to-text', 'ویدئو به متن', <VideoIcon className="w-5 h-5" />)}
            </div>

            <div>
                {renderCurrentTab()}
            </div>
        </div>
    );
};

export default Converter;
