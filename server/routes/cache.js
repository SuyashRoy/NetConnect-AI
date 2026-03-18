/**
 * Cache API Routes
 * REST endpoints for client-side cache CRUD, backed by MongoDB via mongoCache.js
 */

import { Router } from 'express';
import * as mongoCache from '../services/mongoCache.js';

const router = Router();

// Default TTL per namespace (in seconds)
const DEFAULT_TTL = {
  reviews: 24 * 60 * 60,       // 24 hours
  geocode: 7 * 24 * 60 * 60,   // 7 days
  offerings: 60 * 60,           // 1 hour
};

/**
 * GET /api/cache/:namespace/:key
 * Retrieve a cached value
 */
router.get('/:namespace/:key', async (req, res) => {
  const { namespace, key } = req.params;
  const value = await mongoCache.get(namespace, key);

  if (value === null) {
    return res.status(404).json({ hit: false });
  }

  res.json({ hit: true, value });
});

/**
 * POST /api/cache/:namespace/:key
 * Store a value. Body: { value, ttlMinutes? }
 */
router.post('/:namespace/:key', async (req, res) => {
  const { namespace, key } = req.params;
  const { value, ttlMinutes } = req.body;

  if (value === undefined) {
    return res.status(400).json({ error: 'value is required in request body' });
  }

  const ttlSeconds = ttlMinutes
    ? ttlMinutes * 60
    : DEFAULT_TTL[namespace] || 3600;

  const ok = await mongoCache.set(namespace, key, value, ttlSeconds);
  res.json({ ok });
});

/**
 * DELETE /api/cache/:namespace/:key
 * Delete a single cache entry
 */
router.delete('/:namespace/:key', async (req, res) => {
  const { namespace, key } = req.params;
  const ok = await mongoCache.del(namespace, key);
  res.json({ ok });
});

/**
 * DELETE /api/cache/:namespace
 * Clear all entries in a namespace
 */
router.delete('/:namespace', async (req, res) => {
  const { namespace } = req.params;
  const ok = await mongoCache.clear(namespace);
  res.json({ ok });
});

export default router;
