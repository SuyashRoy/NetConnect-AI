/**
 * Test utility for AT&T API integration
 * This can be used to test the API integration in the browser console
 */

import { fetchATTOfferings, fetchATTPlans } from '../services/attApi';

// Test function to verify AT&T API integration
export const testATTAPI = async () => {
  console.log('🧪 Testing AT&T API Integration...');
  
  const testAddresses = [
    '123 Main Street, Los Angeles, CA 90210',
    '456 Oak Avenue, New York, NY 10001',
    '789 Pine Road, Houston, TX 77001'
  ];
  
  for (const address of testAddresses) {
    console.log(`\n📍 Testing address: ${address}`);
    
    try {
      const offerings = await fetchATTOfferings(address);
      console.log(`✅ Success! Found ${offerings.length} offerings:`, offerings);
      
      const plans = await fetchATTPlans(address);
      console.log(`✅ Plans fetched: ${plans.length} total plans`);
      
    } catch (error) {
      console.error(`❌ Error for ${address}:`, error);
    }
  }
  
  console.log('\n🏁 AT&T API test completed!');
};

// Export for use in browser console
window.testATTAPI = testATTAPI;

export default testATTAPI;
