
import React from 'react';

interface CustomCssSettingsProps {
  customCss: string;
  onCustomCssChange: (css: string) => void;
}

const CustomCssSettings: React.FC<CustomCssSettingsProps> = ({ customCss, onCustomCssChange }) => {
  return (
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <h2 className="text-xl font-bold mb-4 text-cyan-300">استایل سفارشی (Custom CSS)</h2>
      <p className="text-sm text-gray-400 mb-6">
        کدهای CSS خود را در این بخش وارد کنید تا ظاهر برنامه را شخصی‌سازی کنید. این کدها به صورت مستقیم در صفحه اعمال می‌شوند.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <textarea
            value={customCss}
            onChange={(e) => onCustomCssChange(e.target.value)}
            rows={12}
            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5 font-mono text-sm"
            placeholder={`/* مثال: */\n\n.theme-base {\n  --text-primary: #f0f0f0;\n  --accent-color: #ff5733;\n}`}
        />
        <div className="text-xs text-gray-400 bg-gray-900/50 p-4 rounded-lg">
            <h4 className="font-bold text-gray-300 mb-2">راهنمای سریع متغیرهای اصلی:</h4>
            <p className="mb-2">برای تغییر رنگ‌های اصلی تم، متغیرهای زیر را داخل کلاس تم مورد نظر (`.theme-base`, `.theme-neon-dreams`, `.theme-solar-flare`) بازنویسی کنید:</p>
            <ul className="list-disc list-inside space-y-1 font-mono">
                <li><span className="text-cyan-400">--text-primary</span>: رنگ اصلی متن</li>
                <li><span className="text-cyan-400">--text-secondary</span>: رنگ متن ثانویه</li>
                <li><span className="text-cyan-400">--text-accent</span>: رنگ متن‌های هایلایت شده</li>
                <li><span className="text-cyan-400">--accent-color</span>: رنگ اصلی تم (دکمه‌ها و...)</li>
                <li><span className="text-cyan-400">--border-color</span>: رنگ حاشیه‌ها</li>
                <li><span className="text-cyan-400">--header-bg</span>: پس‌زمینه هدر</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default CustomCssSettings;
