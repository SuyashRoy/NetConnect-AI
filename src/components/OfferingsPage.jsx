import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Wifi, Smartphone, Tv, Star, MapPin, DollarSign, Zap, AlertCircle, ChevronLeft, ChevronRight, Info, Database, Clock, Shield, Activity } from 'lucide-react'
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
  const [pipelineMetadata, setPipelineMetadata] = useState(null)
  const [dataSource, setDataSource] = useState(null)

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

      // Store pipeline metadata and data source
      setPipelineMetadata(providersData.pipelineMetadata || null);
      setDataSource(providersData.dataSource || null);

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
        source: plan.source,
        technologyCode: plan.technologyCode,
        lowLatency: plan.lowLatency,
        maxDownloadMbps: plan.maxDownloadMbps,
        maxUploadMbps: plan.maxUploadMbps,
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
      blue: 'border-blue-200 bg-blue-50/60 dark:border-blue-800/50 dark:bg-blue-950/30',
      green: 'border-green-200 bg-green-50/60 dark:border-green-800/50 dark:bg-green-950/30',
      purple: 'border-purple-200 bg-purple-50/60 dark:border-purple-800/50 dark:bg-purple-950/30',
      orange: 'border-orange-200 bg-orange-50/60 dark:border-orange-800/50 dark:bg-orange-950/30',
      red: 'border-red-200 bg-red-50/60 dark:border-red-800/50 dark:bg-red-950/30'
    }
    return colors[color] || colors.blue
  }

  // Static icon container classes (dynamic Tailwind classes like bg-${color}-100 don't compile)
  const getIconBgClass = (color) => {
    const map = {
      blue: 'bg-blue-100 dark:bg-blue-900/50',
      green: 'bg-green-100 dark:bg-green-900/50',
      purple: 'bg-purple-100 dark:bg-purple-900/50',
      orange: 'bg-orange-100 dark:bg-orange-900/50',
      red: 'bg-red-100 dark:bg-red-900/50',
    }
    return map[color] || map.blue
  }

  const getIconColorClass = (color) => {
    const map = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      purple: 'text-purple-600 dark:text-purple-400',
      orange: 'text-orange-600 dark:text-orange-400',
      red: 'text-red-600 dark:text-red-400',
    }
    return map[color] || map.blue
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
          <p className="text-lg text-muted-foreground">Looking up broadband availability for your address...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
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

      {/* Data Source Banner */}
      {dataSource && (
        <div className={`border-b ${
          dataSource === 'fcc-bdc-database'
            ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            {dataSource === 'fcc-bdc-database' && pipelineMetadata ? (
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm text-emerald-800 dark:text-emerald-200">
                <div className="flex items-center font-medium">
                  <Database className="h-4 w-4 mr-1.5" />
                  FCC Broadband Data Collection
                </div>
                <span className="text-emerald-400">|</span>
                <span>{pipelineMetadata.stateName || pipelineMetadata.state}</span>
                {pipelineMetadata.county && (
                  <>
                    <span className="text-emerald-400">|</span>
                    <span>{pipelineMetadata.county}</span>
                  </>
                )}
                <span className="text-emerald-400">|</span>
                <span className="font-mono text-xs">Census Block: {pipelineMetadata.censusBlock}</span>
                {pipelineMetadata.dataAsOf && (
                  <>
                    <span className="text-emerald-400">|</span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Data as of {pipelineMetadata.dataAsOf}
                    </span>
                  </>
                )}
                {pipelineMetadata.pipelineTimeMs && (
                  <>
                    <span className="text-emerald-400">|</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs">{pipelineMetadata.pipelineTimeMs}ms</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center text-sm text-amber-800 dark:text-amber-200">
                <Info className="h-4 w-4 mr-1.5 flex-shrink-0" />
                {pipelineMetadata && pipelineMetadata.covered === false ? (
                  <span>
                    Your state ({pipelineMetadata.state}) is not yet in our FCC database. We currently cover CA, GA, IL, NY, TX. Showing results from alternative sources.
                  </span>
                ) : (
                  <span>
                    Results from {dataSource === 'zip-based' ? 'ZIP code lookup' : dataSource === 'fcc-api' ? 'FCC Broadband Map API' : 'provider APIs'}. FCC database unavailable for this location.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats Bar (FCC data only) */}
      {dataSource === 'fcc-bdc-database' && pipelineMetadata && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Providers</p>
                  <p className="font-semibold text-sm">{pipelineMetadata.totalProviders}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                <Wifi className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Services</p>
                  <p className="font-semibold text-sm">{pipelineMetadata.totalServices}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Max Download</p>
                  <p className="font-semibold text-sm">
                    {pipelineMetadata.summary?.maxDownloadAvailable >= 1000
                      ? `${(pipelineMetadata.summary.maxDownloadAvailable / 1000).toFixed(pipelineMetadata.summary.maxDownloadAvailable % 1000 === 0 ? 0 : 1)} Gbps`
                      : `${pipelineMetadata.summary?.maxDownloadAvailable || '—'} Mbps`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Technologies</p>
                  <div className="flex gap-1 mt-0.5">
                    {pipelineMetadata.summary?.hasFiber && (
                      <span className="text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">Fiber</span>
                    )}
                    {pipelineMetadata.summary?.hasCable && (
                      <span className="text-[10px] font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Cable</span>
                    )}
                    {pipelineMetadata.summary?.hasDsl && (
                      <span className="text-[10px] font-medium bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">DSL</span>
                    )}
                    {!pipelineMetadata.summary?.hasFiber && !pipelineMetadata.summary?.hasCable && !pipelineMetadata.summary?.hasDsl && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Map Section — compact strip */}
        <Card className="overflow-hidden border dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
            <h3 className="text-sm font-medium flex items-center text-foreground">
              <MapPin className="h-4 w-4 mr-1.5" />
              Your Location
            </h3>
          </div>
          <div className="h-[250px] lg:h-[280px]">
            <MapContainer
              center={mapCenter}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
          </div>
        </Card>

        {/* Offerings Section */}
        <div className="flex flex-col">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentOfferings.map((offering) => {
              const IconComponent = offering.icon
              return (
                <Card key={offering.id} className={`transition-all duration-300 hover:shadow-lg ${getColorClasses(offering.color)}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getIconBgClass(offering.color)}`}>
                          <IconComponent className={`h-6 w-6 ${getIconColorClass(offering.color)}`} />
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

                    {/* Technology & Low-Latency Badges */}
                    {(offering.technologyCode || offering.lowLatency) && (
                      <div className="flex items-center gap-2 mb-3">
                        {offering.technologyCode === 50 && (
                          <span className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">Fiber</span>
                        )}
                        {offering.technologyCode === 40 && (
                          <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Cable</span>
                        )}
                        {offering.technologyCode === 10 && (
                          <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">DSL</span>
                        )}
                        {offering.technologyCode && ![50, 40, 10].includes(offering.technologyCode) && (
                          <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">Tech {offering.technologyCode}</span>
                        )}
                        {offering.lowLatency && (
                          <span className="text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center">
                            <Zap className="h-3 w-3 mr-0.5" />
                            Low Latency
                          </span>
                        )}
                      </div>
                    )}

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

                    {/* Star Rating - only show if reviews exist for this provider */}
                    {providerReviews[offering.provider]?.rating > 0 && (
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(providerReviews[offering.provider].rating)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {providerReviews[offering.provider].rating} rating
                        </span>
                      </div>
                    )}

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

          {/* FCC Disclaimer */}
          {dataSource === 'fcc-bdc-database' && pipelineMetadata && (
            <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <Info className="h-3 w-3 inline mr-1 relative -top-px" />
                This data is sourced from the FCC Broadband Data Collection (BDC), which reflects what providers report they can offer at the census-block level. Actual availability at your specific address may vary. Contact providers to confirm service.
                {pipelineMetadata.dataAsOf && ` Data as of ${pipelineMetadata.dataAsOf}.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Chatbot Widget */}
      <ChatbotWidget
        offerings={offerings}
        reviews={providerReviews}
        reviewsLoading={reviewsLoading}
        userAddress={userAddress}
        pipelineMetadata={pipelineMetadata}
        dataSource={dataSource}
      />
    </div>
  )
}

export default OfferingsPage
