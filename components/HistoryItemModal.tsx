import React from 'react';
import { SearchHistoryItem } from '../types';
import { CloseIcon, ClipboardIcon, CheckCircleIcon } from './icons';

interface HistoryItemModalProps {
    item: SearchHistoryItem;
    onClose: () => void;
}

const HistoryItemModal: React.FC<HistoryItemModalProps> = ({ item, onClose }) => {
    const [isCopied, setIsCopied] = React.useState(false);

    const handleCopy = () => {
        const jsonString = JSON.stringify(item.data, null, 2);
        navigator.clipboard.writeText(jsonString);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-cyan-400/30 rounded-lg shadow-2xl w-full max-w-2xl text-primary transform transition-all flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-cyan-300">جزئیات خروجی تاریخچه</h2>
                        <p className="text-xs text-gray-400 truncate max-w-md" title={item.query}>موضوع: {item.query}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-4 overflow-auto flex-grow relative">
                    <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-gray-800 rounded-full text-gray-300 hover:text-white" title="کپی JSON">
                        {isCopied ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                    </button>
                    {item.data ? (
                        <pre className="bg-gray-950/50 rounded-md p-3 text-sm text-cyan-200 whitespace-pre-wrap break-all">
                            <code>{JSON.stringify(item.data, null, 2)}</code>
                        </pre>
                    ) : (
                        <p className="text-gray-500">داده‌ی خروجی برای این مورد ذخیره نشده است.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryItemModal;