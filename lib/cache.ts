/**
 * Local Cache Manager
 * Handles client-side caching with TTL (Time To Live) support
 * Reduces unnecessary Supabase queries and improves performance
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // in milliseconds
}

class CacheManager {
    private prefix = 'Challenge Gym_cache_';

    /**
     * Set cache with TTL
     * @param key Cache key
     * @param data Data to cache
     * @param ttlMinutes Time to live in minutes (default: 5)
     */
    set<T>(key: string, data: T, ttlMinutes: number = 5): void {
        try {
            const cacheEntry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                ttl: ttlMinutes * 60 * 1000,
            };
            localStorage.setItem(
                this.prefix + key,
                JSON.stringify(cacheEntry)
            );
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Get cache if valid (not expired)
     * @param key Cache key
     * @returns Cached data or null if expired/not found
     */
    get<T>(key: string): T | null {
        try {
            const cached = localStorage.getItem(this.prefix + key);
            if (!cached) return null;

            const entry: CacheEntry<T> = JSON.parse(cached);
            const age = Date.now() - entry.timestamp;

            // Check if cache is expired
            if (age > entry.ttl) {
                this.remove(key);
                return null;
            }

            return entry.data;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Check if cache exists and is valid
     * @param key Cache key
     * @returns true if valid cache exists
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Remove specific cache entry
     * @param key Cache key
     */
    remove(key: string): void {
        try {
            localStorage.removeItem(this.prefix + key);
        } catch (error) {
            console.error('Cache remove error:', error);
        }
    }

    /**
     * Clear all cache entries for this app
     */
    clearAll(): void {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    /**
     * Clear specific cache pattern
     * @param pattern Pattern to match (e.g., 'profile_*')
     */
    clearPattern(pattern: string): void {
        try {
            const keys = Object.keys(localStorage);
            const regex = new RegExp(`^${this.prefix}${pattern}`);
            keys.forEach(key => {
                if (regex.test(key)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Cache clear pattern error:', error);
        }
    }

    /**
     * Get cache info (age in seconds)
     * @param key Cache key
     * @returns Age in seconds or null if not cached
     */
    getAge(key: string): number | null {
        try {
            const cached = localStorage.getItem(this.prefix + key);
            if (!cached) return null;

            const entry = JSON.parse(cached);
            return Math.floor((Date.now() - entry.timestamp) / 1000);
        } catch (error) {
            return null;
        }
    }
}

export const cache = new CacheManager();

/**
 * Cache keys used throughout the app
 * Centralized to avoid typos and ensure consistency
 */
export const CACHE_KEYS = {
    // Profile
    PROFILE_DATA: 'profile_data',
    PROFILE_AVATAR: 'profile_avatar',

    // Dashboard
    DASHBOARD_STATS: 'dashboard_stats',
    DASHBOARD_TREND: 'dashboard_trend',
    DASHBOARD_TREND_PERIOD: 'dashboard_trend_period',

    // Workouts
    USER_PROGRAMS: 'user_programs',
    WORKOUT_DETAIL: 'workout_detail_',
    WORKOUT_CATEGORIES: 'workout_categories',

    // Explore
    EXPLORE_CATEGORIES: 'explore_categories',
    EXPLORE_VIDEOS: 'explore_videos',
    EXPLORE_FEATURED: 'explore_featured',

    // Admin
    ADMIN_STATS: 'admin_stats',
    ADMIN_USERS: 'admin_users',
    ADMIN_ORDERS: 'admin_orders',
    ADMIN_VIDEOS: 'admin_videos',

    // Auth
    USER_ROLE: 'user_role',

    // AI
    AI_ADVICE: 'ai_advice',

    // Notifications
    USER_NOTIFICATIONS: 'user_notifications',
    UNREAD_NOTIFICATION_COUNT: 'unread_notification_count',

    // AI Nutrition Coach
    AI_RECOMMENDATIONS: 'ai_recommendations',
    AI_LEARNING_PATTERNS: 'ai_learning_patterns',
} as const;

/**
 * Cache TTL (Time To Live) configurations in minutes
 * Adjust based on how often data changes
 */
export const CACHE_TTL = {
    SHORT: 1,        // 1 minute - for frequently changing data
    MEDIUM: 5,       // 5 minutes - for normal data
    LONG: 10,        // 10 minutes - for static data
    VERY_LONG: 15,   // 15 minutes - for rarely changing data
} as const;
