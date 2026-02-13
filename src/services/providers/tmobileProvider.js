/**
 * T-Mobile Home Internet Provider Service
 * Currently returns mock data - can be enhanced with real API integration
 */

/**
 * Fetch T-Mobile Home Internet plans for a given address
 * @param {string} address - User address
 * @param {Array} coordinates - [latitude, longitude]
 * @returns {Promise<object>} Provider data with plans
 */
export const fetchProviderPlans = async (address, coordinates) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 450));

  const mockPlans = [
    {
      id: 'tmobile-1',
      name: 'T-Mobile Home Internet',
      provider: 'T-Mobile',
      type: 'Internet',
      speed: '245 Mbps',
      uploadSpeed: '35 Mbps',
      price: '50.00',
      rating: 4.3,
      features: ['5G/4G LTE', 'No Data Caps', 'No Annual Contract', 'Price Lock Guarantee'],
      availability: 'Check Availability',
      color: 'pink',
      source: 'Mock Data'
    },
    {
      id: 'tmobile-2',
      name: 'T-Mobile 5G Home Internet Plus',
      provider: 'T-Mobile',
      type: 'Internet',
      speed: '421 Mbps',
      uploadSpeed: '55 Mbps',
      price: '60.00',
      rating: 4.4,
      features: ['5G Ultra Capacity', 'Unlimited Data', 'Wi-Fi 6 Gateway', 'No Equipment Fees'],
      availability: 'Check Availability',
      color: 'pink',
      source: 'Mock Data'
    }
  ];

  return {
    provider: 'T-Mobile',
    plans: mockPlans,
    source: 'mock',
    error: null,
    timestamp: new Date().toISOString()
  };
};
