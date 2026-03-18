/**
 * MongoDB Atlas Connection Singleton
 * Used for persistent caching of geocoding, census block, and availability lookups.
 * Fail-open: if MongoDB is unavailable, services work without caching.
 */

import { MongoClient } from 'mongodb';
import config from '../config.js';

const DB_NAME = 'netconnect_cache';

let client = null;
let db = null;

/**
 * Connect to MongoDB Atlas
 * @returns {Promise<import('mongodb').Db|null>} Database instance or null on failure
 */
export const connectMongo = async () => {
  if (db) return db;

  const uri = config.mongoUri;
  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI not set — caching disabled');
    return null;
  }

  try {
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`[MongoDB] Connected to ${DB_NAME} on Atlas`);
    return db;
  } catch (err) {
    console.warn('[MongoDB] Connection failed (caching disabled):', err.message);
    client = null;
    db = null;
    return null;
  }
};

/**
 * Get the current database instance (must call connectMongo first)
 * @returns {import('mongodb').Db|null}
 */
export const getDb = () => db;

/**
 * Test the MongoDB connection
 * @returns {Promise<boolean>}
 */
export const testConnection = async () => {
  try {
    const database = await connectMongo();
    if (!database) return false;
    await database.command({ ping: 1 });
    return true;
  } catch (err) {
    console.warn('[MongoDB] Ping failed:', err.message);
    return false;
  }
};

/**
 * Close the MongoDB connection
 */
export const closeMongo = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed');
  }
};
