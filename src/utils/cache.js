/**
 * Cache Utility
 * Provides MongoDB-backed caching via the server's /api/cache endpoints.
 * All methods are async and fail silently (return null / do nothing) on errors.
 */

class Cache {
  /**
   * Create a cache instance
   * @param {string} name - Cache namespace (maps to MongoDB collection)
   * @param {number} ttlMinutes - Default TTL in minutes
   */
  constructor(name, ttlMinutes = 60) {
    this.name = name;
    this.ttlMinutes = ttlMinutes;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  async set(key, value) {
    try {
      const res = await fetch(`/api/cache/${this.name}/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, ttlMinutes: this.ttlMinutes }),
      });

      if (!res.ok) throw new Error(`Cache set failed: ${res.status}`);

      console.log(`Cache set: ${this.name}:${key} (TTL: ${this.ttlMinutes} min)`);
    } catch (error) {
      console.warn('Cache set error (falling back silently):', error.message);
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<*>} Cached value or null
   */
  async get(key) {
    try {
      const res = await fetch(`/api/cache/${this.name}/${encodeURIComponent(key)}`);

      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Cache get failed: ${res.status}`);

      const data = await res.json();
      if (data.hit) {
        console.log(`Cache hit: ${this.name}:${key}`);
        return data.value;
      }

      return null;
    } catch (error) {
      console.warn('Cache get error (falling back silently):', error.message);
      return null;
    }
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    try {
      await fetch(`/api/cache/${this.name}/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      console.log(`Cache deleted: ${this.name}:${key}`);
    } catch (error) {
      console.warn('Cache delete error (falling back silently):', error.message);
    }
  }

  /**
   * Clear all cache entries for this namespace
   */
  async clear() {
    try {
      await fetch(`/api/cache/${this.name}`, { method: 'DELETE' });
      console.log(`Cache cleared: ${this.name}`);
    } catch (error) {
      console.warn('Cache clear error (falling back silently):', error.message);
    }
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async has(key) {
    const value = await this.get(key);
    return value !== null;
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
