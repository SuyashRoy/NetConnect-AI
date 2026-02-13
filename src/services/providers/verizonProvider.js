/**
 * Verizon Provider Service
 * Currently returns mock data - can be enhanced with real API integration
 */

/**
 * Fetch Verizon plans for a given address
 * @param {string} address - User address
 * @param {Array} coordinates - [latitude, longitude]
 * @returns {Promise<object>} Provider data with plans
 */
export const fetchProviderPlans = async (address, coordinates) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const mockPlans = [
    {
      id: 'verizon-fios-1',
      name: 'Verizon Fios Gigabit Connection',
      provider: 'Verizon',
      type: 'Internet',
      speed: '940 Mbps',
      uploadSpeed: '880 Mbps',
      price: '79.99',
      rating: 4.6,
      features: ['Fiber-optic Network', 'No Data Caps', 'Free Router for 1 Year', 'No Annual Contract'],
      availability: 'Available',
      color: 'red',
      source: 'Mock Data'
    },
    {
      id: 'verizon-fios-2',
      name: 'Verizon Fios 500 Mbps',
      provider: 'Verizon',
      type: 'Internet',
      speed: '500 Mbps',
      uploadSpeed: '500 Mbps',
      price: '64.99',
      rating: 4.5,
      features: ['Fiber-optic', 'Unlimited Data', 'Free Router', 'WiFi 6 Compatible'],
      availability: 'Available',
      color: 'red',
      source: 'Mock Data'
    },
    {
      id: 'verizon-fios-3',
      name: 'Verizon Fios 300 Mbps',
      provider: 'Verizon',
      type: 'Internet',
      speed: '300 Mbps',
      uploadSpeed: '300 Mbps',
      price: '49.99',
      rating: 4.4,
      features: ['Fiber Connection', 'No Data Limits', 'Free Installation'],
      availability: 'Available',
      color: 'red',
      source: 'Mock Data'
    }
  ];

  return {
    provider: 'Verizon',
    plans: mockPlans,
    source: 'mock',
    error: null,
    timestamp: new Date().toISOString()
  };
};
