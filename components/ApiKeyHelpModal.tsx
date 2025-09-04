import React from 'react';
import { CloseIcon } from './icons';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-gray-900 rounded-md p-3 my-2 overflow-x-auto text-left">
        <code className="text-sm text-cyan-200">{children}</code>
    </pre>
);

const ApiKeyHelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-red-500/50 rounded-lg shadow-2xl p-6 w-full max-w-2xl text-primary transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-red-300">خطای کلید API جمینای</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4 text-sm text-gray-300 max-h-[70vh] overflow-y-auto pr-2">
                    <p>
                        برنامه نمی‌تواند با سرویس هوش مصنوعی Gemini ارتباط برقرار کند زیرا کلید API (API Key) تنظیم نشده یا نامعتبر است.
                    </p>
                    <p className="font-bold text-amber-300">
                        برای حل این مشکل، باید کلید API خود را به عنوان یک متغیر محیطی (Environment Variable) قبل از اجرای برنامه تنظیم کنید. این برنامه برای امنیت، کلید را مستقیماً در کد یا تنظیمات ذخیره نمی‌کند.
                    </p>
                    <div>
                        <h3 className="font-semibold text-cyan-200 text-base mb-2">نحوه تنظیم کلید API:</h3>
                        <p>ابتدا ترمینال یا Command Prompt خود را باز کنید. سپس دستور مناسب با سیستم عامل خود را اجرا کنید. <strong className="text-red-400">YOUR_API_KEY_HERE</strong> را با کلید واقعی خود جایگزین کنید.</p>
                        
                        <h4 className="font-semibold text-gray-200 mt-3">ویندوز (Command Prompt)</h4>
                        <CodeBlock>{`set API_KEY=YOUR_API_KEY_HERE`}</CodeBlock>

                        <h4 className="font-semibold text-gray-200 mt-3">ویندوز (PowerShell)</h4>
                        <CodeBlock>{`$env:API_KEY="YOUR_API_KEY_HERE"`}</CodeBlock>

                        <h4 className="font-semibold text-gray-200 mt-3">macOS / Linux</h4>
                        <CodeBlock>{`export API_KEY=YOUR_API_KEY_HERE`}</CodeBlock>
                        
                        <p className="mt-4">
                            پس از اجرای دستور، برنامه را در <strong className="text-amber-300">همان ترمینال</strong> با دستور <code className="bg-gray-900 p-1 rounded text-xs">npm run dev</code> مجدداً اجرا کنید.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyHelpModal;
