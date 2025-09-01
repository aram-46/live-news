import React from 'react';
import { backendFiles } from '../../data/fileContent';

const DownloadButton: React.FC<{ content: string; filename: string; mimeType?: string }> = ({ content, filename, mimeType = 'text/plain;charset=utf-8' }) => {
    const handleDownload = () => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleDownload}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm"
        >
            دانلود {filename}
        </button>
    );
};

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => (
    <pre className="bg-gray-900 rounded-md p-3 my-2 overflow-x-auto">
        <code className={`language-${lang} text-sm text-cyan-200`}>{code}</code>
    </pre>
);

const InstallationGuide: React.FC = () => {
    // A simple markdown-like renderer for the guide
    const renderGuide = (markdown: string) => {
        return markdown.split('---').map((section, index) => (
            <div key={index} className="space-y-3 pt-4 border-t border-cyan-400/10 first:border-t-0 first:pt-0">
                {section.split('\n').map((line, lineIndex) => {
                    if (line.startsWith('### ')) {
                        return <h3 key={lineIndex} className="text-xl font-semibold text-cyan-200 mt-4 mb-2">{line.substring(4)}</h3>;
                    }
                    if (line.match(/^\d+\.\s/)) {
                         return <p key={lineIndex} className="text-gray-300 leading-relaxed">{line}</p>;
                    }
                    if (line.startsWith('*   ')) {
                         return <li key={lineIndex} className="text-gray-300 leading-relaxed ml-4">{line.substring(4)}</li>
                    }
                     if (line.startsWith('**')) {
                         return <p key={lineIndex} className="font-bold text-amber-300 my-2">{line.replace(/\*\*/g, '')}</p>
                    }
                    if (line.trim() === '') {
                        return <br key={lineIndex} />;
                    }
                    return <p key={lineIndex} className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>').replace(/`([^`]+)`/g, '<code class="bg-gray-900 text-amber-300 px-1 py-0.5 rounded text-xs">$1</code>') }} />;
                })}
            </div>
        ));
    };

     return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-2 text-cyan-300">راهنمای نصب و راه‌اندازی در cPanel</h2>
                <p className="text-sm text-gray-400">
                   این راهنما و فایل‌های زیر به شما کمک می‌کنند تا برنامه را به همراه دیتابیس و بک‌اند اختیاری روی هاست اشتراکی خود مستقر کنید.
                </p>
            </div>

            <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-900/50 rounded-lg">
                <span className="text-sm font-semibold text-cyan-200">فایل‌های ضروری:</span>
                 <DownloadButton content={backendFiles.databaseSchemaSql} filename="database_schema.sql" />
                 <DownloadButton content={backendFiles.backendConfigJsExample} filename="config.js.example" />
            </div>

            <div className="space-y-6 text-sm">
                {renderGuide(backendFiles.cpanelGuideMd)}
            </div>
        </div>
    );
};

export default InstallationGuide;
