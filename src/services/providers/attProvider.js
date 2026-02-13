/**
 * AT&T Provider Service
 * Wrapper for existing AT&T API integration
 */

import { fetchATTPlans } from '../attApi';

/**
 * Fetch AT&T plans for a given address
 * @param {string} address - User address
 * @param {Array} coordinates - [latitude, longitude]
 * @returns {Promise<object>} Provider data with plans
 */
export const fetchProviderPlans = async (address, coordinates) => {
  try {
    const plans = await fetchATTPlans(address);

    return {
      provider: 'AT&T',
      plans: plans || [],
      source: 'api',
      error: null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('AT&T provider error:', error);

    return {
      provider: 'AT&T',
      plans: [],
      source: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};
