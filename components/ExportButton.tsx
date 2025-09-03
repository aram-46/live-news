import React, { useState, useRef, useEffect } from 'react';
import { exportToImage, exportToPdf, generateHtmlContent, exportToHtml } from '../services/exportService';
import { DownloadIcon } from './icons';

interface ExportButtonProps {
  elementRef: React.RefObject<HTMLElement>;
  data: any;
  title: string;
  type: 'news' | 'web' | 'structured' | 'agent' | 'general_topic';
  disabled: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ elementRef, data, title, type, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleExport = async (format: 'pdf' | 'image' | 'html') => {
        if (!elementRef.current || (!data && format === 'html') || (Array.isArray(data) && data.length === 0)) {
             alert('موردی برای خروجی گرفتن وجود ندارد.');
             setIsOpen(false);
             return;
        }
        setIsExporting(format);
        setIsOpen(false);
        const fileName = `نتایج-${title.replace(/[\s"<>|:*?/\\.]+/g, '_') || 'جستجو'}`;

        try {
            switch (format) {
                case 'image':
                    await exportToImage(elementRef.current, fileName);
                    break;
                case 'pdf':
                    await exportToPdf(elementRef.current, fileName);
                    break;
                case 'html':
                    const htmlContent = generateHtmlContent(data, title, type);
                    exportToHtml(htmlContent, fileName);
                    break;
            }
        } catch (err) {
            console.error("Export failed", err);
            alert("خطا در گرفتن خروجی. ممکن است به دلیل محدودیت‌های امنیتی مرورگر باشد.");
        } finally {
            setIsExporting(null);
        }
    };
    
    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || !!isExporting}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg transition duration-300 text-sm"
            >
                {isExporting ? (
                    <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        <span>در حال صدور {isExporting}...</span>
                    </>
                ) : (
                    <>
                        <DownloadIcon className="w-5 h-5" />
                        <span>خروجی</span>
                    </>
                )}
            </button>
             {isOpen && (
                <div className="absolute left-0 mt-2 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10">
                    <button onClick={() => handleExport('html')} className="w-full text-right px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-t-lg">HTML</button>
                    <button onClick={() => handleExport('pdf')} className="w-full text-right px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">PDF</button>
                    <button onClick={() => handleExport('image')} className="w-full text-right px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-b-lg">PNG</button>
                </div>
            )}
        </div>
    );
};

export default ExportButton;
