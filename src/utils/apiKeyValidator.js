/**
 * API Key Validator
 * Utility to validate and debug API key configuration
 */

import { getGoogleMapsKey, getGeminiKey, checkApiKeys } from './env';

/**
 * Validate all API keys and log status
 * Call this in development to check API key configuration
 */
export const validateApiKeys = () => {
  console.group('🔑 API Key Validation');

  const status = checkApiKeys();

  // Google Maps API
  console.log('📍 Google Maps API:');
  try {
    const key = getGoogleMapsKey();
    if (key && key.startsWith('AIza')) {
      console.log('  ✅ Configured (key starts with AIza...)');
      console.log(`  📝 Key preview: ${key.substring(0, 10)}...${key.substring(key.length - 4)}`);
    } else {
      console.log('  ❌ Invalid format (should start with AIza)');
    }
  } catch (error) {
    console.log('  ❌ Not configured:', error.message);
  }

  // Gemini AI API
  console.log('\n🤖 Gemini AI API:');
  try {
    const key = getGeminiKey();
    if (key && key.startsWith('AIza')) {
      console.log('  ✅ Configured (key starts with AIza...)');
      console.log(`  📝 Key preview: ${key.substring(0, 10)}...${key.substring(key.length - 4)}`);
    } else {
      console.log('  ❌ Invalid format (should start with AIza)');
    }
  } catch (error) {
    console.log('  ❌ Not configured:', error.message);
  }

  console.log('\n📊 Summary:');
  console.log(`  Google Maps: ${status.googleMaps ? '✅' : '❌'}`);
  console.log(`  Gemini AI: ${status.gemini ? '✅' : '❌'}`);

  console.groupEnd();

  return status;
};

/**
 * Test Google Maps API with a simple geocoding request
 */
export const testGoogleMapsApi = async () => {
  console.group('🧪 Testing Google Maps API');

  try {
    const key = getGoogleMapsKey();
    const testAddress = 'New York, NY';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress)}&key=${key}`;

    console.log('Testing with address:', testAddress);
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      console.log('✅ API is working!');
      console.log('📍 Test result:', data.results[0].formatted_address);
      console.log('🗺️  Coordinates:', data.results[0].geometry.location);
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('❌ API request denied:', data.error_message);
      console.log('💡 Check if the following APIs are enabled in Google Cloud Console:');
      console.log('   - Maps JavaScript API');
      console.log('   - Geocoding API');
      console.log('   - Places API');
    } else {
      console.error('❌ API error:', data.status, data.error_message);
    }

    console.groupEnd();
    return data.status === 'OK';
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.groupEnd();
    return false;
  }
};

/**
 * Initialize validation on app start (development only)
 */
export const initializeApiValidation = () => {
  if (import.meta.env.DEV) {
    console.log('🚀 NetConnect AI - Development Mode');
    validateApiKeys();

    // Optionally test the API (commented out to avoid unnecessary requests)
    // setTimeout(() => testGoogleMapsApi(), 1000);
  }
};
