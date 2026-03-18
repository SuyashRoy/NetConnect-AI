/**
 * Census Block FIPS Lookup Service
 * Converts lat/lon coordinates to a 15-digit Census Block FIPS code
 * using the US Census Bureau Geocoder API (free, no key required).
 */

import * as mongoCache from './mongoCache.js';

const COLLECTION = 'census_block_cache';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Get Census Block FIPS code from coordinates using Census Bureau Geocoder API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<object>} Census block info with FIPS code
 */
export const getCensusBlockByCoordinates = async (lat, lon) => {
  const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;

  // Check MongoDB cache first
  const cached = await mongoCache.get(COLLECTION, cacheKey);
  if (cached) {
    console.log(`[Census] Cache hit for ${cacheKey}`);
    return cached;
  }

  const url = new URL('https://geocoding.geo.census.gov/geocoder/geographies/coordinates');
  url.searchParams.set('x', lon.toString());
  url.searchParams.set('y', lat.toString());
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('vintage', 'Census2020_Current');
  url.searchParams.set('format', 'json');

  console.log(`[Census] Looking up census block for (${lat}, ${lon})...`);

  const response = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000), // 15s timeout (Census API can be slow)
  });

  if (!response.ok) {
    throw new Error(`Census Bureau API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Extract Census Block info from response
  const geographies = data?.result?.geographies;
  if (!geographies) {
    throw new Error('Census Bureau API returned unexpected response format');
  }

  // Try "Census Blocks" key first, then "2020 Census Blocks"
  const blocks = geographies['Census Blocks'] || geographies['2020 Census Blocks'];
  if (!blocks || blocks.length === 0) {
    throw new Error(`No census block found for coordinates (${lat}, ${lon}). The location may be outside the US.`);
  }

  const block = blocks[0];
  const blockGeoid = block.GEOID || block.GEOID20;

  if (!blockGeoid) {
    throw new Error('Census block response missing GEOID field');
  }

  const result = {
    blockGeoid,
    stateFips: blockGeoid.substring(0, 2),
    countyFips: blockGeoid.substring(0, 5),
    tractFips: blockGeoid.substring(0, 11),
    blockFips: blockGeoid,
    state: block.STATE,
    county: block.COUNTY,
    tract: block.TRACT,
    block: block.BLOCK,
    name: block.NAME || null,
  };

  // Cache the result (fire-and-forget)
  mongoCache.set(COLLECTION, cacheKey, result, TTL_SECONDS).catch(() => {});

  console.log(`[Census] Found block GEOID: ${blockGeoid} (State: ${result.stateFips})`);

  return result;
};

/**
 * Try getting Census Block FIPS directly from an address string
 * (bypasses Google Maps geocoding - uses Census Bureau's own address geocoder)
 * @param {string} street - Street address
 * @param {string} city - City name
 * @param {string} state - State abbreviation
 * @returns {Promise<object|null>} Census block info or null if not found
 */
export const getCensusBlockByAddress = async (street, city, state) => {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/geographies/address');
  url.searchParams.set('street', street);
  url.searchParams.set('city', city);
  url.searchParams.set('state', state);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('vintage', 'Census2020_Current');
  url.searchParams.set('format', 'json');

  console.log(`[Census] Address-based lookup: ${street}, ${city}, ${state}`);

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const matches = data?.result?.addressMatches;

    if (!matches || matches.length === 0) {
      console.log('[Census] No address match from Census Geocoder');
      return null;
    }

    const match = matches[0];
    const geographies = match.geographies;
    const blocks = geographies?.['Census Blocks'] || geographies?.['2020 Census Blocks'];

    if (!blocks || blocks.length === 0) return null;

    const block = blocks[0];
    const blockGeoid = block.GEOID || block.GEOID20;
    if (!blockGeoid) return null;

    const result = {
      blockGeoid,
      stateFips: blockGeoid.substring(0, 2),
      countyFips: blockGeoid.substring(0, 5),
      tractFips: blockGeoid.substring(0, 11),
      blockFips: blockGeoid,
      state: block.STATE,
      county: block.COUNTY,
      tract: block.TRACT,
      block: block.BLOCK,
      coordinates: {
        lat: parseFloat(match.coordinates.y),
        lon: parseFloat(match.coordinates.x),
      },
      matchedAddress: match.matchedAddress,
    };

    console.log(`[Census] Address-based lookup found block: ${blockGeoid}`);
    return result;
  } catch (err) {
    console.warn('[Census] Address-based lookup failed:', err.message);
    return null;
  }
};
