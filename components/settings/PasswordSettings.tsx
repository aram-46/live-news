import React, { useState } from 'react';
import { KeyIcon } from '../icons';

interface PasswordSettingsProps {
    password: string;
    onPasswordChange: (newPassword: string) => void;
}

const PasswordSettings: React.FC<PasswordSettingsProps> = ({ password, onPasswordChange }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const handleSetPassword = () => {
        setMessage(null);

        // Check if current password is correct if one is already set
        if (password && currentPassword !== password) {
            setMessage({ text: 'رمز عبور فعلی اشتباه است.', type: 'error' });
            return;
        }

        // Check if new password is not empty
        if (!newPassword) {
             setMessage({ text: 'رمز عبور جدید نمی‌تواند خالی باشد.', type: 'error' });
            return;
        }

        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            setMessage({ text: 'رمز عبور جدید و تکرار آن مطابقت ندارند.', type: 'error' });
            return;
        }

        onPasswordChange(newPassword);
        setMessage({ text: 'رمز عبور با موفقیت تغییر کرد.', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };
    
    const handleRemovePassword = () => {
         setMessage(null);
         if (password && currentPassword !== password) {
            setMessage({ text: 'برای حذف رمز، ابتدا رمز عبور فعلی را به درستی وارد کنید.', type: 'error' });
            return;
        }
        if (window.confirm('آیا مطمئن هستید که می‌خواهید رمز عبور را حذف کنید؟ بخش تنظیمات بدون رمز قابل دسترس خواهد بود.')) {
            onPasswordChange('');
            setMessage({ text: 'رمز عبور با موفقیت حذف شد.', type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    }

    return (
        <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-xl font-bold mb-2 text-cyan-300">تنظیمات امنیتی</h2>
            <p className="text-sm text-gray-400 mb-6">
                برای دسترسی به بخش تنظیمات یک رمز عبور تعیین کنید تا از تغییرات ناخواسته جلوگیری شود.
            </p>

            <div className="max-w-md space-y-4">
                {password && (
                     <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">رمز عبور فعلی</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="رمز عبور فعلی را وارد کنید"
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"
                        />
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">رمز عبور جدید</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="رمز جدید را وارد کنید"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">تکرار رمز عبور جدید</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="رمز جدید را دوباره وارد کنید"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white p-2.5"
                    />
                </div>
                 {message && (
                    <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {message.text}
                    </p>
                )}
                <div className="flex flex-wrap gap-4 pt-2">
                    <button
                        onClick={handleSetPassword}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 px-4 rounded-lg transition"
                    >
                        <KeyIcon className="w-5 h-5"/>
                        <span>{password ? 'تغییر رمز عبور' : 'تنظیم رمز عبور'}</span>
                    </button>
                    {password && (
                         <button
                            onClick={handleRemovePassword}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition"
                        >
                            حذف رمز عبور
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PasswordSettings;
