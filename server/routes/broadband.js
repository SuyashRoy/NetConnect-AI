/**
 * Broadband Lookup API Routes
 * Implements the full geocoding pipeline: Address → Lat/Lon → Census Block → DB Query
 */

import { Router } from 'express';
import { geocodeAddress } from '../services/geocoder.js';
import { getCensusBlockByCoordinates, getCensusBlockByAddress } from '../services/censusBlock.js';
import { getAvailabilityByBlock, getBlockSummary, isStateCovered } from '../services/availability.js';
import config from '../config.js';
import { getDb } from '../db/mongoConnection.js';

const router = Router();

/**
 * GET /api/broadband/lookup
 * Full pipeline: address string → geocode → census block → provider data
 *
 * Query params:
 *   address (required) - Full address string
 *   residential (optional, default: true) - Filter residential services only
 */
router.get('/lookup', async (req, res) => {
  const { address, residential } = req.query;

  if (!address || !address.trim()) {
    return res.status(400).json({ error: 'Address parameter is required' });
  }

  const startTime = Date.now();

  try {
    // Step 1: Geocode address → lat/lon
    console.log(`\n[Pipeline] Starting lookup for: "${address}"`);
    const geocoded = await geocodeAddress(address.trim());

    // Step 2: Convert lat/lon → Census Block FIPS
    const censusBlock = await getCensusBlockByCoordinates(geocoded.lat, geocoded.lon);

    // Check if the state is covered in our database
    const stateCode = censusBlock.stateFips;
    const stateName = config.coveredStates[stateCode];
    if (!stateName) {
      const coveredList = Object.values(config.coveredStates).join(', ');
      return res.json({
        address: geocoded.formattedAddress,
        coordinates: { lat: geocoded.lat, lon: geocoded.lon },
        censusBlock: censusBlock.blockGeoid,
        state: stateCode,
        covered: false,
        message: `We currently cover ${coveredList}. Your location (state FIPS: ${stateCode}) is not in our database yet.`,
        providers: [],
        summary: null,
        pipelineTimeMs: Date.now() - startTime,
      });
    }

    // Step 3: Query PostgreSQL for providers at this census block
    const residentialOnly = residential !== 'false';
    const availability = await getAvailabilityByBlock(censusBlock.blockGeoid, { residentialOnly });
    const summary = await getBlockSummary(censusBlock.blockGeoid);

    const pipelineTime = Date.now() - startTime;
    console.log(`[Pipeline] Complete in ${pipelineTime}ms: ${availability.totalProviders} providers found`);

    res.json({
      address: geocoded.formattedAddress,
      coordinates: { lat: geocoded.lat, lon: geocoded.lon },
      censusBlock: censusBlock.blockGeoid,
      state: stateCode,
      stateName,
      county: censusBlock.countyFips,
      covered: true,
      providers: availability.providers,
      totalProviders: availability.totalProviders,
      totalServices: availability.totalServices,
      summary,
      dataSource: 'fcc-bdc-database',
      dataAsOf: '2026-03-03',
      pipelineTimeMs: pipelineTime,
      breakdown: {
        geocodeSource: 'google-maps',
        censusBlockSource: 'census-bureau-api',
        availabilitySource: 'postgresql-fcc-bdc',
      },
    });
  } catch (err) {
    console.error('[Pipeline] Error:', err.message);
    res.status(500).json({
      error: 'Lookup failed',
      message: err.message,
      pipelineTimeMs: Date.now() - startTime,
    });
  }
});

/**
 * GET /api/broadband/by-coordinates
 * Lookup using pre-geocoded coordinates (skips Google Maps geocoding step)
 *
 * Query params:
 *   lat (required) - Latitude
 *   lon (required) - Longitude
 *   residential (optional, default: true)
 */
router.get('/by-coordinates', async (req, res) => {
  const { lat, lon, residential } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon parameters are required' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'lat and lon must be valid numbers' });
  }

  const startTime = Date.now();

  try {
    // Step 1: Convert lat/lon → Census Block FIPS
    const censusBlock = await getCensusBlockByCoordinates(latitude, longitude);

    // Check coverage
    const stateCode = censusBlock.stateFips;
    const stateName = config.coveredStates[stateCode];
    if (!stateName) {
      const coveredList = Object.values(config.coveredStates).join(', ');
      return res.json({
        coordinates: { lat: latitude, lon: longitude },
        censusBlock: censusBlock.blockGeoid,
        state: stateCode,
        covered: false,
        message: `We currently cover ${coveredList}. Your location is not in our database yet.`,
        providers: [],
        pipelineTimeMs: Date.now() - startTime,
      });
    }

    // Step 2: Query PostgreSQL
    const residentialOnly = residential !== 'false';
    const availability = await getAvailabilityByBlock(censusBlock.blockGeoid, { residentialOnly });
    const summary = await getBlockSummary(censusBlock.blockGeoid);

    const pipelineTime = Date.now() - startTime;

    res.json({
      coordinates: { lat: latitude, lon: longitude },
      censusBlock: censusBlock.blockGeoid,
      state: stateCode,
      stateName,
      covered: true,
      providers: availability.providers,
      totalProviders: availability.totalProviders,
      totalServices: availability.totalServices,
      summary,
      dataSource: 'fcc-bdc-database',
      dataAsOf: '2026-03-03',
      pipelineTimeMs: pipelineTime,
    });
  } catch (err) {
    console.error('[Pipeline] Coordinate lookup error:', err.message);
    res.status(500).json({
      error: 'Lookup failed',
      message: err.message,
      pipelineTimeMs: Date.now() - startTime,
    });
  }
});

/**
 * GET /api/broadband/coverage
 * Returns the list of states covered by the database
 */
router.get('/coverage', (_req, res) => {
  res.json({
    coveredStates: config.coveredStates,
    coveredStateAbbreviations: config.coveredStateAbbreviations,
    dataAsOf: '2026-03-03',
  });
});

/**
 * GET /api/broadband/health
 * Health check endpoint
 */
router.get('/health', async (_req, res) => {
  try {
    const dbOk = await isStateCovered('06'); // Quick check with California

    // Check MongoDB cache status
    let cacheStatus = 'unavailable';
    try {
      const db = getDb();
      if (db) {
        await db.command({ ping: 1 });
        cacheStatus = 'connected';
      }
    } catch { /* cache is optional */ }

    res.json({
      status: dbOk ? 'healthy' : 'degraded',
      database: dbOk ? 'connected' : 'error',
      cache: cacheStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      cache: 'unknown',
      error: err.message,
    });
  }
});

export default router;
