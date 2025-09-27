import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, MapPin, Wifi } from 'lucide-react'

const SearchPage = ({ onAddressSubmit, userAddress }) => {
  const [address, setAddress] = useState(userAddress || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    const validationError = validateAddress(address)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    
    // Simulate API call for address validation
    setTimeout(() => {
      onAddressSubmit(address)
      setIsLoading(false)
      navigate('/offerings')
    }, 1500)
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
      </div>

      {/* Search Card */}
      <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                Enter Your Address
              </label>
              <div className="relative">
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main Street, City, State, ZIP"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-12 h-14 text-lg border-2 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                  disabled={isLoading}
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
              {error && (
                <p className="text-sm text-red-500 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-300 transform hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Searching for offerings...
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
