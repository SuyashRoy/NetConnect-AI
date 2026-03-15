# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NetConnect AI is a React-based intelligent broadband comparison platform that helps users find and compare telecom services (internet, mobile, cable) in their area. It integrates multiple provider APIs, Google Maps services, and Gemini AI to provide personalized ISP recommendations with real customer reviews.

## Development Commands

```bash
# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## Architecture Overview

### Application Flow
1. **SearchPage** (`src/components/SearchPage.jsx`): Address input with Google Places Autocomplete
2. **Geocoding**: Address → coordinates using Google Maps Geocoding API
3. **OfferingsPage** (`src/components/OfferingsPage.jsx`): Display plans from multiple providers
4. **Multi-Provider Aggregation**: Fetches data in parallel from all providers

### Routing
- `/` - SearchPage (address input)
- `/offerings` - OfferingsPage (requires address state, redirects to `/` if missing)

Route protection implemented via conditional rendering in `App.jsx` - the offerings page redirects users back to search if no address is set.

### Provider System Architecture

The app uses a **multi-layered fallback strategy** for fetching provider data:

1. **Strategy 1 - ZIP-based lookup** (most reliable): If ZIP code available, use `fetchProvidersByZip()`
2. **Strategy 2 - FCC Broadband Map API**: Government data source, coordinate-based
3. **Strategy 3 - Individual provider APIs**: Parallel fetch from AT&T, Verizon, Xfinity, T-Mobile, Spectrum

**Provider Abstraction Pattern:**
- All providers in `src/services/providers/` must export `fetchProviderPlans(address, coordinates)`
- Returns standardized format: `{ provider, plans, source, error, timestamp }`
- Individual provider failures don't crash the app (uses `Promise.allSettled`)

**Adding a New Provider:**
1. Create `src/services/providers/[provider]Provider.js`
2. Export `fetchProviderPlans(address, coordinates)` function
3. Register in `src/services/multiProviderApi.js` providerFunctions array
4. Update `getAvailableProviders()` list

### Caching Strategy

Uses localStorage-based caching with TTL (Time-To-Live):
- **Reviews**: 24 hours (`reviewsCache`)
- **Geocoding**: 7 days (`geocodeCache`)
- **Offerings**: 1 hour (`offeringsCache`)

Cache implementation: `src/utils/cache.js` - simple class with namespace prefix pattern.

### API Integrations

**Google Maps API (single key handles all):**
- Geocoding API - Address → coordinates
- Places API - Address autocomplete & customer reviews
- Configured via `VITE_GOOGLE_MAPS_API_KEY` environment variable

**Google Gemini AI:**
- Chatbot for personalized recommendations
- Configured via `VITE_GEMINI_API_KEY`
- Uses `@google/generative-ai` SDK

**Provider APIs:**
- AT&T Broadband API (official nutrition labels endpoint)
- FCC Broadband Map API (government data)
- Other providers use mock data with realistic structure

### Fallback Strategy

The application gracefully degrades when APIs fail:
- **Google Maps unavailable**: Falls back to city-based mock geocoding (15 major US cities)
- **Google Places unavailable**: Reviews section hidden silently
- **Gemini AI unavailable**: Chatbot button hidden
- **Individual provider fails**: Other providers still display (doesn't break aggregation)

This is intentional - the app should never show error screens to users due to API failures.

## Code Patterns & Conventions

### Environment Variables
- All environment variables must use `VITE_` prefix (Vite requirement)
- Access via `src/utils/env.js` helper functions
- Never commit `.env` file (in `.gitignore`)

### Path Alias
- `@/` maps to `src/` directory (configured in `vite.config.js`)
- Use for absolute imports: `import { Button } from '@/components/ui/button'`

### Component Structure
- UI components in `src/components/ui/` (button, card, input, badge)
- Use `class-variance-authority` for component variants
- Tailwind CSS for styling with `tailwind-merge` for class merging utility

### Dark Mode
- Implemented via `dark` class on `<html>` element
- Persisted to localStorage as `theme` key
- System preference respected on first load
- Toggle button fixed in top-right (all pages)

### Data Fetching
- Parallel fetching using `Promise.allSettled` (not `Promise.all`) to prevent cascade failures
- Cache-first strategy for non-critical data (reviews, geocoding)
- Error handling at service layer, not component layer

### State Management
- React state only (no Redux/Context)
- Address and geocodeData passed through router state
- Theme state in App.jsx

## File Structure Guide

```
src/
├── components/
│   ├── SearchPage.jsx           # Address search with autocomplete
│   ├── OfferingsPage.jsx        # Main results page
│   ├── ReviewsSection.jsx       # Google Places reviews
│   ├── ChatbotWidget.jsx        # Gemini AI chatbot
│   └── ui/                      # Reusable UI components
├── services/
│   ├── multiProviderApi.js      # Provider aggregation logic
│   ├── googleMapsGeocoding.js   # Geocoding + reverse geocoding
│   ├── googlePlacesReviews.js   # Reviews integration
│   ├── geminiChatbot.js         # AI chatbot service
│   ├── attApi.js                # AT&T specific API logic
│   ├── fccBroadbandApi.js       # FCC government data
│   └── providers/               # Individual provider wrappers
│       ├── attProvider.js
│       ├── verizonProvider.js
│       ├── xfinityProvider.js
│       ├── tmobileProvider.js
│       └── spectrumProvider.js
├── utils/
│   ├── cache.js                 # Caching utility with TTL
│   └── env.js                   # Environment variable helpers
└── lib/
    └── utils.js                 # General utilities (cn function for classnames)
```

## Development Best Practices

### When Adding Features
- Follow the existing fallback pattern (real API → mock data)
- Use caching for any external API calls to reduce costs
- Test with and without API keys to ensure graceful degradation
- Add console.log statements for debugging (already established pattern)

### API Key Management
- Get API keys from `.env` using `src/utils/env.js` helpers
- Check for missing keys and log warnings, but don't throw errors
- Provide clear fallback behavior when keys are missing

### Error Handling
- Catch errors at service layer
- Return normalized error objects (with `source: 'error'` flag)
- Don't show error modals/toasts to users - fail silently or show fallback content
- Log errors to console for debugging

### Testing APIs
- Use `src/utils/testApi.js` for manual API testing if needed
- Test both success and failure cases
- Verify fallback behavior works correctly

## Known Limitations & TODOs

- Most providers use mock data (only AT&T and FCC have real APIs)
- No user authentication/accounts yet
- No plan comparison side-by-side view
- No price history tracking
- Autocomplete can have token glitches (mentioned in git history)
- Some privacy issues were fixed in recent commits

## Environment Setup

Required API keys (add to `.env`):
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Google Maps API needs these enabled:
- Maps JavaScript API
- Geocoding API
- Places API

Free tiers:
- Google Maps: $200 credit/month (~28K geocoding requests)
- Gemini AI: 60 requests/min, 1500 requests/day
