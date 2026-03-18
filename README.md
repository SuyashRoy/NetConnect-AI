# NetConnect AI

An intelligent broadband comparison platform that helps users find real ISP availability at their address. Powered by FCC Broadband Data Collection records for 5 US states, a Census Block geocoding pipeline, and a Gemini AI chatbot for personalized recommendations.

---

## Project Scope

The goal is to build a system where a user enters a street address and the app:

1. Geocodes the address to lat/lon (Google Maps API)
2. Maps those coordinates to a US Census Block (Census Bureau API)
3. Queries a PostgreSQL database of FCC broadband availability data for that block
4. Returns every provider, technology type, and speed tier available in that area
5. Displays the results alongside real Google Places reviews and an AI chatbot

The database covers **5 states**: California, Georgia, Illinois, New York, and Texas - approximately 3.6 million census-block-level records derived from the FCC's location-level broadband data.

---

## Architecture

```
User enters address
        |
        v
+-----------------+        +-------------------+
|  React Frontend |  --->  |  Express Backend  |
|  (Vite, port    |  /api  |  (Node, port 3001)|
|   5173)         |        |                   |
+-----------------+        +--------+----------+
                                    |
                      +------+------+------+------+
                      |      |             |      |
                      v      v             v      v
              Google Maps  Census Bureau  PostgreSQL  MongoDB Atlas
              Geocoding    Geocoder API   (broadband  (netconnect_cache)
              (addr→lat/lon) (lat/lon→FIPS) _lookup)   persistent cache
```

---

## The Plan

The project follows a 6-phase plan (detailed in `Broadband_Pipeline_Plan.md`):

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Data Preparation - Download FCC BDC CSVs for 5 states, write a Python/Pandas rollup script to aggregate location-level records to census-block-level, validate against FCC website | Done |
| **Phase 2** | Database Setup - Install PostgreSQL, create schema (`block_availability`, `technology_types`), build indexes on `block_geoid`/state/county/tract, bulk-load 3.6M rolled-up rows | Done |
| **Phase 3** | Geocoding Pipeline - Build the bridge from address to database: Google Maps geocoding, Census Bureau coordinate-to-FIPS lookup, Express backend serving the pipeline as an API | Done |
| **Phase 4** | Backend API - Expand the backend with additional endpoints, error handling, rate limiting, and production hardening | Not started |
| **Phase 5** | Frontend Integration - Rework the React UI to display FCC database results natively, add disclaimers, data-as-of dates, and state coverage messaging | Done |
| **Phase 6** | Testing, Performance, Deployment - End-to-end testing, query tuning, deploy to production (Supabase/Railway/Render) | Not started |

### What Phase 3 Delivered

Phase 3 is the critical bridge that connects a user's address to the database. Before Phase 3, the app relied on mock data and live FCC API calls (unreliable). After Phase 3, the app has a working pipeline:

**Backend server** (`server/`) with 8 API endpoints:
- `GET /api/broadband/lookup?address=...` - Full pipeline (address string in, providers out)
- `GET /api/broadband/by-coordinates?lat=...&lon=...` - Pipeline using pre-geocoded coordinates
- `GET /api/broadband/coverage` - Returns list of covered states
- `GET /api/broadband/health` - Database and cache connectivity check
- `GET /api/cache/:namespace/:key` - Retrieve a cached value from MongoDB
- `POST /api/cache/:namespace/:key` - Store a value in MongoDB cache
- `DELETE /api/cache/:namespace/:key` - Delete a cache entry
- `DELETE /api/cache/:namespace` - Clear all entries in a namespace

**Frontend integration**:
- New `broadbandPipelineApi.js` service that calls the backend
- `multiProviderApi.js` updated with the pipeline as the top-priority data strategy (Strategy 0), falling back to ZIP-based, FCC API, and individual provider APIs if the backend is unavailable

**Verified results across all 5 states** (pipeline time ~700ms):

| Test Address | State | Providers Found | Max Download |
|---|---|---|---|
| 1600 Amphitheatre Pkwy, Mountain View CA | CA | 2 | 1,200 Mbps |
| 350 5th Ave, New York NY | NY | 3 | 2,048 Mbps |
| 500 Main St, Houston TX | TX | 2 | 2,000 Mbps |
| 250 Peachtree St, Atlanta GA | GA | 3 | 7,000 Mbps |
| 1060 W Addison St, Chicago IL | IL | 3 | 1,500 Mbps |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, Vite, Tailwind CSS, Leaflet | UI, styling, maps |
| Backend | Express.js (Node) | API layer, pipeline orchestration |
| Database | PostgreSQL 16 | FCC broadband data (3.6M rows) |
| Cache | MongoDB Atlas | Persistent caching for geocoding, census blocks, availability, and reviews |
| Geocoding | Google Maps Geocoding API | Address to lat/lon |
| Census Block | US Census Bureau Geocoder API | Lat/lon to 15-digit FIPS code |
| Reviews | Google Places API | Real customer ratings and reviews |
| AI Chatbot | Google Gemini 1.5 Flash | Personalized ISP recommendations |
| Data Pipeline | Python, Pandas (one-time ETL) | FCC CSV rollup to census-block level |

---

## File Structure

```
NetConnect-AI/
|
|-- server/                          # Backend (Phase 3)
|   |-- index.js                     #   Express entry point (port 3001)
|   |-- config.js                    #   DB config, API keys, covered states
|   |-- db/
|   |   |-- connection.js            #   PostgreSQL connection pool
|   |   +-- mongoConnection.js       #   MongoDB Atlas connection singleton
|   |-- routes/
|   |   |-- broadband.js             #   /api/broadband/* endpoints
|   |   +-- cache.js                 #   /api/cache/* endpoints (frontend cache CRUD)
|   +-- services/
|       |-- geocoder.js              #   Google Maps geocoding (server-side)
|       |-- censusBlock.js           #   Census Bureau API (lat/lon -> FIPS)
|       |-- availability.js          #   PostgreSQL queries (FIPS -> providers)
|       +-- mongoCache.js            #   MongoDB-backed generic cache service
|
|-- src/                             # Frontend
|   |-- main.jsx                     #   React entry point
|   |-- App.jsx                      #   Router, theme, state management
|   |-- index.css                    #   Tailwind imports, global styles
|   |
|   |-- components/
|   |   |-- SearchPage.jsx           #   Address input + Google Autocomplete
|   |   |-- OfferingsPage.jsx        #   Results display + map + pagination
|   |   |-- ReviewsSection.jsx       #   Google Places reviews per provider
|   |   |-- ChatbotWidget.jsx        #   Gemini AI chat interface
|   |   +-- ui/                      #   Reusable UI primitives
|   |       |-- badge.jsx
|   |       |-- button.jsx
|   |       |-- card.jsx
|   |       +-- input.jsx
|   |
|   |-- services/
|   |   |-- broadbandPipelineApi.js  #   Backend API client + transformer
|   |   |-- multiProviderApi.js      #   Provider aggregation (4 strategies)
|   |   |-- googleMapsGeocoding.js   #   Client-side geocoding + fallback
|   |   |-- googlePlacesReviews.js   #   Reviews fetching + caching
|   |   |-- geminiChatbot.js         #   AI chatbot service
|   |   |-- fccBroadbandApi.js       #   FCC API + ZIP-based lookups
|   |   |-- attApi.js                #   AT&T broadband facts API
|   |   +-- providers/               #   Individual provider wrappers
|   |       |-- attProvider.js
|   |       |-- verizonProvider.js
|   |       |-- xfinityProvider.js
|   |       |-- tmobileProvider.js
|   |       +-- spectrumProvider.js
|   |
|   |-- utils/
|   |   |-- cache.js                 #   MongoDB-backed cache (async, via /api/cache)
|   |   +-- env.js                   #   Environment variable helpers
|   |
|   +-- lib/
|       +-- utils.js                 #   cn() classname merge utility
|
|-- Broadband_Pipeline_Plan.md       # Master plan document (6 phases)
|-- CLAUDE.md                        # Claude Code project instructions
|-- README.md                        # This file
|-- .env                             # API keys (not committed)
|-- .env.example                     # API key template
|-- vite.config.js                   # Vite config + /api proxy
|-- package.json                     # Dependencies + scripts
|-- tailwind.config.js               # Tailwind configuration
+-- postcss.config.js                # PostCSS configuration
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16 (with the `broadband_lookup` database loaded - see Phases 1-2)
- MongoDB Atlas cluster (free tier works fine - used for persistent caching)
- Google Maps API key (Geocoding API, Places API, Maps JavaScript API enabled)
- Google Gemini API key

### Environment Setup

Create a `.env` file in the project root (or copy from `.env.example`):

```env
# Google Maps API Key (geocoding, autocomplete, reviews)
VITE_GOOGLE_MAPS_API_KEY=your_key_here

# Google Gemini AI API
VITE_GEMINI_API_KEY=your_key_here

# Backend Server
PORT=3001

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=broadband_lookup
# DB_USER defaults to your system user

# MongoDB Atlas (persistent caching)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
```

The MongoDB connection is optional. If `MONGODB_URI` is not set, the server starts in degraded mode — all cache lookups return misses and the app functions normally, just without persistent caching.

### Running the Application

```bash
# Install dependencies
npm install

# Start both backend and frontend together (recommended)
npm run dev:all
```

This starts **both** the Express backend (port 3001) and the Vite frontend (port 5173) using `concurrently`. Output is labeled `[server]` and `[vite]` so you can tell them apart.

**Important**: The command is `npm run dev:all` (with a **colon**, not a space). Running `npm run dev all` (with a space) will only start the frontend — the backend will not launch and FCC database lookups will fail.

The frontend proxies `/api/*` requests to the backend via Vite's dev server proxy (configured in `vite.config.js`). Both servers must be running for the FCC pipeline to work.

You can also run them separately if needed:

```bash
# Terminal 1: Start the backend only (connects to PostgreSQL, serves API on port 3001)
npm run dev:server

# Terminal 2: Start the frontend only (Vite dev server on port 5173)
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start both backend and frontend together (uses `concurrently`) |
| `npm run dev` | Start Vite frontend dev server only (port 5173) |
| `npm run dev:server` | Start Express backend server only (port 3001) |
| `npm run build` | Production build of the frontend |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Data Provider Strategy

The app uses a 4-tier fallback strategy for fetching provider data. Each strategy is tried in order; the first one to return results wins:

| Priority | Strategy | Source | When Used |
|----------|----------|--------|-----------|
| 0 (Primary) | FCC BDC Database Pipeline | PostgreSQL via backend | Backend running, address in covered state |
| 1 | ZIP-based lookup | Built-in provider database | ZIP code available, backend down |
| 2 | FCC Broadband Map API | Live government API | Coordinates available, strategies 0-1 failed |
| 3 | Individual provider APIs | AT&T real API + mocks | All above failed |

When the backend is not running, the frontend gracefully falls back to strategies 1-3 with no visible error to the user.

---

## Database

The `broadband_lookup` PostgreSQL database contains FCC Broadband Data Collection data rolled up to the census-block level.

**Key table**: `block_availability` (3,618,304 rows)

| Column | Type | Description |
|--------|------|-------------|
| `block_geoid` | VARCHAR(15) | 15-digit Census Block FIPS code (primary lookup key) |
| `state_fips` | VARCHAR(2) | State FIPS (06=CA, 13=GA, 17=IL, 36=NY, 48=TX) |
| `brand_name` | VARCHAR(255) | Consumer-facing provider name |
| `technology` | INTEGER | 10=DSL, 40=Cable, 50=Fiber |
| `max_download` | NUMERIC(10,2) | Max advertised download speed (Mbps) |
| `max_upload` | NUMERIC(10,2) | Max advertised upload speed (Mbps) |
| `serves_residential` | BOOLEAN | Available to residential customers |
| `low_latency` | BOOLEAN | Low-latency service flag |

**Coverage**: 1.5M unique census blocks, 389 unique providers across 5 states. Data as of March 3, 2026 (FCC BDC J25 release).

---

## Known Limitations

- **Census block granularity**: If a provider serves 1 home in a block, the app shows it as available for the entire block. Urban blocks are small (often a single city block), so this is less of an issue in dense areas.
- **5 states only**: Addresses outside CA, GA, IL, NY, TX return a coverage message. The architecture scales to all 50 states by loading more FCC CSVs.
- **FCC data freshness**: The FCC publishes data roughly twice a year. The current dataset is from March 2026.
- **No pricing data**: FCC data includes speeds and technology but not pricing. The app shows estimated price ranges based on speed tiers.
- **Most individual providers use mock data**: Only AT&T has a real API integration; Verizon, Xfinity, T-Mobile, and Spectrum use mock plans as fallbacks.

---

## What's Next

- **Phase 4**: Expand the backend API with rate limiting, request validation, and structured error responses
- **Phase 6**: End-to-end testing, performance tuning, and deployment to a hosted environment
