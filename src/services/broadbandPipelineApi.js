/**
 * Broadband Pipeline API Client
 * Connects the frontend to the backend geocoding pipeline
 * (Address → Census Block → PostgreSQL FCC data)
 */

const API_BASE = '/api/broadband';

/**
 * Lookup broadband availability by address (full pipeline)
 * @param {string} address - Full address string
 * @returns {Promise<object>} Pipeline result with providers
 */
export const lookupByAddress = async (address) => {
  const url = `${API_BASE}/lookup?address=${encodeURIComponent(address)}`;
  console.log('[Pipeline API] Lookup by address:', address);

  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Pipeline API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Lookup broadband availability by coordinates (skips Google geocoding)
 * Used when the frontend already has lat/lon from its own geocoding.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<object>} Pipeline result with providers
 */
export const lookupByCoordinates = async (lat, lon) => {
  const url = `${API_BASE}/by-coordinates?lat=${lat}&lon=${lon}`;
  console.log('[Pipeline API] Lookup by coordinates:', lat, lon);

  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Pipeline API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Get list of covered states
 * @returns {Promise<object>} Coverage info
 */
export const getCoverage = async () => {
  const response = await fetch(`${API_BASE}/coverage`);
  if (!response.ok) throw new Error('Failed to fetch coverage info');
  return response.json();
};

/**
 * Check backend health
 * @returns {Promise<boolean>} True if backend is healthy
 */
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
};

/**
 * Transform pipeline API response to the plan format expected by OfferingsPage.
 * Converts FCC database provider data into the same shape used by existing mock providers.
 * @param {object} pipelineResult - Response from lookupByAddress or lookupByCoordinates
 * @returns {object[]} Array of plan objects matching existing format
 */
export const transformPipelineToPlans = (pipelineResult) => {
  if (!pipelineResult.covered || !pipelineResult.providers) {
    return [];
  }

  const colorMap = {
    'AT&T Inc.': 'blue',
    'Comcast Corporation': 'purple',
    'Charter Communications': 'blue',
    'Verizon Communications': 'red',
    'T-Mobile': 'purple',
    'Lumen Technologies': 'orange',
    'Frontier Communications': 'green',
    'Cox Communications': 'orange',
    'Altice USA': 'red',
    'Windstream': 'green',
  };

  const techIcons = {
    'Fiber to the Premises (FTTP)': 'fiber',
    'Cable': 'cable',
    'Copper Wire (DSL)': 'dsl',
  };

  const plans = [];
  let idCounter = 0;

  for (const provider of pipelineResult.providers) {
    for (const service of provider.services) {
      idCounter++;
      const techLabel = service.technology || 'Broadband';
      const download = service.maxDownloadMbps;
      const upload = service.maxUploadMbps;

      // Determine a display-friendly speed string
      const speedStr = download >= 1000
        ? `${(download / 1000).toFixed(download % 1000 === 0 ? 0 : 1)} Gbps`
        : `${download} Mbps`;
      const uploadStr = upload >= 1000
        ? `${(upload / 1000).toFixed(upload % 1000 === 0 ? 0 : 1)} Gbps`
        : `${upload} Mbps`;

      // Estimate a price tier based on speed (FCC data doesn't include price)
      const estimatedPrice = download >= 1000 ? '80-120'
        : download >= 500 ? '60-80'
        : download >= 300 ? '50-70'
        : download >= 100 ? '40-60'
        : download >= 50 ? '30-50'
        : '25-40';

      // Features based on technology and speed
      const features = [];
      if (techLabel.includes('Fiber')) features.push('Fiber optic connection');
      if (techLabel.includes('Cable')) features.push('Cable broadband');
      if (techLabel.includes('DSL') || techLabel.includes('Copper')) features.push('DSL connection');
      if (service.lowLatency) features.push('Low latency');
      if (download >= 100) features.push(`Up to ${speedStr} download`);
      if (upload >= 100) features.push(`Up to ${uploadStr} upload`);
      if (download >= 500) features.push('Great for streaming & gaming');
      if (download >= 1000) features.push('Gigabit+ speeds');

      // Assign a color
      const color = colorMap[provider.name] || ['blue', 'green', 'purple', 'orange', 'red'][idCounter % 5];

      plans.push({
        id: `fcc-db-${idCounter}`,
        name: `${provider.name} - ${techLabel}`,
        type: 'Internet',
        speed: speedStr,
        uploadSpeed: uploadStr,
        price: `$${estimatedPrice}/mo (est.)`,
        rating: 4.0, // Default; will be enriched by reviews
        features,
        availability: 'Available',
        color,
        provider: provider.name,
        source: `FCC BDC Data (${pipelineResult.dataAsOf})`,
        technologyCode: service.technologyCode,
        maxDownloadMbps: download,
        maxUploadMbps: upload,
        lowLatency: service.lowLatency,
        censusBlock: pipelineResult.censusBlock,
      });
    }
  }

  // Sort by download speed descending
  plans.sort((a, b) => b.maxDownloadMbps - a.maxDownloadMbps);

  return plans;
};
