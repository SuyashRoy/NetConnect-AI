/**
 * Google Maps Geocoding Service
 * Converts addresses to coordinates using Google Maps Geocoding API with fallback to mock geocoding
 */

import { getGoogleMapsKey } from '../utils/env';

/**
 * Transform Google Maps Geocoding response to application format
 * @param {object} data - Google Maps geocoding response
 * @returns {object} Geocoding result in app format
 */
const transformGoogleMapsResponse = (data) => {
  if (!data.results || data.results.length === 0) {
    throw new Error('No results found for this address');
  }

  const result = data.results[0];
  const { lat, lng } = result.geometry.location;

  // Extract address components
  const getComponent = (types) => {
    const component = result.address_components.find(comp =>
      types.some(type => comp.types.includes(type))
    );
    return component?.long_name || component?.short_name || null;
  };

  return {
    coordinates: [lat, lng], // [latitude, longitude]
    formattedAddress: result.formatted_address,
    placeContext: {
      city: getComponent(['locality', 'sublocality']),
      state: getComponent(['administrative_area_level_1']),
      zip: getComponent(['postal_code']),
      country: getComponent(['country'])
    },
    placeId: result.place_id,
    bounds: result.geometry.bounds,
    viewport: result.geometry.viewport,
    locationType: result.geometry.location_type,
    source: 'google-maps',
    confidence: 1.0,
    timestamp: new Date().toISOString()
  };
};

/**
 * Fallback geocoding using mock data
 * Used when Google Maps API is unavailable or fails
 * @param {string} address - Address to geocode
 * @returns {object} Mock geocoding result
 */
const fallbackGeocode = (address) => {
  console.log('Using fallback mock geocoding for:', address);

  // Extract basic info from address string
  const addressLower = address.toLowerCase();
  let mockLat = 37.7749; // Default: San Francisco
  let mockLng = -122.4194;
  let city = 'San Francisco';
  let state = 'CA';

  // Simple pattern matching for common cities
  const cityMap = {
    'new york': { lat: 40.7128, lng: -74.0060, city: 'New York', state: 'NY' },
    'los angeles': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', state: 'CA' },
    'chicago': { lat: 41.8781, lng: -87.6298, city: 'Chicago', state: 'IL' },
    'houston': { lat: 29.7604, lng: -95.3698, city: 'Houston', state: 'TX' },
    'phoenix': { lat: 33.4484, lng: -112.0740, city: 'Phoenix', state: 'AZ' },
    'philadelphia': { lat: 39.9526, lng: -75.1652, city: 'Philadelphia', state: 'PA' },
    'san antonio': { lat: 29.4241, lng: -98.4936, city: 'San Antonio', state: 'TX' },
    'san diego': { lat: 32.7157, lng: -117.1611, city: 'San Diego', state: 'CA' },
    'dallas': { lat: 32.7767, lng: -96.7970, city: 'Dallas', state: 'TX' },
    'austin': { lat: 30.2672, lng: -97.7431, city: 'Austin', state: 'TX' },
    'seattle': { lat: 47.6062, lng: -122.3321, city: 'Seattle', state: 'WA' },
    'denver': { lat: 39.7392, lng: -104.9903, city: 'Denver', state: 'CO' },
    'boston': { lat: 42.3601, lng: -71.0589, city: 'Boston', state: 'MA' },
    'atlanta': { lat: 33.7490, lng: -84.3880, city: 'Atlanta', state: 'GA' },
    'miami': { lat: 25.7617, lng: -80.1918, city: 'Miami', state: 'FL' }
  };

  // Find matching city
  for (const [cityName, coords] of Object.entries(cityMap)) {
    if (addressLower.includes(cityName)) {
      mockLat = coords.lat;
      mockLng = coords.lng;
      city = coords.city;
      state = coords.state;
      break;
    }
  }

  return {
    coordinates: [mockLat, mockLng],
    formattedAddress: address,
    placeContext: {
      city: city,
      state: state,
      zip: null,
      country: 'United States'
    },
    source: 'mock',
    confidence: 0.5,
    timestamp: new Date().toISOString()
  };
};

/**
 * Geocode an address using Google Maps Geocoding API
 * @param {string} address - Address to geocode
 * @returns {Promise<object>} Geocoding result
 */
export const geocodeAddress = async (address) => {
  if (!address || !address.trim()) {
    throw new Error('Address is required');
  }

  try {
    // Try to get Google Maps API key
    const apiKey = getGoogleMapsKey();

    // Build Google Maps Geocoding API URL
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    console.log('Geocoding with Google Maps:', address);

    // Fetch from Google Maps Geocoding API
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check API response status
    if (data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    // Transform and return result
    const result = transformGoogleMapsResponse(data);
    console.log('Google Maps geocoding successful:', result);

    return result;

  } catch (error) {
    console.error('Google Maps geocoding error:', error.message);
    console.log('Falling back to mock geocoding');

    // Fallback to mock geocoding
    return fallbackGeocode(address);
  }
};

/**
 * Reverse geocode coordinates to an address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<object>} Reverse geocoding result
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const apiKey = getGoogleMapsKey();
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    console.log('Reverse geocoding:', lat, lng);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Reverse geocoding failed: ${data.status}`);
    }

    const result = transformGoogleMapsResponse(data);
    console.log('Reverse geocoding successful:', result);

    return result;

  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    throw error;
  }
};

/**
 * Get place details by Place ID
 * @param {string} placeId - Google Place ID
 * @returns {Promise<object>} Place details with geocoding
 */
export const geocodeByPlaceId = async (placeId) => {
  try {
    const apiKey = getGoogleMapsKey();
    const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${apiKey}`;

    console.log('Geocoding by Place ID:', placeId);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Geocoding by Place ID failed: ${data.status}`);
    }

    const result = transformGoogleMapsResponse(data);
    console.log('Place ID geocoding successful:', result);

    return result;

  } catch (error) {
    console.error('Place ID geocoding error:', error.message);
    throw error;
  }
};
