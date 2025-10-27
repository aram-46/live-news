import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { fetchArticleContent } from '../services/geminiService';
import { CloseIcon } from './icons';
import ExportButton from './ExportButton';

interface ArticleViewerModalProps {
    url: string;
    settings: AppSettings;
    onClose: () => void;
}

const ArticleViewerModal: React.FC<ArticleViewerModalProps> = ({ url, settings, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [contentHtml, setContentHtml] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const html = await fetchArticleContent(url, settings);
                setContentHtml(html);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'خطا در دریافت محتوای مقاله.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, [url, settings]);

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-cyan-400/30 rounded-lg shadow-2xl w-full max-w-4xl text-primary transform transition-all flex flex-col h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-3 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <ExportButton
                            elementRef={contentRef}
                            data={{ html: contentHtml }}
                            title="article-content"
                            type="general_topic" // Reusing a suitable type for export service
                            disabled={isLoading || !!error}
                        />
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate max-w-sm" title={url}>
                            مشاهده منبع اصلی
                        </a>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div ref={contentRef} className="p-6 overflow-auto flex-grow prose prose-invert max-w-none prose-sm">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full">
                             <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    {error && <p className="text-red-400">{error}</p>}
                    {!isLoading && <div dangerouslySetInnerHTML={{ __html: contentHtml }} />}
                </div>
            </div>
        </div>
    );
};

export default ArticleViewerModal;