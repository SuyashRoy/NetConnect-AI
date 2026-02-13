import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Wifi, Smartphone, Tv, Star, MapPin, DollarSign, Zap, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchAllProviders } from '../services/multiProviderApi'
import { fetchMultipleProviderReviews } from '../services/googlePlacesReviews'
import { geocodeAddress } from '../services/googleMapsGeocoding'
import ReviewsSection from './ReviewsSection'
import ChatbotWidget from './ChatbotWidget'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const OfferingsPage = ({ userAddress, geocodeData }) => {
  const navigate = useNavigate()
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]) // Default to NYC
  const [isLoading, setIsLoading] = useState(true)
  const [offerings, setOfferings] = useState([])
  const [providerStats, setProviderStats] = useState(null)
  const [providerReviews, setProviderReviews] = useState({})
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6 // Show 6 offerings per page

  // Fetch offerings from all providers
  const loadOfferings = async (address, coordinates, geoData) => {
    try {
      // Fetch from all providers, passing geocode data for ZIP-based lookup
      const providersData = await fetchAllProviders(address, coordinates, geoData);

      // Store provider statistics
      setProviderStats({
        totalPlans: providersData.totalPlans,
        providersChecked: providersData.providersChecked,
        providersWithData: providersData.providersWithData,
        fetchTime: providersData.fetchTime
      });

      // Convert plans to component format
      const formattedOfferings = providersData.plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        icon: Wifi,
        speed: plan.speed,
        uploadSpeed: plan.uploadSpeed,
        price: typeof plan.price === 'string' ? plan.price.replace('$', '').replace('/month', '') : plan.price,
        rating: plan.rating,
        features: plan.features,
        availability: plan.availability,
        color: plan.color,
        provider: plan.provider,
        source: plan.source
      }));

      return formattedOfferings;

    } catch (error) {
      console.error('Error loading offerings:', error);

      // Fallback to basic mock data
      return [
        {
          id: 'fallback-1',
          name: 'Service Check Required',
          type: 'Internet',
          icon: Wifi,
          speed: 'Contact Provider',
          uploadSpeed: 'N/A',
          price: 'Contact for pricing',
          rating: 4.0,
          features: ['Contact providers directly for availability'],
          availability: 'Check Availability',
          color: 'gray',
          provider: 'Multiple Providers',
          error: 'Unable to load real-time data'
        }
      ];
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      try {
        // Use geocodeData from props if available, otherwise geocode the address
        let coords;
        let geoData = geocodeData;

        if (geocodeData && geocodeData.coordinates) {
          coords = geocodeData.coordinates;
          console.log('Using geocoded coordinates from SearchPage:', coords);
          console.log('Geocode data:', geocodeData);
        } else {
          // Fallback: geocode the address directly
          const geocodeResult = await geocodeAddress(userAddress);
          coords = geocodeResult.coordinates;
          geoData = geocodeResult;
          console.log('Geocoding address in OfferingsPage:', coords);
        }

        setMapCenter(coords);

        // Load offerings from all providers with geocode data
        const allOfferings = await loadOfferings(userAddress, coords, geoData);
        setOfferings(allOfferings);

      } catch (error) {
        console.error('Error loading data:', error);
        // Set fallback offerings on error
        setOfferings([{
          id: 'error-fallback',
          name: 'Service Check Required',
          type: 'Internet',
          icon: Wifi,
          speed: 'Contact Provider',
          uploadSpeed: 'N/A',
          price: 'Contact for pricing',
          rating: 4.0,
          features: ['Contact providers directly for availability'],
          availability: 'Check Availability',
          color: 'gray',
          provider: 'Multiple Providers',
          error: 'Unable to load real-time data'
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userAddress, geocodeData]);

  // Fetch reviews for all providers after offerings are loaded
  useEffect(() => {
    if (offerings.length > 0 && mapCenter && offerings.length > 0) {
      fetchReviewsForAllProviders();
    }
  }, [offerings, mapCenter]);

  const fetchReviewsForAllProviders = async () => {
    setReviewsLoading(true);

    try {
      // Get unique provider names
      const uniqueProviders = [...new Set(offerings.map(o => o.provider).filter(Boolean))];
      console.log('Fetching reviews for providers:', uniqueProviders);

      // Fetch reviews for all providers in parallel
      const reviewsMap = await fetchMultipleProviderReviews(uniqueProviders, mapCenter);
      setProviderReviews(reviewsMap);

      console.log('Reviews loaded for', Object.keys(reviewsMap).length, 'providers');

    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  }

  const getColorClasses = (color) => {
    const colors = {
      blue: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
      green: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
      purple: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950',
      orange: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950',
      red: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
    }
    return colors[color] || colors.blue
  }

  // Pagination calculations
  const totalPages = Math.ceil(offerings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOfferings = offerings.slice(startIndex, endIndex)

  // Reset to page 1 when offerings change
  useEffect(() => {
    setCurrentPage(1)
  }, [offerings])

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber)
    // Scroll to top of offerings section
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1)
    }
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show smart pagination with ellipsis
      if (currentPage <= 3) {
        // Near the beginning
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        // In the middle
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }

    return pages
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Fetching real-time AT&T data and telecom offerings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Telecom Offerings</h1>
                <p className="text-sm text-muted-foreground flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {userAddress}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Map Section */}
          <div className="order-2 lg:order-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Your Location
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-80px)]">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  className="rounded-b-lg"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={mapCenter}>
                    <Popup>
                      <div className="text-center">
                        <p className="font-semibold">Your Location</p>
                        <p className="text-sm text-gray-600">{userAddress}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </CardContent>
            </Card>
          </div>

          {/* Offerings Section */}
          <div className="order-1 lg:order-2">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Available Services</h2>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {offerings.length} total
                  </Badge>
                  <Badge variant="outline">
                    Page {currentPage} of {totalPages}
                  </Badge>
                </div>
              </div>

              {/* Offerings Grid */}
              <div className="grid grid-cols-1 gap-4 flex-1">
              {currentOfferings.map((offering) => {
                const IconComponent = offering.icon
                return (
                  <Card key={offering.id} className={`transition-all duration-300 hover:shadow-lg ${getColorClasses(offering.color)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-${offering.color}-100 dark:bg-${offering.color}-900`}>
                            <IconComponent className={`h-6 w-6 text-${offering.color}-600 dark:text-${offering.color}-400`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{offering.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {offering.provider ? `${offering.provider} • ${offering.type}` : offering.type}
                            </p>
                            {offering.source && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                {offering.source}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge 
                            variant={offering.availability === 'Available' ? 'default' : 'secondary'}
                          >
                            {offering.availability}
                          </Badge>
                          {offering.error && (
                            <div className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              API Limited
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">↓ {offering.speed}</span>
                          </div>
                          {offering.uploadSpeed && (
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">↑ {offering.uploadSpeed}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {offering.price.includes('$') ? offering.price : `$${offering.price}/month`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mb-4">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(offering.rating)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {offering.rating} rating
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {offering.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Reviews Section */}
                      {offering.provider && (
                        <ReviewsSection
                          provider={offering.provider}
                          reviews={providerReviews[offering.provider]}
                          isLoading={reviewsLoading && !providerReviews[offering.provider]}
                        />
                      )}

                      <Button className="w-full mt-4" variant="default">
                        View Details & Order
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center space-x-2">
                  {/* Previous Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="h-9 w-9 p-0"
                        >
                          {page}
                        </Button>
                      )
                    ))}
                  </div>

                  {/* Next Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Chatbot Widget */}
      <ChatbotWidget
        offerings={offerings}
        reviews={providerReviews}
        userAddress={userAddress}
      />
    </div>
  )
}

export default OfferingsPage
