/**
 * MongoDB-backed Cache Service
 * Generic get/set/del/clear with per-collection TTL.
 * All methods fail silently (return null/false) — never throws.
 */

import { getDb } from '../db/mongoConnection.js';

// Track which collections already have a TTL index
const indexedCollections = new Set();

/**
 * Ensure the TTL index exists on a collection (runs once per collection per process)
 */
const ensureTTLIndex = async (collection) => {
  const name = collection.collectionName;
  if (indexedCollections.has(name)) return;

  try {
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, background: true }
    );
    indexedCollections.add(name);
  } catch (err) {
    // Index may already exist — that's fine
    if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
      indexedCollections.add(name);
    } else {
      console.warn(`[MongoCache] TTL index error on ${name}:`, err.message);
    }
  }
};

/**
 * Get a cached value
 * @param {string} collectionName - Cache collection name
 * @param {string} key - Cache key (stored as _id)
 * @returns {Promise<any|null>} Cached value or null
 */
export const get = async (collectionName, key) => {
  try {
    const db = getDb();
    if (!db) return null;

    const collection = db.collection(collectionName);
    const doc = await collection.findOne({ _id: key });

    if (!doc) return null;

    // Double-check expiration (MongoDB TTL monitor can lag up to 60s)
    if (doc.expiresAt && doc.expiresAt < new Date()) {
      return null;
    }

    console.log(`[MongoCache] HIT ${collectionName}:${key}`);
    return doc.value;
  } catch (err) {
    console.warn(`[MongoCache] GET error (${collectionName}):`, err.message);
    return null;
  }
};

/**
 * Set a cached value
 * @param {string} collectionName - Cache collection name
 * @param {string} key - Cache key (stored as _id)
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time-to-live in seconds
 * @returns {Promise<boolean>} Success
 */
export const set = async (collectionName, key, value, ttlSeconds) => {
  try {
    const db = getDb();
    if (!db) return false;

    const collection = db.collection(collectionName);
    await ensureTTLIndex(collection);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    await collection.updateOne(
      { _id: key },
      { $set: { value, createdAt: now, expiresAt } },
      { upsert: true }
    );

    console.log(`[MongoCache] SET ${collectionName}:${key} (TTL: ${ttlSeconds}s)`);
    return true;
  } catch (err) {
    console.warn(`[MongoCache] SET error (${collectionName}):`, err.message);
    return false;
  }
};

/**
 * Delete a cached value
 * @param {string} collectionName - Cache collection name
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success
 */
export const del = async (collectionName, key) => {
  try {
    const db = getDb();
    if (!db) return false;

    await db.collection(collectionName).deleteOne({ _id: key });
    return true;
  } catch (err) {
    console.warn(`[MongoCache] DEL error (${collectionName}):`, err.message);
    return false;
  }
};

/**
 * Clear all entries in a cache collection
 * @param {string} collectionName - Cache collection name
 * @returns {Promise<boolean>} Success
 */
export const clear = async (collectionName) => {
  try {
    const db = getDb();
    if (!db) return false;

    await db.collection(collectionName).deleteMany({});
    console.log(`[MongoCache] CLEARED ${collectionName}`);
    return true;
  } catch (err) {
    console.warn(`[MongoCache] CLEAR error (${collectionName}):`, err.message);
    return false;
  }
};
