/**
 * Google Places Reviews Service
 * Fetches real customer reviews for ISP providers using Google Places API
 */

import { getGoogleMapsKey } from '../utils/env';
import { reviewsCache } from '../utils/cache';

/**
 * Find ISP place using Google Places Text Search
 * @param {string} providerName - ISP provider name
 * @param {Array} coordinates - [latitude, longitude]
 * @returns {Promise<object|null>} Place object or null
 */
const findISPPlace = async (providerName, coordinates) => {
  try {
    const apiKey = getGoogleMapsKey();
    const [lat, lng] = coordinates;
    const query = `${providerName} store`;

    // Build Google Places API URL
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=5000&key=${apiKey}`;

    console.log(`Finding place for ${providerName} near ${lat},${lng}`);

    // Use CORS proxy to bypass CORS restrictions
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const response = await fetch(corsProxy + encodeURIComponent(url));

    if (!response.ok) {
      throw new Error(`Places search failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log(`No places found for ${providerName}`);
      return null;
    }

    // Return first result
    const place = data.results[0];
    console.log(`Found place: ${place.name} (${place.place_id})`);

    return place;

  } catch (error) {
    console.error('Error finding ISP place:', error);
    return null;
  }
};

/**
 * Get detailed place information including reviews
 * @param {string} placeId - Google Places place ID
 * @returns {Promise<object|null>} Place details or null
 */
const getPlaceReviews = async (placeId) => {
  try {
    const apiKey = getGoogleMapsKey();

    // Build Places Details API URL
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&key=${apiKey}`;

    console.log(`Fetching reviews for place ID: ${placeId}`);

    // Use CORS proxy
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const response = await fetch(corsProxy + encodeURIComponent(url));

    if (!response.ok) {
      throw new Error(`Place details failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.result) {
      console.log('No place details found');
      return null;
    }

    return data.result;

  } catch (error) {
    console.error('Error getting place reviews:', error);
    return null;
  }
};

/**
 * Fetch provider reviews from Google Places
 * @param {string} providerName - Provider name
 * @param {Array} coordinates - [latitude, longitude]
 * @returns {Promise<object>} Review data
 */
export const fetchProviderReviews = async (providerName, coordinates) => {
  // Generate cache key
  const cacheKey = `${providerName}-${coordinates[0].toFixed(4)}-${coordinates[1].toFixed(4)}`;

  // Check cache first
  const cached = reviewsCache.get(cacheKey);
  if (cached) {
    console.log(`Reviews cache hit for ${providerName}`);
    return cached;
  }

  try {
    // Find the place
    const place = await findISPPlace(providerName, coordinates);

    if (!place) {
      throw new Error('Place not found');
    }

    // Get detailed reviews
    const details = await getPlaceReviews(place.place_id);

    if (!details) {
      throw new Error('Details not found');
    }

    // Format review data
    const reviewData = {
      provider: providerName,
      overallRating: details.rating || 0,
      totalReviews: details.user_ratings_total || 0,
      reviews: (details.reviews || []).slice(0, 5).map(review => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time,
        relativeTime: review.relative_time_description
      })),
      source: 'Google Places',
      placeId: place.place_id,
      placeName: place.name,
      lastUpdated: new Date().toISOString()
    };

    // Cache the result
    reviewsCache.set(cacheKey, reviewData);

    console.log(`Fetched ${reviewData.reviews.length} reviews for ${providerName}`);

    return reviewData;

  } catch (error) {
    console.error(`Error fetching reviews for ${providerName}:`, error);

    // Return empty review data on error
    const emptyData = {
      provider: providerName,
      overallRating: 0,
      totalReviews: 0,
      reviews: [],
      source: 'Unavailable',
      error: error.message,
      lastUpdated: new Date().toISOString()
    };

    return emptyData;
  }
};

/**
 * Fetch reviews for multiple providers in parallel
 * @param {Array<string>} providerNames - Array of provider names
 * @param {Array} coordinates - [latitude, longitude]
 * @returns {Promise<object>} Map of provider names to review data
 */
export const fetchMultipleProviderReviews = async (providerNames, coordinates) => {
  console.log(`Fetching reviews for ${providerNames.length} providers`);

  const reviewPromises = providerNames.map(name =>
    fetchProviderReviews(name, coordinates)
  );

  const results = await Promise.allSettled(reviewPromises);

  // Convert to object map
  const reviewsMap = {};
  results.forEach((result, index) => {
    const providerName = providerNames[index];

    if (result.status === 'fulfilled') {
      reviewsMap[providerName] = result.value;
    } else {
      reviewsMap[providerName] = {
        provider: providerName,
        overallRating: 0,
        totalReviews: 0,
        reviews: [],
        source: 'Error',
        error: result.reason?.message || 'Unknown error'
      };
    }
  });

  return reviewsMap;
};
