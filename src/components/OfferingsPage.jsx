import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Wifi, Smartphone, Tv, Star, MapPin, DollarSign, Zap } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const OfferingsPage = ({ userAddress }) => {
  const navigate = useNavigate()
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]) // Default to NYC
  const [isLoading, setIsLoading] = useState(true)
  const [offerings, setOfferings] = useState([])

  // Mock geocoding function - in real app, you'd use a geocoding service
  const geocodeAddress = async (address) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock coordinates based on common city names in address
    const cityCoords = {
      'new york': [40.7128, -74.0060],
      'los angeles': [34.0522, -118.2437],
      'chicago': [41.8781, -87.6298],
      'houston': [29.7604, -95.3698],
      'phoenix': [33.4484, -112.0740],
      'philadelphia': [39.9526, -75.1652],
      'san antonio': [29.4241, -98.4936],
      'san diego': [32.7157, -117.1611],
      'dallas': [32.7767, -96.7970],
      'san jose': [37.3382, -121.8863]
    }
    
    const lowerAddress = address.toLowerCase()
    for (const [city, coords] of Object.entries(cityCoords)) {
      if (lowerAddress.includes(city)) {
        return coords
      }
    }
    
    // Default coordinates if no city match
    return [40.7128, -74.0060]
  }

  // Mock telecom offerings data
  const generateOfferings = (address) => {
    const providers = [
      {
        id: 1,
        name: 'FiberMax Pro',
        type: 'Internet',
        icon: Wifi,
        speed: '1 Gbps',
        price: 79.99,
        rating: 4.8,
        features: ['Unlimited Data', 'Free Installation', '24/7 Support'],
        availability: 'Available',
        color: 'blue'
      },
      {
        id: 2,
        name: 'ConnectMobile Plus',
        type: 'Mobile',
        icon: Smartphone,
        speed: '5G Network',
        price: 65.00,
        rating: 4.6,
        features: ['Unlimited Talk & Text', '50GB Data', 'International Roaming'],
        availability: 'Available',
        color: 'green'
      },
      {
        id: 3,
        name: 'StreamTV Ultimate',
        type: 'TV & Cable',
        icon: Tv,
        speed: '300+ Channels',
        price: 89.99,
        rating: 4.4,
        features: ['Premium Channels', 'DVR Included', 'Streaming Apps'],
        availability: 'Available',
        color: 'purple'
      },
      {
        id: 4,
        name: 'SpeedNet Basic',
        type: 'Internet',
        icon: Wifi,
        speed: '100 Mbps',
        price: 39.99,
        rating: 4.2,
        features: ['Reliable Connection', 'Basic Support', 'No Contract'],
        availability: 'Available',
        color: 'orange'
      },
      {
        id: 5,
        name: 'MegaMobile Family',
        type: 'Mobile',
        icon: Smartphone,
        speed: '4G/5G',
        price: 120.00,
        rating: 4.7,
        features: ['4 Lines Included', 'Unlimited Everything', 'Mobile Hotspot'],
        availability: 'Limited',
        color: 'red'
      }
    ]
    
    return providers
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      // Get coordinates for the address
      const coords = await geocodeAddress(userAddress)
      setMapCenter(coords)
      
      // Generate offerings for the address
      const mockOfferings = generateOfferings(userAddress)
      setOfferings(mockOfferings)
      
      setIsLoading(false)
    }
    
    loadData()
  }, [userAddress])

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading telecom offerings for your area...</p>
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
            <div className="h-full overflow-y-auto space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Available Services</h2>
                <Badge variant="secondary">{offerings.length} offerings found</Badge>
              </div>
              
              {offerings.map((offering) => {
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
                            <p className="text-sm text-muted-foreground">{offering.type}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={offering.availability === 'Available' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {offering.availability}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{offering.speed}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">${offering.price}/month</span>
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

                      <Button className="w-full" variant="default">
                        View Details & Order
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OfferingsPage
