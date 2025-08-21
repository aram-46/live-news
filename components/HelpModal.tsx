
import React from 'react';
import { CloseIcon } from './icons';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
    >
      <div 
        className="bg-gray-900 border border-cyan-400/30 rounded-lg shadow-2xl p-6 w-full max-w-2xl text-primary transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-cyan-300">راهنمای اتصال تلگرام و دیسکورد</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-6 text-sm text-gray-300 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <h3 className="font-semibold text-cyan-200 text-base">اتصال به تلگرام</h3>
            <ol className="list-decimal list-inside space-y-2">
                <li>به ربات <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">BotFather</a> در تلگرام پیام دهید.</li>
                <li>دستور `/newbot` را ارسال کرده و نام و یوزرنیم ربات خود را انتخاب کنید.</li>
                <li>پس از ساخت ربات، BotFather یک توکن (API Token) به شما می‌دهد. آن را کپی کرده و در فیلد "توکن ربات" وارد کنید.</li>
                <li>برای "شناسه چت"، اگر می‌خواهید به یک کانال عمومی پیام ارسال شود، یوزرنیم کانال را با @ وارد کنید (مثال: `@mychannel`).</li>
                <li>اگر کانال خصوصی است، ابتدا ربات خود را به عنوان ادمین به کانال اضافه کنید. سپس یک پیام در کانال ارسال کنید. بعد به آدرس زیر در مرورگر بروید (توکن خود را جایگزین کنید):<br/><code className="bg-gray-800 p-1 rounded text-xs break-all">https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getUpdates</code><br/>در پاسخ JSON، شناسه چت (chat id) را پیدا کنید که یک عدد منفی طولانی است. آن را کپی و وارد کنید.</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-cyan-200 text-base">اتصال به دیسکورد</h3>
            <ol className="list-decimal list-inside space-y-2">
                <li>در سرور دیسکورد خود، به بخش تنظیمات سرور (Server Settings) بروید.</li>
                <li>از منوی سمت چپ، به بخش Integrations (یکپارچه‌سازی) بروید.</li>
                <li>روی "Webhooks" کلیک کرده و سپس "New Webhook" را بزنید.</li>
                <li>یک نام برای وبهوک انتخاب کرده و کانالی که می‌خواهید پیام‌ها در آن ارسال شوند را مشخص کنید.</li>
                <li>روی دکمه "Copy Webhook URL" کلیک کنید و آدرس کپی شده را در فیلد "آدرس وبهوک" در برنامه وارد نمایید.</li>
            </ol>
          </div>
          <p className="text-xs text-gray-500 pt-4 border-t border-gray-700">
            توجه: تمامی اطلاعات حساس مانند توکن‌ها و آدرس‌های وبهوک فقط در حافظه مرورگر شما ذخیره می‌شوند و به هیچ سرور دیگری ارسال نمی‌گردند.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
