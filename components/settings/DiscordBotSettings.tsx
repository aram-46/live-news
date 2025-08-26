import React from 'react';
import { backendFiles } from '../../data/fileContent';

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => (
    <pre className="bg-gray-900 rounded-md p-3 my-2 overflow-x-auto">
        <code className={`language-${lang} text-sm text-cyan-200`}>{code}</code>
    </pre>
);

const DownloadButton: React.FC<{ content: string; filename: string; folder?: string; mimeType?: string }> = ({ content, filename, folder, mimeType = 'text/plain;charset=utf-8' }) => {
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
            دانلود {folder ? `${folder}/` : ''}{filename}
        </button>
    );
};

const DiscordBotSettings: React.FC = () => {
    // A simple markdown-like renderer for the guide
    const renderGuide = (markdown: string) => {
        return markdown.split('---').map((section, index) => (
            <div key={index} className="space-y-3 pt-4 border-t border-cyan-400/10 first:border-t-0 first:pt-0">
                {section.split('\n').map((line, lineIndex) => {
                    if (line.startsWith('### ')) {
                        return <h3 key={lineIndex} className="text-xl font-semibold text-cyan-200 mt-4 mb-2">{line.substring(4)}</h3>;
                    }
                    if (line.startsWith('2.  **')) { // Special case for numbered list with bold
                        return <p key={lineIndex} className="text-gray-300 leading-relaxed">
                            <strong>{line.substring(0, line.indexOf('**', 4) + 2)}</strong>
                            {line.substring(line.indexOf('**', 4) + 2)}
                        </p>
                    }
                    if (line.startsWith('*   **')) {
                         return <p key={lineIndex} className="ml-4 text-gray-300"><strong>{line.replace('*   **', '').split('**')[0]}:</strong>{line.split('**')[1]}</p>
                    }
                    if (line.match(/^\d+\.\s/)) {
                        return <p key={lineIndex} className="text-gray-300 leading-relaxed">{line}</p>;
                    }
                    if (line.startsWith('`')) {
                         return <CodeBlock key={lineIndex} code={line.replace(/`/g, '')} lang="bash" />;
                    }
                    if (line.trim() === '') {
                        return <br key={lineIndex} />;
                    }
                    return <p key={lineIndex} className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>') }} />;
                })}
            </div>
        ));
    };

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 space-y-8">
             <div>
                <h2 className="text-2xl font-bold mb-2 text-cyan-300">راهنمای راه‌اندازی ربات دیسکورد</h2>
                <p className="text-sm text-gray-400">
                   این راهنما و فایل‌های زیر به شما کمک می‌کنند تا یک ربات دیسکورد با تمام قابلیت‌های این برنامه راه‌اندازی کنید.
                </p>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-900/50 rounded-lg">
                 <DownloadButton content={backendFiles.discordBotWorkerJs} filename="worker.js" folder="discord" />
                 <DownloadButton content={backendFiles.discordBotRegisterCommandsJs} filename="register-commands.js" folder="discord" />
                 <DownloadButton content={backendFiles.discordBotPackageJson} filename="package.json" folder="discord" mimeType="application/json;charset=utf-8"/>
                 <DownloadButton content={backendFiles.discordBotWranglerToml} filename="wrangler.toml" folder="discord" />
            </div>

            <div className="space-y-6">
                {renderGuide(backendFiles.discordBotGuideMd)}
            </div>

        </div>
    );
};

export default DiscordBotSettings;
