

import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { exportToPdf, exportToImage, exportToHtml, exportToDocx, exportToXlsx } from '../services/exportService';
// FIX: Add all missing icon imports.
import { DownloadIcon, CameraIcon, FilePdfIcon, FileWordIcon, FileExcelIcon, FileCodeIcon } from './icons';

interface ExportButtonProps {
    elementRef: React.RefObject<HTMLElement>;
    data: any;
    title: string;
    // FIX: Add 'general_topic' to the union type to allow its use in the GeneralTopicsSearch component.
    type: 'news' | 'podcast' | 'structured' | 'web' | 'agent' | 'fact-check' | 'general_topic';
    disabled: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ elementRef, data, title, type, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleExport = async (format: 'pdf' | 'image' | 'html' | 'docx' | 'xlsx') => {
        setIsOpen(false);
        const fileName = `${type}-${title.replace(/\s+/g, '_')}-${Date.now()}`;

        try {
            if (format === 'image') await exportToImage(elementRef.current!, fileName);
            if (format === 'pdf') await exportToPdf(elementRef.current!, fileName);
            if (format === 'html') exportToHtml(elementRef.current!, fileName);
            if (format === 'docx') exportToDocx(elementRef.current!.innerHTML, fileName);
            if (format === 'xlsx') {
                if(type === 'news') { // A simple example for one type
                    const xlsxData = (data as any[]).map(item => ({
                        Title: item.title,
                        Summary: item.summary,
                        Source: item.source,
                        Link: item.link,
                        Credibility: item.credibility,
                    }));
                     exportToXlsx(xlsxData, fileName);
                } else {
                    alert('Export to Excel for this data type is not yet implemented.');
                }
            }
        } catch (err) {
            console.error(`Export to ${format} failed`, err);
            alert(`خطا در خروجی گرفتن به فرمت ${format}.`);
        }
    };
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg transition duration-300 text-sm"
            >
                <DownloadIcon className="w-4 h-4" />
                <span>خروجی</span>
            </button>
            {isOpen && (
                <div ref={menuRef} className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 p-2 animate-fade-in-fast">
                    <div className="space-y-1">
                        <button onClick={() => handleExport('image')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-gray-700">
                            <CameraIcon className="w-5 h-5" /><span>عکس (PNG)</span>
                        </button>
                        <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-gray-700">
                            <FilePdfIcon className="w-5 h-5" /><span>فایل PDF</span>
                        </button>
                        <button onClick={() => handleExport('docx')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-gray-700">
                            <FileWordIcon className="w-5 h-5" /><span>فایل Word</span>
                        </button>
                        <button onClick={() => handleExport('xlsx')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-gray-700">
                           <FileExcelIcon className="w-5 h-5" /><span>فایل Excel</span>
                        </button>
                        <button onClick={() => handleExport('html')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-gray-700">
                           <FileCodeIcon className="w-5 h-5" /><span>فایل HTML</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportButton;