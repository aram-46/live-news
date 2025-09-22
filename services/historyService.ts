import { SearchHistoryItem, generateUUID } from '../types';

const HISTORY_KEY = 'search-history';
const MAX_HISTORY_ITEMS = 100;

export function getHistory(): SearchHistoryItem[] {
    try {
        const historyString = localStorage.getItem(HISTORY_KEY);
        return historyString ? JSON.parse(historyString) : [];
    } catch (error) {
        console.error("Failed to get history:", error);
        return [];
    }
}

export function saveHistoryItem(item: Omit<SearchHistoryItem, 'id' | 'timestamp' | 'isFavorite'>): void {
    if (!item.query && !item.resultSummary) {
        // Avoid saving empty or incomplete items
        return;
    }
    try {
        const currentHistory = getHistory();
        const newItem: SearchHistoryItem = {
            ...item,
            id: generateUUID(),
            timestamp: Date.now(),
            isFavorite: false,
        };
        const newHistory = [newItem, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
        console.error("Failed to save history item:", error);
    }
}

export function updateHistory(history: SearchHistoryItem[]): void {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Failed to update history:", error);
    }
}

export function clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
}
