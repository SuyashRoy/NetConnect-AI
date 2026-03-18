/**
 * Server-side Google Maps Geocoding Service
 * Converts addresses to lat/lon coordinates.
 */

import config from '../config.js';
import * as mongoCache from './mongoCache.js';

const COLLECTION = 'geocode_cache';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Normalize address string for deterministic cache keys */
const normalizeAddressKey = (address) =>
  address.toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * Geocode an address to lat/lon using Google Maps Geocoding API
 * @param {string} address - Full address string
 * @returns {Promise<object>} Geocoding result with coordinates and address components
 */
export const geocodeAddress = async (address) => {
  const apiKey = config.googleMapsApiKey;
  if (!apiKey) {
    throw new Error('Google Maps API key not configured (VITE_GOOGLE_MAPS_API_KEY)');
  }

  // Check MongoDB cache first
  const cacheKey = normalizeAddressKey(address);
  const cached = await mongoCache.get(COLLECTION, cacheKey);
  if (cached) {
    console.log(`[Geocoder] Cache hit for "${address}"`);
    return cached;
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  console.log(`[Geocoder] Geocoding: "${address}"`);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'No results'}`);
  }

  const result = data.results[0];
  const { lat, lng } = result.geometry.location;

  // Extract address components
  const getComponent = (types) => {
    const comp = result.address_components.find(c =>
      types.some(t => c.types.includes(t))
    );
    return comp?.long_name || comp?.short_name || null;
  };

  const geocoded = {
    lat,
    lon: lng,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    locationType: result.geometry.location_type,
    components: {
      streetNumber: getComponent(['street_number']),
      street: getComponent(['route']),
      city: getComponent(['locality', 'sublocality']),
      county: getComponent(['administrative_area_level_2']),
      state: getComponent(['administrative_area_level_1']),
      stateShort: result.address_components.find(c => c.types.includes('administrative_area_level_1'))?.short_name || null,
      zip: getComponent(['postal_code']),
      country: getComponent(['country']),
    },
  };

  // Cache the successful result (fire-and-forget)
  mongoCache.set(COLLECTION, cacheKey, geocoded, TTL_SECONDS).catch(() => {});

  console.log(`[Geocoder] Result: (${lat}, ${lng}) → ${geocoded.formattedAddress}`);
  return geocoded;
};
