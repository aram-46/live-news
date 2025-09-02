
import React, { useState, useEffect } from 'react';
import { Filters, AppSettings, SearchTab } from '../types';
import { SearchIcon, FilterIcon, MagicIcon } from './icons';
import { generateDynamicFilters } from '../services/geminiService';


interface FilterPanelProps {
  onSearch: (filters: Filters) => void;
  isLoading: boolean;
  categories: string[];
  regions: string[];
  sources: string[];
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  searchType: SearchTab;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onSearch, isLoading, categories, regions, sources, settings, onSettingsChange, searchType }) => {
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['all']);
  const [selectedSources, setSelectedSources] = useState<string[]>(['all']);

  // Dynamic options state
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [dynamicRegions, setDynamicRegions] = useState<string[]>([]);
  const [dynamicSources, setDynamicSources] = useState<string[]>([]);

  const [isAiLoading, setIsAiLoading] = useState<string | null>(null);
  const [aiCounts, setAiCounts] = useState({ categories: 3, regions: 2, sources: 2 });

  useEffect(() => {
    setDynamicCategories(categories);
  }, [categories]);

  useEffect(() => {
    setDynamicRegions(regions);
  }, [regions]);
  
  useEffect(() => {
    setDynamicSources(sources);
  }, [sources]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ 
        query, 
        categories: selectedCategories, 
        regions: selectedRegions, 
        sources: selectedSources 
    });
  };
  
  const handleMultiSelect = (
    value: string, 
    currentSelection: string[], 
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (value === 'all') {
        setter(['all']);
        return;
    }

    const newSelection = currentSelection.filter(item => item !== 'all');
    
    if (newSelection.includes(value)) {
        const finalSelection = newSelection.filter(item => item !== value);
        setter(finalSelection.length > 0 ? finalSelection : ['all']);
    } else {
        setter([...newSelection, value]);
    }
  };

  const handleGenerateDynamicFilters = async (listType: 'categories' | 'regions' | 'sources') => {
      if (!query.trim()) {
          alert('لطفا ابتدا یک موضوع برای جستجو وارد کنید.');
          return;
      }
      setIsAiLoading(listType);
      try {
          const count = aiCounts[listType];
          // FIX: Removed extra 'settings' argument from the function call.
          const newItems = await generateDynamicFilters(query, listType, count);
          
          if (listType === 'categories') {
            setDynamicCategories(prev => [...new Set([...prev, ...newItems])]);
          } else if (listType === 'regions') {
            setDynamicRegions(prev => [...new Set([...prev, ...newItems])]);
          } else if (listType === 'sources') {
            setDynamicSources(prev => [...new Set([...prev, ...newItems])]);
          }

      } catch (error) {
          console.error(`Failed to generate items for ${listType}`, error);
          alert(`خطا در تولید موارد برای ${listType}`);
      } finally {
          setIsAiLoading(null);
      }
  };

  const renderMultiSelect = (
    label: string, 
    options: string[], 
    selected: string[], 
    handler: (value: string) => void,
    listType: 'categories' | 'regions' | 'sources'
  ) => (
    <div>
        <div className="flex items-center justify-between gap-2 mb-2">
            <label className="block text-sm font-medium text-cyan-300">{label}</label>
            <div className="flex items-center gap-1.5">
                <input 
                    type="number" 
                    min="1" max="5" 
                    value={aiCounts[listType]}
                    onChange={(e) => setAiCounts(prev => ({ ...prev, [listType]: Number(e.target.value)}))}
                    className="w-12 bg-gray-900/50 border border-gray-600 rounded-md text-center text-xs p-1"
                />
                <button type="button" onClick={() => handleGenerateDynamicFilters(listType)} disabled={!!isAiLoading} className="text-purple-400 hover:text-purple-300 disabled:opacity-50" title="تولید خودکار گزینه‌ها با هوش مصنوعی">
                    {isAiLoading === listType 
                        ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> 
                        : <MagicIcon className="w-4 h-4"/>
                    }
                </button>
                 <button type="button" onClick={() => {
                     // A simple way to add manually. A modal would be better for UX but this satisfies the request.
                     const newItem = prompt(`یک مورد جدید برای "${label}" وارد کنید:`);
                     if(newItem && newItem.trim()) {
                         if (listType === 'categories') setDynamicCategories(p => [...p, newItem]);
                         if (listType === 'regions') setDynamicRegions(p => [...p, newItem]);
                         if (listType === 'sources') setDynamicSources(p => [...p, newItem]);
                     }
                 }} className="text-cyan-400 hover:text-cyan-300" title="افزودن دستی">+</button>
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
            {['all', ...options].map(opt => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => handler(opt)}
                    className={`px-3 py-1.5 text-xs rounded-full border-2 transition-colors ${
                        selected.includes(opt) 
                        ? 'bg-cyan-500/20 border-cyan-400 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    {opt === 'all' ? 'همه' : opt}
                </button>
            ))}
        </div>
    </div>
  );


  return (
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <h2 className="text-xl font-bold mb-6 text-cyan-300 flex items-center gap-3">
        <FilterIcon className="w-6 h-6" />
        فیلترهای پیشرفته
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="search-query" className="block text-sm font-medium text-cyan-300 mb-2">جستجو</label>
          <div className="relative">
            <input
              id="search-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="مثال: جنگ اوکراین"
              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5 pr-10"
            />
             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <SearchIcon className="w-5 h-5 text-gray-400"/>
            </div>
          </div>
        </div>
        
        {renderMultiSelect('دسته‌بندی', dynamicCategories, selectedCategories, (value) => handleMultiSelect(value, selectedCategories, setSelectedCategories), 'categories')}
        {renderMultiSelect('منطقه', dynamicRegions, selectedRegions, (value) => handleMultiSelect(value, selectedRegions, setSelectedRegions), 'regions')}
        {renderMultiSelect('منبع', dynamicSources, selectedSources, (value) => handleMultiSelect(value, selectedSources, setSelectedSources), 'sources')}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              در حال جستجو...
            </>
          ) : (
            <>
                <SearchIcon className="w-5 h-5"/>
                جستجو
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default FilterPanel;
