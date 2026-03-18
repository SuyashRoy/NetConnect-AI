/**
 * Broadband Availability Service
 * Queries PostgreSQL for provider data by Census Block FIPS code.
 */

import pool from '../db/connection.js';
import * as mongoCache from './mongoCache.js';

const COLLECTION = 'availability_cache';
const TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Get broadband availability for a Census Block GEOID
 * Groups results by provider with their service offerings.
 * @param {string} blockGeoid - 15-digit Census Block FIPS code
 * @param {object} options - Query options
 * @param {boolean} options.residentialOnly - Filter to residential services (default: true)
 * @returns {Promise<object[]>} Array of provider objects with services
 */
export const getAvailabilityByBlock = async (blockGeoid, options = {}) => {
  const { residentialOnly = true } = options;

  // Check MongoDB cache first
  const cacheKey = `${blockGeoid}:${residentialOnly ? 'res' : 'all'}`;
  const cached = await mongoCache.get(COLLECTION, cacheKey);
  if (cached) {
    console.log(`[DB] Cache hit for availability: ${cacheKey}`);
    return cached;
  }

  let query = `
    SELECT
      brand_name,
      provider_id,
      technology,
      technology_name,
      max_download,
      max_upload,
      serves_residential,
      serves_business,
      low_latency
    FROM block_availability
    WHERE block_geoid = $1
  `;

  if (residentialOnly) {
    query += ` AND serves_residential = TRUE`;
  }

  query += ` ORDER BY max_download DESC`;

  console.log(`[DB] Querying providers for block: ${blockGeoid}`);
  const startTime = Date.now();

  const result = await pool.query(query, [blockGeoid]);
  const queryTime = Date.now() - startTime;

  console.log(`[DB] Found ${result.rows.length} service entries in ${queryTime}ms`);

  // Group by provider
  const providers = {};
  for (const row of result.rows) {
    const name = row.brand_name;
    if (!providers[name]) {
      providers[name] = {
        name,
        providerId: row.provider_id,
        services: [],
      };
    }
    providers[name].services.push({
      technology: row.technology_name,
      technologyCode: row.technology,
      maxDownloadMbps: parseFloat(row.max_download),
      maxUploadMbps: parseFloat(row.max_upload),
      lowLatency: row.low_latency,
      servesResidential: row.serves_residential,
      servesBusiness: row.serves_business,
    });
  }

  const availability = {
    providers: Object.values(providers),
    totalServices: result.rows.length,
    totalProviders: Object.keys(providers).length,
    queryTimeMs: queryTime,
  };

  // Cache the result (fire-and-forget)
  mongoCache.set(COLLECTION, cacheKey, availability, TTL_SECONDS).catch(() => {});

  return availability;
};

/**
 * Check if a state FIPS code is covered in the database
 * @param {string} stateFips - 2-digit state FIPS code
 * @returns {Promise<boolean>}
 */
export const isStateCovered = async (stateFips) => {
  const result = await pool.query(
    'SELECT EXISTS(SELECT 1 FROM block_availability WHERE state_fips = $1 LIMIT 1) AS covered',
    [stateFips]
  );
  return result.rows[0].covered;
};

/**
 * Get summary statistics for a census block
 * @param {string} blockGeoid - 15-digit Census Block FIPS code
 * @returns {Promise<object>}
 */
export const getBlockSummary = async (blockGeoid) => {
  // Check MongoDB cache first
  const cacheKey = `summary:${blockGeoid}`;
  const cached = await mongoCache.get(COLLECTION, cacheKey);
  if (cached) {
    console.log(`[DB] Cache hit for summary: ${cacheKey}`);
    return cached;
  }

  const result = await pool.query(`
    SELECT
      COUNT(DISTINCT brand_name) AS provider_count,
      COUNT(*) AS service_count,
      MAX(max_download) AS max_download_available,
      MAX(max_upload) AS max_upload_available,
      BOOL_OR(technology = 50) AS has_fiber,
      BOOL_OR(technology = 40) AS has_cable,
      BOOL_OR(technology = 10) AS has_dsl
    FROM block_availability
    WHERE block_geoid = $1 AND serves_residential = TRUE
  `, [blockGeoid]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const summary = {
    providerCount: parseInt(row.provider_count),
    serviceCount: parseInt(row.service_count),
    maxDownloadAvailable: parseFloat(row.max_download_available) || 0,
    maxUploadAvailable: parseFloat(row.max_upload_available) || 0,
    hasFiber: row.has_fiber,
    hasCable: row.has_cable,
    hasDsl: row.has_dsl,
  };

  // Cache the result (fire-and-forget)
  mongoCache.set(COLLECTION, cacheKey, summary, TTL_SECONDS).catch(() => {});

  return summary;
};
