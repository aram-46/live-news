import React, { useRef, useState } from 'react';
import { exportToPdf, exportToImage, exportToHtml, exportToDocx, exportToXlsx } from '../services/exportService';
import { DownloadIcon, FilePdfIcon, ImageIcon, FileCodeIcon, FileWordIcon, FileExcelIcon, CloseIcon } from './icons';
import ScreenshotModal from './ScreenshotModal';

interface ExportButtonProps {
    elementRef: React.RefObject<HTMLElement>;
    data: any;
    title: string;
    type: 'news' | 'podcast' | 'web' | 'structured' | 'agent' | 'general_topic' | 'fact-check';
    disabled: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ elementRef, data, title, type, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [screenshotImage, setScreenshotImage] = useState<string | null>(null);

    const handleExport = async (format: 'pdf' | 'html' | 'docx' | 'xlsx') => {
        if (!elementRef.current) return;
        const fileName = `${type}-${title.replace(/\s+/g, '_') || 'export'}`;
        
        // For these formats, we want to export the raw data as structured text/table
        const tempElement = document.createElement('div');
        tempElement.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        
        try {
            if (format === 'pdf') await exportToPdf(tempElement, fileName);
            if (format === 'html') exportToHtml(tempElement.innerHTML, fileName);
            if (format === 'docx') await exportToDocx(tempElement.innerHTML, fileName);
            // FIX: Pass the innerHTML string to the function, not the element itself.
            if (format === 'xlsx') exportToXlsx(tempElement.innerHTML, fileName);
        } catch (error) {
            console.error(`Failed to export to ${format}`, error);
            alert(`Error exporting to ${format}`);
        }
        setIsOpen(false);
    };
    
    const handleTakeScreenshot = async () => {
        if (elementRef.current) {
            try {
                // Use a library like html2canvas, which is assumed to be available
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(elementRef.current, { backgroundColor: '#1e293b' }); // bg-slate-800
                setScreenshotImage(canvas.toDataURL('image/png'));
            } catch (error) {
                console.error("Error taking screenshot:", error);
                alert("Error taking screenshot.");
            }
        }
        setIsOpen(false);
    };

    return (
        <>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={disabled}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg transition duration-300 text-sm"
                    title="خروجی گرفتن"
                >
                    <DownloadIcon className="w-5 h-5"/>
                    <span className="hidden sm:inline">خروجی</span>
                </button>
                {isOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 p-2 space-y-1">
                         <button onClick={handleTakeScreenshot} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-blue-500">
                            <ImageIcon className="w-5 h-5"/>
                            <span>اسکرین‌شات (PNG)</span>
                        </button>
                        <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-red-500">
                            <FilePdfIcon className="w-5 h-5"/>
                            <span>PDF</span>
                        </button>
                        <button onClick={() => handleExport('docx')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-sky-500">
                            <FileWordIcon className="w-5 h-5"/>
                            <span>Word</span>
                        </button>
                        <button onClick={() => handleExport('xlsx')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-green-500">
                            <FileExcelIcon className="w-5 h-5"/>
                            <span>Excel</span>
                        </button>
                        <button onClick={() => handleExport('html')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-white hover:bg-purple-500">
                            <FileCodeIcon className="w-5 h-5"/>
                            <span>HTML</span>
                        </button>
                    </div>
                )}
            </div>
            {screenshotImage && <ScreenshotModal image={screenshotImage} onClose={() => setScreenshotImage(null)} />}
        </>
    );
};

export default ExportButton;