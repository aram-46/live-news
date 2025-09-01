import React from 'react';
import { CloseIcon, DownloadIcon, ClipboardIcon, CheckCircleIcon } from './icons';

interface ScreenshotModalProps {
    image: string;
    onClose: () => void;
}

const ScreenshotModal: React.FC<ScreenshotModalProps> = ({ image, onClose }) => {
    const [copyStatus, setCopyStatus] = React.useState(false);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.download = `fact-check-screenshot-${Date.now()}.png`;
        link.href = image;
        link.click();
    };
    
    const handleCopy = async () => {
        try {
            const blob = await (await fetch(image)).blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            setCopyStatus(true);
            setTimeout(() => setCopyStatus(false), 2000);
        } catch (err) {
            console.error('Failed to copy image: ', err);
            alert('خطا در کپی تصویر. ممکن است مرورگر شما از این قابلیت پشتیبانی نکند.');
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-cyan-400/30 rounded-lg shadow-2xl w-full max-w-4xl text-primary transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-3 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-cyan-300">اسکرین‌شات نتیجه</h3>
                    <div className="flex items-center gap-4">
                         <button onClick={handleCopy} className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg transition">
                            {copyStatus ? <CheckCircleIcon className="w-5 h-5"/> : <ClipboardIcon className="w-5 h-5"/>}
                            <span>{copyStatus ? 'کپی شد!' : 'کپی'}</span>
                        </button>
                        <button onClick={handleDownload} className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 px-3 rounded-lg transition">
                            <DownloadIcon className="w-5 h-5"/>
                            <span>دانلود</span>
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <div className="p-4 max-h-[80vh] overflow-auto">
                    <img src={image} alt="Fact-check result screenshot" className="w-full h-auto" />
                </div>
            </div>
        </div>
    );
};

export default ScreenshotModal;
