/**
 * Multi-Provider API Service
 * Aggregates offerings from multiple ISP providers
 * Strategy priority: FCC DB Pipeline → ZIP-based → FCC API → Individual providers
 */

import { fetchProviderPlans as fetchATT } from './providers/attProvider';
import { fetchProviderPlans as fetchVerizon } from './providers/verizonProvider';
import { fetchProviderPlans as fetchXfinity } from './providers/xfinityProvider';
import { fetchProviderPlans as fetchTMobile } from './providers/tmobileProvider';
import { fetchProviderPlans as fetchSpectrum } from './providers/spectrumProvider';
import { fetchFCCProviders, fetchProvidersByZip } from './fccBroadbandApi';
import { lookupByCoordinates, transformPipelineToPlans } from './broadbandPipelineApi';
import { offeringsCache } from '../utils/cache';

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

  // Check offerings cache first (keyed on coordinates)
  if (coordinates && coordinates.length === 2) {
    const cacheKey = `${coordinates[0].toFixed(4)},${coordinates[1].toFixed(4)}`;
    try {
      const cached = await offeringsCache.get(cacheKey);
      if (cached) {
        console.log('✓ Returning cached offerings result');
        return cached;
      }
    } catch (e) {
      console.warn('Offerings cache check failed:', e.message);
    }
  }

  const startTime = Date.now();
  let allPlans = [];
  let dataSource = 'mock';
  let pipelineMetadata = null;

  // Strategy 0 (PRIMARY): FCC BDC Database Pipeline via backend
  // Uses: coordinates → Census Block FIPS → PostgreSQL query
  if (coordinates && coordinates.length === 2) {
    console.log('Trying FCC BDC Database Pipeline (primary strategy)...');

    try {
      const pipelineResult = await lookupByCoordinates(coordinates[0], coordinates[1]);

      if (pipelineResult.covered && pipelineResult.providers && pipelineResult.providers.length > 0) {
        allPlans = transformPipelineToPlans(pipelineResult);
        dataSource = 'fcc-bdc-database';
        pipelineMetadata = {
          censusBlock: pipelineResult.censusBlock,
          state: pipelineResult.state,
          stateName: pipelineResult.stateName,
          county: pipelineResult.county,
          covered: pipelineResult.covered,
          dataAsOf: pipelineResult.dataAsOf,
          pipelineTimeMs: pipelineResult.pipelineTimeMs,
          summary: pipelineResult.summary,
          totalProviders: pipelineResult.totalProviders,
          totalServices: pipelineResult.totalServices,
        };
        console.log(`✓ Found ${allPlans.length} plans via FCC BDC Database (${pipelineResult.totalProviders} providers, ${pipelineResult.pipelineTimeMs}ms)`);
      } else if (!pipelineResult.covered) {
        pipelineMetadata = {
          covered: false,
          message: pipelineResult.message,
          state: pipelineResult.state,
        };
        console.log(`Pipeline: State not covered (${pipelineResult.state}). Falling back to other strategies.`);
      }
    } catch (error) {
      console.warn('FCC BDC Pipeline unavailable:', error.message);
      console.log('Backend may not be running. Falling back to other strategies.');
    }
  }

  // Strategy 1: Try ZIP-based lookup if available
  if (allPlans.length === 0 && (geocodeData?.zipCode || geocodeData?.placeContext?.zip)) {
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

  const result = {
    plans: allPlans,
    totalPlans: allPlans.length,
    providersChecked: 5,
    providersWithData: new Set(allPlans.map(p => p.provider)).size,
    dataSource: dataSource,
    pipelineMetadata: pipelineMetadata,
    timestamp: new Date().toISOString(),
    fetchTime: endTime - startTime
  };

  // Cache the result (fire-and-forget)
  if (coordinates && coordinates.length === 2) {
    const cacheKey = `${coordinates[0].toFixed(4)},${coordinates[1].toFixed(4)}`;
    offeringsCache.set(cacheKey, result).catch(() => {});
  }

  return result;
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
