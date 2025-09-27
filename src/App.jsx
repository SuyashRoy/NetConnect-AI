import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import SearchPage from './components/SearchPage'
import OfferingsPage from './components/OfferingsPage'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [userAddress, setUserAddress] = useState('')

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Dark/Light Mode Toggle - Fixed position */}
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
            ) : (
              <Moon className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
            )}
          </Button>
        </div>

        <Routes>
          <Route 
            path="/" 
            element={
              <SearchPage 
                onAddressSubmit={setUserAddress}
                userAddress={userAddress}
              />
            } 
          />
          <Route 
            path="/offerings" 
            element={
              userAddress ? (
                <OfferingsPage userAddress={userAddress} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
