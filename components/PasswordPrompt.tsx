import React, { useState, FormEvent } from 'react';
import { LockClosedIcon } from './icons';

interface PasswordPromptProps {
  password: string;
  onUnlock: () => void;
}

const PasswordPrompt: React.FC<PasswordPromptProps> = ({ password, onUnlock }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input === password) {
      onUnlock();
    } else {
      setError('رمز عبور اشتباه است.');
      setInput('');
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 text-center">
      <LockClosedIcon className="w-12 h-12 mx-auto text-cyan-400 mb-4" />
      <h2 className="text-xl font-bold mb-2 text-cyan-300">بخش تنظیمات قفل است</h2>
      <p className="text-sm text-gray-400 mb-6">برای دسترسی، لطفا رمز عبور را وارد کنید.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError('');
          }}
          placeholder="رمز عبور"
          autoFocus
          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5 text-center"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition"
        >
          باز کردن قفل
        </button>
      </form>
    </div>
  );
};

export default PasswordPrompt;
