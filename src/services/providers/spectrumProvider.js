/**
 * Spectrum Provider Service
 * Currently returns mock data - can be enhanced with real API integration
 */

/**
 * Fetch Spectrum plans for a given address
 * @param {string} address - User address
 * @param {Array} coordinates - [latitude, longitude]
 * @returns {Promise<object>} Provider data with plans
 */
export const fetchProviderPlans = async (address, coordinates) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 550));

  const mockPlans = [
    {
      id: 'spectrum-1',
      name: 'Spectrum Internet Gig',
      provider: 'Spectrum',
      type: 'Internet',
      speed: '1000 Mbps',
      uploadSpeed: '35 Mbps',
      price: '89.99',
      rating: 4.1,
      features: ['Cable Internet', 'No Data Caps', 'Free Modem', 'No Contracts'],
      availability: 'Available',
      color: 'blue',
      source: 'Mock Data'
    },
    {
      id: 'spectrum-2',
      name: 'Spectrum Internet Ultra',
      provider: 'Spectrum',
      type: 'Internet',
      speed: '500 Mbps',
      uploadSpeed: '20 Mbps',
      price: '69.99',
      rating: 4.0,
      features: ['High-Speed Cable', 'Unlimited Data', 'Free Security Suite'],
      availability: 'Available',
      color: 'blue',
      source: 'Mock Data'
    },
    {
      id: 'spectrum-3',
      name: 'Spectrum Internet',
      provider: 'Spectrum',
      type: 'Internet',
      speed: '300 Mbps',
      uploadSpeed: '10 Mbps',
      price: '49.99',
      rating: 3.9,
      features: ['Reliable Connection', 'Free Modem Included', 'Spectrum TV App Access'],
      availability: 'Available',
      color: 'blue',
      source: 'Mock Data'
    }
  ];

  return {
    provider: 'Spectrum',
    plans: mockPlans,
    source: 'mock',
    error: null,
    timestamp: new Date().toISOString()
  };
};
