# NetConnect AI - Intelligent Broadband Comparison Platform

A modern React application that helps users find and compare the best telecom offerings (internet, mobile, and cable services) available in their area, powered by AI and real provider data.

## Features

### Core Features
- 🏠 **Address-Based Search**: Enter your address to find telecom services in your area
- 🌍 **Google Maps Geocoding**: Accurate address validation and location mapping with fallback support
- 🔍 **Address Autocomplete**: Google Places Autocomplete for smart address suggestions
- 📡 **Multiple Provider APIs**: Real-time data from AT&T, Verizon, Xfinity, T-Mobile, and Spectrum
- 🗺️ **Interactive Map**: Visual location display with Leaflet maps
- 🌙 **Dark/Light Mode**: Toggle between themes with preference saving
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast Performance**: Built with Vite for lightning-fast development
- 🎨 **Modern UI**: Styled with Tailwind CSS and custom components

### Enhanced Features
- ⭐ **Real Customer Reviews**: Google Places API integration showing actual customer ratings and reviews
- 🤖 **AI-Powered Chatbot**: Gemini AI assistant providing personalized ISP recommendations
- 💾 **Smart Caching**: LocalStorage-based caching reduces API calls and improves performance
- 🔄 **Parallel Data Fetching**: Simultaneous provider and review fetching for faster load times
- 📊 **Provider Statistics**: View metrics on how many providers were checked and loaded

## Technologies Used

### Frontend
- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Leaflet** - Interactive maps
- **Lucide React** - Beautiful icons

### APIs & Services
- **Google Maps API** - Unified API for geocoding, address autocomplete, and places
  - Geocoding API - Address to coordinates conversion
  - Places API - Autocomplete and customer reviews
- **AT&T Broadband API** - Real-time AT&T broadband facts and pricing
- **Google Gemini AI** - AI-powered chatbot for personalized recommendations
- **Multiple Provider APIs** - Integration with Verizon, Xfinity, T-Mobile, Spectrum (expandable)

### Utilities
- **@google/generative-ai** - Google Gemini AI SDK
- **CORS Proxy** - Cross-origin request handling
- **LocalStorage Caching** - Client-side data caching with TTL

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd NetConnect-AI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Add your API keys to `.env`:
     ```env
     VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
     VITE_GEMINI_API_KEY=your_gemini_api_key_here
     ```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

### API Keys Setup

#### Google Maps API (Geocoding + Places + Autocomplete)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Geocoding API**
   - **Places API**
4. Go to Credentials → Create credentials → API Key
5. (Optional but recommended) Restrict your API key:
   - Application restrictions: HTTP referrers (your domain)
   - API restrictions: Select the 3 APIs above
6. Add to `.env` as `VITE_GOOGLE_MAPS_API_KEY`

**Free Tier**: $200 credit/month (~28,000 requests for geocoding, 40,000 for autocomplete)

**Note**: One API key handles geocoding, address autocomplete, and reviews!

#### Google Gemini AI API
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Create API key for new or existing project
4. Add to `.env` as `VITE_GEMINI_API_KEY`

**Free Tier**: 60 requests per minute, 1500 requests per day

## AT&T API Integration

This application integrates with AT&T's official broadband facts API to provide real-time pricing and availability data:

- **API Endpoint**: `https://www.att.com/static-content-service-ui/v1/labelfeed/shared/nutrition/CONS/`
- **Data Source**: Official AT&T broadband facts and nutrition labels
- **Features**: Real-time pricing, speed information, and service availability
- **Geocoding**: Address-to-taxation-geocode conversion for location-based queries
- **CORS Handling**: Uses proxy service for cross-origin requests

### API Response Data

The AT&T API provides:
- Monthly pricing information
- Download/upload speeds
- Data caps and limitations
- Service availability by location
- Contract terms and fees

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   ├── SearchPage.jsx          # Address search page with Google Maps geocoding & autocomplete
│   ├── OfferingsPage.jsx       # Telecom offerings display with reviews
│   ├── ReviewsSection.jsx      # Google Places reviews component
│   ├── ChatbotWidget.jsx       # Gemini AI chatbot component
│   └── ui/                     # Reusable UI components
│       ├── button.jsx
│       ├── card.jsx
│       ├── input.jsx
│       └── badge.jsx
├── services/
│   ├── googleMapsGeocoding.js  # Google Maps Geocoding API integration
│   ├── googlePlacesReviews.js  # Google Places reviews integration
│   ├── geminiChatbot.js        # Gemini AI chatbot service
│   ├── multiProviderApi.js     # Multi-provider aggregator
│   ├── attApi.js               # AT&T API integration
│   └── providers/              # Individual provider services
│       ├── attProvider.js
│       ├── verizonProvider.js
│       ├── xfinityProvider.js
│       ├── tmobileProvider.js
│       └── spectrumProvider.js
├── utils/
│   ├── env.js                  # Environment variable utilities
│   └── cache.js                # Caching utilities with TTL
├── lib/
│   └── utils.js                # General utility functions
├── App.jsx                     # Main application component
├── main.jsx                    # Application entry point
└── index.css                   # Global styles and Tailwind imports
```

## Usage

### Basic Flow
1. **Enter Address**: Start typing your address - autocomplete suggestions appear automatically
2. **Select or Type**: Choose from autocomplete suggestions or type the full address
3. **Address Validation**: Google Maps geocodes your address (falls back to mock if API unavailable)
4. **View Offerings**: Browse available telecom services from multiple providers
5. **Customer Reviews**: See real Google Places reviews for each provider
6. **AI Assistant**: Click "Ask AI Assistant" for personalized recommendations
7. **Interactive Map**: See your accurate location on the map
8. **Dark Mode**: Toggle between light and dark themes using the button in the top-right

### AI Chatbot Features
- Ask about the fastest internet option
- Get recommendations based on budget
- Compare providers side-by-side
- Ask about specific features (gaming, streaming, work-from-home)
- Get explanations about technical terms
- Receive personalized suggestions based on household size and usage

### Caching Behavior
- **Reviews**: Cached for 24 hours (reduces API calls)
- **Geocoding**: Cached for 7 days
- **Offerings**: Cached for 1 hour
- Cache automatically expires and refreshes

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Architecture Highlights

### Fallback Strategy
The application is designed to gracefully handle API failures:
- **Google Maps unavailable**: Falls back to mock geocoding based on city names
- **Google Places unavailable**: Hides review sections silently
- **Gemini AI unavailable**: Hides chatbot button
- **Individual provider fails**: Other providers still display

### Performance Optimizations
- **Parallel API Calls**: All providers fetched simultaneously using `Promise.allSettled`
- **Smart Caching**: Reduces redundant API calls with localStorage-based cache
- **Lazy Loading**: Reviews and chatbot load after initial offerings
- **Error Boundaries**: Individual provider failures don't crash the app

### Security Best Practices
- API keys in environment variables (not committed to git)
- `.env` automatically added to `.gitignore`
- CORS proxy used for cross-origin requests
- API key validation on initialization

## Troubleshooting

### Geocoding or autocomplete not working
- Verify `VITE_GOOGLE_MAPS_API_KEY` is set in `.env`
- Enable all required APIs: Maps JavaScript API, Geocoding API, Places API
- Check API key restrictions (make sure HTTP referrers allow your domain)
- Application will fall back to mock geocoding automatically
- Check browser console for specific error messages

### Reviews not showing
- Same Google Maps API key is used for reviews
- Verify the key has Places API enabled
- Check API key restrictions
- Reviews section hides silently if API fails

### Chatbot not appearing
- Verify `VITE_GEMINI_API_KEY` is set in `.env`
- Check you haven't exceeded free tier limits (60 req/min)
- Ensure API key is valid and active

### No offerings showing
- Check browser console for errors
- Verify internet connection
- AT&T API may have rate limits - app falls back to mock data

## Future Enhancements

- [ ] Add more ISP provider APIs (Cox, Frontier, etc.)
- [ ] User accounts and saved preferences
- [ ] Comparison tool for side-by-side plan comparison
- [ ] Availability checker based on zip code
- [ ] Price history and trends
- [ ] Email alerts for price changes
- [ ] Advanced filtering (speed, price range, provider)
- [ ] Mobile app version

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

NetConnect AI is an intelligent RAG (Retrieval-Augmented Generation) platform designed to be a one-stop shop for broadband offerings in your residential area, enhanced with AI-powered recommendations and real customer reviews.
