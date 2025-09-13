
// services/cacheService.ts
const CACHE_PREFIX = 'smart-news-cache-';
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheItem<T> {
    timestamp: number;
    data: T;
}

/**
 * Sets an item in the cache with a specific Time-To-Live (TTL).
 * @param key The cache key.
 * @param data The data to store.
 * @param ttl The TTL in milliseconds.
 */
export function set<T>(key: string, data: T, ttl: number = DEFAULT_TTL_MS): void {
    try {
        const item: CacheItem<T> = {
            timestamp: Date.now(),
            data,
        };
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
    } catch (error) {
        console.error('Error setting cache:', error);
    }
}

/**
 * Gets an item from the cache if it exists and has not expired.
 * @param key The cache key.
 * @param ttl The TTL in milliseconds.
 * @returns The cached data or null if not found or expired.
 */
export function get<T>(key: string, ttl: number = DEFAULT_TTL_MS): T | null {
    try {
        const itemString = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!itemString) {
            return null;
        }

        const item: CacheItem<T> = JSON.parse(itemString);
        const isExpired = (Date.now() - item.timestamp) > ttl;

        if (isExpired) {
            localStorage.removeItem(`${CACHE_PREFIX}${key}`);
            return null;
        }

        return item.data;
    } catch (error) {
        console.error('Error getting cache:', error);
        return null;
    }
}

/**
 * Clears all items from the application's cache.
 */
export function clearAll(): void {
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        console.log("Application API cache cleared.");
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}
