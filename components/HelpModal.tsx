

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
        className="bg-gray-900 border border-cyan-400/30 rounded-lg shadow-2xl p-6 w-full max-w-3xl text-primary transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-cyan-300">راهنمای کامل اتصالات</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-6 text-sm text-gray-300 max-h-[70vh] overflow-y-auto pr-2">
          
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-semibold text-cyan-200 text-base mb-2">اتصال به تلگرام</h3>
            <ol className="list-decimal list-inside space-y-2">
                <li>به ربات <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">BotFather</a> در تلگرام پیام دهید.</li>
                <li>دستور `/newbot` را ارسال کرده و نام و یوزرنیم ربات خود را انتخاب کنید.</li>
                <li>پس از ساخت ربات، BotFather یک توکن (API Token) به شما می‌دهد. آن را کپی کرده و در فیلد "توکن ربات" وارد کنید.</li>
                <li>برای "شناسه چت"، اگر می‌خواهید به یک کانال عمومی پیام ارسال شود، یوزرنیم کانال را با @ وارد کنید (مثال: `@mychannel`).</li>
                <li>اگر کانال خصوصی است، ابتدا ربات خود را به عنوان ادمین به کانال اضافه کنید. سپس یک پیام در کانال ارسال کنید. بعد به آدرس زیر در مرورگر بروید (توکن خود را جایگزین کنید):<br/><code className="bg-gray-900 p-1 rounded text-xs break-all">https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getUpdates</code><br/>در پاسخ JSON، شناسه چت (chat id) را پیدا کنید که یک عدد منفی طولانی است. آن را کپی و وارد کنید.</li>
            </ol>
          </div>

          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-semibold text-cyan-200 text-base mb-2">اتصال به دیسکورد</h3>
            <ol className="list-decimal list-inside space-y-2">
                <li>در سرور دیسکورد خود، به بخش تنظیمات سرور (Server Settings) بروید.</li>
                <li>از منوی سمت چپ، به بخش Integrations (یکپارچه‌سازی) بروید.</li>
                <li>روی "Webhooks" کلیک کرده و سپس "New Webhook" را بزنید.</li>
                <li>یک نام برای وبهوک انتخاب کرده و کانالی که می‌خواهید پیام‌ها در آن ارسال شوند را مشخص کنید.</li>
                <li>روی دکمه "Copy Webhook URL" کلیک کنید و آدرس کپی شده را در فیلد "آدرس وبهوک" در برنامه وارد نمایید.</li>
            </ol>
          </div>

           <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-semibold text-cyan-200 text-base mb-2">اتصال به وب‌سایت (Grupo Chat)</h3>
            <ol className="list-decimal list-inside space-y-2">
                <li>وارد پنل مدیریت سایت Grupo خود شوید.</li>
                <li>به بخش 'تنظیمات ربات و API' یا قسمت مشابه آن بروید.</li>
                <li>یک کلید API جدید بسازید و آن را کپی کرده و در فیلد "کلید API" وارد کنید.</li>
                <li>آدرس کامل سایت خود را (مثال: `https://chat.yourdomain.com`) در فیلد "آدرس سایت" وارد کنید.</li>
                <li>شناسه کاربری (User ID) رباتی که در Grupo ساخته‌اید را در فیلد "شناسه کاربری ربات" وارد کنید.</li>
                <li>شناسه‌های اتاق‌ها یا صفحاتی که می‌خواهید ربات در آن فعال باشد را وارد کنید. برای هر اتاق، شناسه آن را از URL یا تنظیمات اتاق برداشته و پس از وارد کردن، دکمه افزودن (+) را بزنید.</li>
                <li>ربات در این پلتفرم می‌تواند اخبار را به صورت خودکار در اتاق‌های مشخص شده پست کند و به دستورات کاربران پاسخ دهد.</li>
            </ol>
          </div>

           <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-semibold text-cyan-200 text-base mb-2">اتصال به توییتر (X)</h3>
            <ol className="list-decimal list-inside space-y-2">
                <li>به پورتال توسعه‌دهندگان توییتر (X) در <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">developer.twitter.com</a> بروید و با اکانت خود وارد شوید.</li>
                <li>یک پروژه (Project) و سپس یک اپلیکیشن (App) جدید بسازید. دسترسی‌های مورد نیاز (مانند Read و Write) را برای اپلیکیشن فعال کنید.</li>
                <li>پس از ساخت اپلیکیشن، به بخش 'Keys and Tokens' بروید.</li>
                <li>مقادیر 'API Key', 'API Secret Key', 'Access Token', و 'Access Token Secret' را تولید (generate) کرده، کپی و در فیلدهای مربوطه در این برنامه وارد کنید.</li>
                 <li>ربات در توییتر می‌تواند اخبار را به صورت رشته توییت (Thread) منتشر کند.</li>
            </ol>
          </div>
          
           <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-semibold text-cyan-200 text-base mb-2">اتصال به پلتفرم‌های Backend (Appwrite / Supabase)</h3>
            <p className="mb-2">این بخش برای اتصال برنامه به یک سرویس Backend به عنوان سرویس (BaaS) است. این کار به شما امکان ذخیره‌سازی دائمی تنظیمات و داده‌ها را می‌دهد و یک ویژگی پیشرفته محسوب می‌شود.</p>
            <ol className="list-decimal list-inside space-y-2">
                <li>ابتدا در سایت <a href="https://appwrite.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Appwrite.io</a> یا <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Supabase.com</a> یک حساب کاربری ایجاد کنید.</li>
                <li>یک پروژه جدید بسازید.</li>
                <li>پس از ساخت پروژه، به بخش تنظیمات (Settings) و سپس بخش API بروید.</li>
                <li>اطلاعات اتصال مانند 'Project ID' و 'Endpoint' (برای Appwrite) یا 'Project URL' و 'Anon Key' (برای Supabase) را پیدا کرده و در فیلدهای مربوطه در این برنامه وارد کنید.</li>
                <li>**توجه مهم:** این برنامه به تنهایی نمی‌تواند ساختار دیتابیس (جداول، توابع و...) را روی این پلتفرم‌ها ایجاد کند. این کار باید به صورت دستی یا با اسکریپت‌های جداگانه توسط شما انجام شود. این تنظیمات صرفاً برای اتصال برنامه به پروژه‌ای است که از قبل توسط شما راه‌اندازی شده است.</li>
            </ol>
          </div>

          <p className="text-xs text-gray-500 pt-4 border-t border-gray-700">
            توجه: تمامی اطلاعات حساس مانند توکن‌ها و کلیدهای API فقط در حافظه مرورگر شما ذخیره می‌شوند و به هیچ سرور دیگری ارسال نمی‌گردند.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
