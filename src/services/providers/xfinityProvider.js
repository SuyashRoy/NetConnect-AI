/**
 * Xfinity (Comcast) Provider Service
 * Currently returns mock data - can be enhanced with real API integration
 */

/**
 * Fetch Xfinity plans for a given address
 * @param {string} address - User address
 * @param {Array} coordinates - [latitude, longitude]
 * @returns {Promise<object>} Provider data with plans
 */
export const fetchProviderPlans = async (address, coordinates) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const mockPlans = [
    {
      id: 'xfinity-1',
      name: 'Xfinity Gigabit',
      provider: 'Xfinity',
      type: 'Internet',
      speed: '1000 Mbps',
      uploadSpeed: '35 Mbps',
      price: '80.00',
      rating: 4.2,
      features: ['Cable Internet', 'xFi Gateway Included', 'Unlimited Data Option', '24/7 Support'],
      availability: 'Available',
      color: 'purple',
      source: 'Mock Data'
    },
    {
      id: 'xfinity-2',
      name: 'Xfinity Superfast',
      provider: 'Xfinity',
      type: 'Internet',
      speed: '800 Mbps',
      uploadSpeed: '20 Mbps',
      price: '70.00',
      rating: 4.1,
      features: ['High-Speed Cable', 'WiFi Equipment', 'Flex 4K Streaming'],
      availability: 'Available',
      color: 'purple',
      source: 'Mock Data'
    },
    {
      id: 'xfinity-3',
      name: 'Xfinity Fast',
      provider: 'Xfinity',
      type: 'Internet',
      speed: '400 Mbps',
      uploadSpeed: '10 Mbps',
      price: '55.00',
      rating: 4.0,
      features: ['Reliable Cable Internet', 'xFi App Control', 'Advanced Security'],
      availability: 'Available',
      color: 'purple',
      source: 'Mock Data'
    }
  ];

  return {
    provider: 'Xfinity',
    plans: mockPlans,
    source: 'mock',
    error: null,
    timestamp: new Date().toISOString()
  };
};
