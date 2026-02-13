/**
 * Multi-Provider API Service
 * Aggregates offerings from multiple ISP providers
 */

import { fetchProviderPlans as fetchATT } from './providers/attProvider';
import { fetchProviderPlans as fetchVerizon } from './providers/verizonProvider';
import { fetchProviderPlans as fetchXfinity } from './providers/xfinityProvider';
import { fetchProviderPlans as fetchTMobile } from './providers/tmobileProvider';
import { fetchProviderPlans as fetchSpectrum } from './providers/spectrumProvider';
import { fetchFCCProviders, fetchProvidersByZip } from './fccBroadbandApi';

/**
 * Fetch plans from all available providers
 * @param {string} address - User address
 * @param {Array} coordinates - [latitude, longitude]
 * @param {object} geocodeData - Geocode data with ZIP if available
 * @returns {Promise<object>} Aggregated provider data
 */
export const fetchAllProviders = async (address, coordinates, geocodeData) => {
  console.log('Fetching plans from all providers for:', address, coordinates);
  console.log('Geocode data:', geocodeData);

  const startTime = Date.now();
  let allPlans = [];
  let dataSource = 'mock';

  // Strategy 1: Try ZIP-based lookup if available (most reliable)
  if (geocodeData?.zipCode || geocodeData?.placeContext?.zip) {
    const zipCode = geocodeData.zipCode || geocodeData.placeContext.zip;
    console.log('Using ZIP-based provider lookup:', zipCode);

    try {
      const zipProviders = await fetchProvidersByZip(zipCode);
      if (zipProviders && zipProviders.length > 0) {
        allPlans = zipProviders;
        dataSource = 'zip-based';
        console.log(`✓ Found ${zipProviders.length} plans via ZIP code`);
      }
    } catch (error) {
      console.error('ZIP-based lookup failed:', error);
    }
  }

  // Strategy 2: Try FCC API if we have coordinates (government data)
  if (allPlans.length === 0 && coordinates) {
    console.log('Trying FCC Broadband Map API...');

    try {
      const fccProviders = await fetchFCCProviders(coordinates, address);
      if (fccProviders && fccProviders.length > 0) {
        allPlans = fccProviders;
        dataSource = 'fcc-api';
        console.log(`✓ Found ${fccProviders.length} plans via FCC API`);
      }
    } catch (error) {
      console.error('FCC API lookup failed:', error);
    }
  }

  // Strategy 3: Fallback to individual provider APIs
  if (allPlans.length === 0) {
    console.log('Falling back to individual provider APIs...');

    const providerFunctions = [
      { name: 'AT&T', fetch: fetchATT },
      { name: 'Verizon', fetch: fetchVerizon },
      { name: 'Xfinity', fetch: fetchXfinity },
      { name: 'T-Mobile', fetch: fetchTMobile },
      { name: 'Spectrum', fetch: fetchSpectrum }
    ];

    // Fetch all providers in parallel
    const results = await Promise.allSettled(
      providerFunctions.map(({ fetch }) => fetch(address, coordinates))
    );

    // Process results
    const providerResults = results.map((result, index) => {
      const providerName = providerFunctions[index].name;

      if (result.status === 'fulfilled') {
        console.log(`${providerName}: ${result.value.plans.length} plans (${result.value.source})`);
        return result.value;
      } else {
        console.error(`${providerName}: Failed -`, result.reason);
        return {
          provider: providerName,
          plans: [],
          source: 'error',
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    // Aggregate all plans
    allPlans = providerResults
      .filter(r => r.plans && r.plans.length > 0)
      .flatMap(r => r.plans);

    dataSource = 'individual-apis';
  }

  const endTime = Date.now();

  console.log(`✓ Final result: ${allPlans.length} plans from ${dataSource} in ${endTime - startTime}ms`);

  return {
    plans: allPlans,
    totalPlans: allPlans.length,
    providersChecked: 5,
    providersWithData: new Set(allPlans.map(p => p.provider)).size,
    dataSource: dataSource,
    timestamp: new Date().toISOString(),
    fetchTime: endTime - startTime
  };
};

/**
 * Fetch plans from a specific provider
 * @param {string} providerName - Provider name ('AT&T', 'Verizon', etc.)
 * @param {string} address - User address
 * @param {Array} coordinates - [latitude, longitude]
 * @returns {Promise<object>} Provider data
 */
export const fetchSingleProvider = async (providerName, address, coordinates) => {
  const providerMap = {
    'AT&T': fetchATT,
    'Verizon': fetchVerizon,
    'Xfinity': fetchXfinity,
    'T-Mobile': fetchTMobile,
    'Spectrum': fetchSpectrum
  };

  const fetchFunction = providerMap[providerName];

  if (!fetchFunction) {
    throw new Error(`Provider ${providerName} not found`);
  }

  return await fetchFunction(address, coordinates);
};

/**
 * Get list of available providers
 * @returns {Array<string>} List of provider names
 */
export const getAvailableProviders = () => {
  return ['AT&T', 'Verizon', 'Xfinity', 'T-Mobile', 'Spectrum'];
};
