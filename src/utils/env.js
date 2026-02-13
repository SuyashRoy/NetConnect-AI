/**
 * Environment variable utilities
 * Provides centralized access to API keys with validation
 */

/**
 * Get Google Maps API key (used for Geocoding, Places, and Autocomplete)
 * @returns {string} Google Maps API key
 * @throws {Error} If key is not configured
 */
export const getGoogleMapsKey = () => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!key || key === 'your_google_maps_api_key_here') {
    console.warn('Google Maps API key not configured. Using fallback geocoding.');
    throw new Error('Google Maps API key not configured');
  }

  return key;
};

/**
 * Get Gemini API key
 * @returns {string} Gemini API key
 * @throws {Error} If key is not configured
 */
export const getGeminiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;

  if (!key || key === 'your_gemini_api_key_here') {
    console.warn('Gemini API key not configured. AI chatbot will be unavailable.');
    throw new Error('Gemini API key not configured');
  }

  return key;
};

/**
 * Check if all API keys are configured
 * @returns {object} Status of each API key
 */
export const checkApiKeys = () => {
  return {
    googleMaps: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key_here',
    gemini: !!import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here'
  };
};
