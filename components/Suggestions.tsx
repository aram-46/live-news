import React from 'react';
import { LightBulbIcon } from './icons';

interface SuggestionsProps {
    suggestions: string[];
    onSuggestionClick: (query: string) => void;
}

const Suggestions: React.FC<SuggestionsProps> = ({ suggestions, onSuggestionClick }) => {
    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 p-4 bg-black/20 rounded-lg border border-cyan-400/10 animate-fade-in">
            <h4 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                <LightBulbIcon className="w-5 h-5" />
                جستجوهای مرتبط
            </h4>
            <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSuggestionClick(suggestion)}
                        className="px-3 py-1.5 text-xs rounded-full border-2 transition-colors bg-gray-700 border-gray-600 text-gray-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Suggestions;
