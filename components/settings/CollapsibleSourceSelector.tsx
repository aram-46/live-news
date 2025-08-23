
import React, { useState } from 'react';
import { Sources, SourceCategory, sourceCategoryLabels } from '../../types';
import { PlusIcon } from '../icons'; // Using PlusIcon as a chevron for style

interface CollapsibleSourceSelectorProps {
    allSources: Sources;
    selectedSources: Record<string, string[]>;
    onSelectionChange: (selected: Record<string, string[]>) => void;
}

const CollapsibleSourceSelector: React.FC<CollapsibleSourceSelectorProps> = ({ allSources, selectedSources, onSelectionChange }) => {
    const [openCategories, setOpenCategories] = useState<Record<SourceCategory, boolean>>({
        'news-agencies': true,
        'fact-check': false,
        'social-media': false,
        'financial': false,
        'analytical': false,
    });

    const toggleCategory = (category: SourceCategory) => {
        setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const handleSourceToggle = (category: SourceCategory, sourceId: string) => {
        const currentSelection = selectedSources[category] || [];
        const newSelection = currentSelection.includes(sourceId)
            ? currentSelection.filter(id => id !== sourceId)
            : [...currentSelection, sourceId];
        
        onSelectionChange({ ...selectedSources, [category]: newSelection });
    };

    const handleSelectAllInCategory = (category: SourceCategory, select: boolean) => {
        const categorySourceIds = allSources[category].map(s => s.id);
        onSelectionChange({ ...selectedSources, [category]: select ? categorySourceIds : [] });
    };


    return (
        <div>
            <h3 className="text-lg font-semibold text-cyan-200 mb-4">انتخاب منابع خبری برای اخبار زنده</h3>
            <div className="space-y-2">
                {(Object.keys(sourceCategoryLabels) as SourceCategory[]).map(category => (
                    <div key={category} className="bg-gray-800/40 rounded-lg border border-gray-700/50">
                        <button onClick={() => toggleCategory(category)} className="w-full flex justify-between items-center p-3 text-right">
                            <span className="font-semibold text-cyan-300">{sourceCategoryLabels[category]}</span>
                            <PlusIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${openCategories[category] ? 'rotate-45' : ''}`} />
                        </button>
                        {openCategories[category] && (
                            <div className="p-3 border-t border-gray-700/50">
                                <div className="flex gap-4 mb-3">
                                    <button onClick={() => handleSelectAllInCategory(category, true)} className="text-xs text-blue-400 hover:underline">انتخاب همه</button>
                                    <button onClick={() => handleSelectAllInCategory(category, false)} className="text-xs text-red-400 hover:underline">لغو انتخاب همه</button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {allSources[category].map(source => (
                                    <label key={source.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!selectedSources[category]?.includes(source.id)}
                                            onChange={() => handleSourceToggle(category, source.id)}
                                            className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-cyan-500 focus:ring-cyan-600"
                                        />
                                        <span className="text-sm text-gray-300">{source.name}</span>
                                    </label>
                                ))}
                                {allSources[category].length === 0 && <p className="text-xs text-gray-500 col-span-full">منبعی در این دسته وجود ندارد.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CollapsibleSourceSelector;
