/**
 * Cache Utility
 * Provides localStorage-based caching with TTL (time-to-live) support
 */

/**
 * Simple cache class with TTL support
 */
class Cache {
  /**
   * Create a cache instance
   * @param {string} name - Cache namespace
   * @param {number} ttlMinutes - Time-to-live in minutes (default: 60)
   */
  constructor(name, ttlMinutes = 60) {
    this.name = name;
    this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache (will be JSON serialized)
   */
  set(key, value) {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        expires: Date.now() + this.ttl
      };

      const cacheKey = `${this.name}:${key}`;
      localStorage.setItem(cacheKey, JSON.stringify(item));

      console.log(`Cache set: ${cacheKey} (expires in ${this.ttl / 60000} minutes)`);
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found/expired
   */
  get(key) {
    try {
      const cacheKey = `${this.name}:${key}`;
      const itemStr = localStorage.getItem(cacheKey);

      if (!itemStr) {
        return null;
      }

      const item = JSON.parse(itemStr);

      // Check if expired
      if (Date.now() > item.expires) {
        console.log(`Cache expired: ${cacheKey}`);
        this.delete(key);
        return null;
      }

      const age = Math.round((Date.now() - item.timestamp) / 60000);
      console.log(`Cache hit: ${cacheKey} (age: ${age} minutes)`);

      return item.value;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    try {
      const cacheKey = `${this.name}:${key}`;
      localStorage.removeItem(cacheKey);
      console.log(`Cache deleted: ${cacheKey}`);
    } catch (error) {
      console.error('Error deleting cache:', error);
    }
  }

  /**
   * Clear all cache entries for this namespace
   */
  clear() {
    try {
      const prefix = `${this.name}:`;
      const keysToDelete = [];

      // Find all keys with our prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }

      // Delete them
      keysToDelete.forEach(key => localStorage.removeItem(key));

      console.log(`Cache cleared: ${this.name} (${keysToDelete.length} items)`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    return this.get(key) !== null;
  }
}

/**
 * Pre-configured cache instances
 */

// Cache for Google Places reviews (24 hours)
export const reviewsCache = new Cache('reviews', 24 * 60);

// Cache for geocoding results (7 days)
export const geocodeCache = new Cache('geocode', 7 * 24 * 60);

// Cache for provider offerings (1 hour)
export const offeringsCache = new Cache('offerings', 60);

// Export Cache class for custom instances
export default Cache;
