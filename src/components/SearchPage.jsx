import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, MapPin, Wifi } from 'lucide-react'
import { geocodeAddress, geocodeByPlaceId } from '../services/googleMapsGeocoding'
import { getGoogleMapsKey } from '../utils/env'

const SearchPage = ({ onAddressSubmit, userAddress }) => {
  const [address, setAddress] = useState(userAddress || '')
  const [zipCode, setZipCode] = useState('')
  const [useZipOnly, setUseZipOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [autocomplete, setAutocomplete] = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  // Initialize Google Places Autocomplete
  useEffect(() => {
    // Skip autocomplete initialization if using ZIP only
    if (useZipOnly) return;

    let isMounted = true;

    const initializeAutocomplete = () => {
      if (!isMounted) return;

      if (!inputRef.current) {
        console.warn('Input ref not available for autocomplete');
        return;
      }

      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error('Google Maps Places library not loaded');
        return;
      }

      try {
        console.log('Initializing Google Places Autocomplete...');

        const autocompleteInstance = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'geometry', 'address_components', 'place_id']
          }
        );

        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();

          if (place.formatted_address && place.geometry) {
            setAddress(place.formatted_address);
            setSelectedPlace(place);
            setError('');
            console.log('✓ Address selected from autocomplete:', place.formatted_address);
          } else {
            console.warn('Incomplete place data from autocomplete');
          }
        });

        if (isMounted) {
          setAutocomplete(autocompleteInstance);
          console.log('✓ Google Places Autocomplete initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize autocomplete:', error);
        console.info('Autocomplete unavailable. You can still type addresses manually or use ZIP code.');
      }
    };

    // Load Google Maps script if not already loaded
    const loadGoogleMapsScript = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('✓ Google Maps already loaded, initializing autocomplete...');
        initializeAutocomplete();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script already in DOM, waiting for load...');
        // Wait for it to load
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        const checkGoogleMaps = setInterval(() => {
          attempts++;
          if (window.google && window.google.maps && window.google.maps.places) {
            clearInterval(checkGoogleMaps);
            console.log('✓ Google Maps loaded successfully');
            initializeAutocomplete();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkGoogleMaps);
            console.error('❌ Google Maps failed to load after 5 seconds');
          }
        }, 100);
        return;
      }

      // Load the script
      try {
        const apiKey = getGoogleMapsKey();
        console.log('📡 Loading Google Maps script with API key...');

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          console.log('✓ Google Maps script loaded');
          // Small delay to ensure places library is ready
          setTimeout(() => {
            if (window.google && window.google.maps && window.google.maps.places) {
              initializeAutocomplete();
            } else {
              console.error('❌ Google Maps Places library not available after load');
            }
          }, 100);
        };

        script.onerror = (error) => {
          console.error('❌ Failed to load Google Maps script:', error);
          console.warn('⚠️  Autocomplete will be disabled. You can still use ZIP code input.');
        };

        document.head.appendChild(script);
      } catch (error) {
        console.warn('⚠️  Google Maps API key not configured:', error.message);
        console.info('💡 Autocomplete disabled. Use ZIP code input for location search.');
      }
    };

    loadGoogleMapsScript();

    // Cleanup
    return () => {
      isMounted = false;
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [useZipOnly])

  // Add custom styling for Google autocomplete dropdown
  useEffect(() => {
    // Add custom CSS for Google Places Autocomplete dropdown
    const styleId = 'google-autocomplete-custom-style'

    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .pac-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          margin-top: 4px;
          font-family: inherit;
          z-index: 9999 !important;
        }
        .pac-item {
          padding: 12px 16px;
          border-top: 1px solid #f3f4f6;
          cursor: pointer;
          font-size: 14px;
          line-height: 1.5;
        }
        .pac-item:first-child {
          border-top: none;
        }
        .pac-item:hover {
          background-color: #f9fafb;
        }
        .pac-item-selected,
        .pac-item-selected:hover {
          background-color: #eff6ff;
        }
        .pac-icon {
          margin-right: 12px;
        }
        .pac-item-query {
          color: #1f2937;
          font-size: 14px;
          font-weight: 500;
        }
        .pac-matched {
          font-weight: 600;
          color: #2563eb;
        }

        /* Dark mode support */
        .dark .pac-container {
          background-color: #1f2937;
          border-color: #374151;
        }
        .dark .pac-item {
          border-top-color: #374151;
          color: #e5e7eb;
        }
        .dark .pac-item:hover {
          background-color: #374151;
        }
        .dark .pac-item-selected,
        .dark .pac-item-selected:hover {
          background-color: #1e3a8a;
        }
        .dark .pac-item-query {
          color: #f3f4f6;
        }
        .dark .pac-matched {
          color: #60a5fa;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  const validateAddress = (addr) => {
    // Basic address validation
    if (!addr.trim()) {
      return 'Please enter an address'
    }
    if (addr.trim().length < 5) {
      return 'Please enter a complete address'
    }
    // Check for basic address components (numbers, letters, common words)
    const addressPattern = /^[a-zA-Z0-9\s,.-]+$/
    if (!addressPattern.test(addr)) {
      return 'Please enter a valid address'
    }
    return null
  }

  const validateZipCode = (zip) => {
    if (!zip.trim()) {
      return 'Please enter a ZIP code'
    }
    // US ZIP code format: 5 digits or 5+4 digits
    const zipPattern = /^\d{5}(-\d{4})?$/
    if (!zipPattern.test(zip.trim())) {
      return 'Please enter a valid US ZIP code (e.g., 94043 or 94043-1234)'
    }
    return null
  }

  // Geocode by ZIP code
  const geocodeByZip = async (zip) => {
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`)
      if (!response.ok) throw new Error('Invalid ZIP code')

      const data = await response.json()
      const place = data.places[0]

      return {
        coordinates: [parseFloat(place.latitude), parseFloat(place.longitude)],
        formattedAddress: `${place['place name']}, ${place['state abbreviation']} ${zip}`,
        placeContext: {
          city: place['place name'],
          state: place['state abbreviation'],
          zip: zip,
          country: 'United States'
        },
        source: 'zippopotamus',
        zipCode: zip,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('ZIP geocoding error:', error)
      throw new Error('Unable to find location for this ZIP code')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    setIsLoading(true)

    try {
      let geocodeResult
      let finalAddress

      // If using ZIP code only
      if (useZipOnly) {
        const zipError = validateZipCode(zipCode)
        if (zipError) {
          setError(zipError)
          setIsLoading(false)
          return
        }

        console.log('Geocoding by ZIP code:', zipCode)
        geocodeResult = await geocodeByZip(zipCode)
        finalAddress = geocodeResult.formattedAddress
      } else {
        // Using full address
        const addressError = validateAddress(address)
        if (addressError) {
          setError(addressError)
          setIsLoading(false)
          return
        }

        // If user selected from autocomplete, use that place data
        if (selectedPlace && selectedPlace.geometry) {
          console.log('Using autocomplete selected place')
          geocodeResult = {
            coordinates: [
              selectedPlace.geometry.location.lat(),
              selectedPlace.geometry.location.lng()
            ],
            formattedAddress: selectedPlace.formatted_address,
            placeId: selectedPlace.place_id,
            source: 'google-maps-autocomplete',
            timestamp: new Date().toISOString()
          }
        } else {
          // Otherwise, geocode the typed address
          console.log('Geocoding typed address')
          geocodeResult = await geocodeAddress(address)
        }
        finalAddress = address
      }

      console.log('Geocode result:', geocodeResult)

      // Pass both address and geocode result to parent
      onAddressSubmit(finalAddress, geocodeResult)

      navigate('/offerings')
    } catch (error) {
      console.error('Geocoding failed:', error)
      setError(error.message || 'Unable to validate location. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <Wifi className="h-12 w-12 text-blue-600 dark:text-blue-400 mr-3" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Net Connect AI
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover the best telecom offerings available in your area. Enter your address to find internet, mobile, and cable services tailored to your location.
        </p>
        <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Multiple Providers</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Real-time Data</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>AI-Powered</span>
          </div>
        </div>
      </div>

      {/* Search Card */}
      <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Toggle between Address and ZIP */}
            <div className="flex items-center justify-center space-x-2 mb-4">
              <button
                type="button"
                onClick={() => setUseZipOnly(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !useZipOnly
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Full Address
              </button>
              <button
                type="button"
                onClick={() => setUseZipOnly(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  useZipOnly
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                ZIP Code Only
              </button>
            </div>

            {/* Conditional Input */}
            {useZipOnly ? (
              /* ZIP Code Input */
              <div className="space-y-2">
                <label htmlFor="zipcode" className="text-sm font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                  Enter Your ZIP Code
                </label>
                <div className="relative">
                  <Input
                    id="zipcode"
                    type="text"
                    placeholder="94043 or 94043-1234"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="pl-12 h-14 text-lg border-2 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                    disabled={isLoading}
                    maxLength={10}
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Simpler and more reliable - just enter your 5-digit ZIP code
                </p>
              </div>
            ) : (
              /* Full Address Input */
              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                  Enter Your Address
                </label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="address"
                    type="text"
                    placeholder="Start typing your address..."
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value)
                      setSelectedPlace(null)
                    }}
                    className="pl-12 h-14 text-lg border-2 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {autocomplete ? '✓ Autocomplete enabled' : 'Type your full address'}
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 flex items-center">
                <span className="mr-1">⚠️</span>
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-300 transform hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Validating address...
                </div>
              ) : (
                <div className="flex items-center">
                  <Search className="h-5 w-5 mr-3" />
                  Find Telecom Offerings
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
        <div className="text-center p-6 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wifi className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold mb-2">Internet Plans</h3>
          <p className="text-sm text-muted-foreground">High-speed broadband and fiber options</p>
        </div>
        
        <div className="text-center p-6 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 dark:text-green-400 font-bold">📱</span>
          </div>
          <h3 className="font-semibold mb-2">Mobile Services</h3>
          <p className="text-sm text-muted-foreground">Cell phone plans and data packages</p>
        </div>
        
        <div className="text-center p-6 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-purple-600 dark:text-purple-400 font-bold">📺</span>
          </div>
          <h3 className="font-semibold mb-2">TV & Cable</h3>
          <p className="text-sm text-muted-foreground">Cable TV and streaming services</p>
        </div>
      </div>
    </div>
  )
}

export default SearchPage
