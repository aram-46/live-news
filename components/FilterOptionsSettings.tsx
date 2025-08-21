
import React, { useState } from 'react';
import { AppSettings } from '../types';
import { PlusIcon, TrashIcon } from './icons';

interface EditableListProps {
  title: string;
  items: string[];
  onItemsChange: (items: string[]) => void;
  placeholder: string;
}

const EditableList: React.FC<EditableListProps> = ({ title, items, onItemsChange, placeholder }) => {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onItemsChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    onItemsChange(items.filter(item => item !== itemToRemove));
  };

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-cyan-200">{title}</h3>
      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/50 rounded-lg">
        {items.map(item => (
          <div key={item} className="flex items-center gap-1.5 bg-gray-700/80 border border-gray-600 rounded-full px-3 py-1 text-xs text-gray-200">
            <span>{item}</span>
            <button onClick={() => handleRemoveItem(item)} className="text-gray-400 hover:text-red-400 transition-colors">
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
         {items.length === 0 && <span className="text-xs text-gray-500 px-2">موردی وجود ندارد.</span>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className="flex-grow bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300 p-2.5 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); }}}
        />
        <button onClick={handleAddItem} className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold p-2.5 rounded-lg transition duration-300 flex-shrink-0">
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};


interface FilterOptionsSettingsProps {
    searchCategories: string[];
    searchRegions: string[];
    allTickerCategories: string[];
    onSettingsChange: (change: Partial<Pick<AppSettings, 'searchCategories' | 'searchRegions' | 'allTickerCategories'>>) => void;
}

const FilterOptionsSettings: React.FC<FilterOptionsSettingsProps> = ({ 
    searchCategories, 
    searchRegions,
    allTickerCategories,
    onSettingsChange 
}) => {
  return (
    <div className="p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10">
      <h2 className="text-xl font-bold mb-4 text-cyan-300">مدیریت گزینه‌های فیلتر</h2>
      <p className="text-sm text-gray-400 mb-6">
        در این بخش می‌توانید لیست دسته‌بندی‌ها و مناطق خبری که در بخش جستجو و سایر قسمت‌های برنامه استفاده می‌شوند را مدیریت کنید.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <EditableList
            title="دسته‌بندی‌های جستجوی خبر"
            items={searchCategories}
            onItemsChange={(newItems) => onSettingsChange({ searchCategories: newItems })}
            placeholder="افزودن دسته‌بندی جدید..."
        />
        <EditableList
            title="مناطق جغرافیایی"
            items={searchRegions}
            onItemsChange={(newItems) => onSettingsChange({ searchRegions: newItems })}
            placeholder="افزودن منطقه جدید..."
        />
         <div className="md:col-span-2">
             <EditableList
                title="دسته‌بندی‌های نوار اخبار متحرک"
                items={allTickerCategories}
                onItemsChange={(newItems) => onSettingsChange({ allTickerCategories: newItems })}
                placeholder="افزودن دسته‌بندی برای نوار اخبار..."
            />
        </div>
      </div>
    </div>
  );
};

export default FilterOptionsSettings;
