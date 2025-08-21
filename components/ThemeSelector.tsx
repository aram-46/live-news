
import React from 'react';
import { Theme } from '../types';

interface ThemeSelectorProps {
  themes: Theme[];
  selectedTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themes, selectedTheme, onThemeChange }) => {
  return (
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <h2 className="text-xl font-bold mb-4 text-cyan-300">انتخاب تم</h2>
      <div className="flex flex-wrap gap-4">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 border-2 ${
              selectedTheme.id === theme.id
                ? 'border-cyan-400 bg-cyan-500/20 text-white scale-105 shadow-lg shadow-cyan-500/20'
                : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            {theme.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;
