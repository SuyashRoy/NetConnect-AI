# Technical Deep Dive

A component-by-component explanation of how every piece of the NetConnect AI pipeline works, organized by phase.

---

## Phase 1: Data Preparation (One-Time ETL)

Phase 1 happens entirely in the companion repository (`market-demographics-fcc-pipeline`). Its output is a single CSV file that gets loaded into PostgreSQL in Phase 2.

### 1.1 Raw FCC Data

The FCC Broadband Data Collection (BDC) publishes CSV files at https://broadbandmap.fcc.gov/data-download. For each of the 5 target states (CA, GA, IL, NY, TX), there are separate files per technology type:

```
data/
  CA/
    bdc_CA_Cable_fixed_broadband_J25_03mar2026.csv
    bdc_CA_Copper_fixed_broadband_J25_03mar2026.csv
    bdc_CA_FibertothePremises_fixed_broadband_J25_03mar2026.csv
  GA/ ...
  IL/ ...
  NY/ ...
  TX/ ...
```

Each row represents a single **location** (a physical address point). Key columns:

| Column | Example | Meaning |
|--------|---------|---------|
| `provider_id` | 130077 | Unique FCC identifier for the provider |
| `brand_name` | AT&T Inc. | Consumer-facing name |
| `location_id` | 1100400012345 | FCC Fabric location (address point) |
| `technology` | 50 | Technology code (50 = Fiber) |
| `max_advertised_download_speed` | 5000 | Mbps |
| `max_advertised_upload_speed` | 5000 | Mbps |
| `low_latency` | 1 | Boolean flag |
| `business_residential_code` | X | R=Residential, B=Business, X=Both |
| `block_geoid` | 060855012003005 | 15-digit Census Block FIPS code |

A single state like California has ~19.4 million location-level rows across all technology files.

### 1.2 The Rollup Script

The Jupyter notebooks in `market-demographics-fcc-pipeline/notebook/` perform the rollup. The logic for each state:

1. **Load** all technology CSVs for the state (`pd.concat`)
2. **Merge** with the provider master list to get canonical holding company names
3. **Validate** `block_geoid` - zero-pad to exactly 15 digits, drop nulls
4. **Derive FIPS hierarchy** from `block_geoid`:
   - `state_fips` = first 2 digits (e.g., `06` for California)
   - `county_fips` = first 5 digits (e.g., `06085` for Santa Clara County)
   - `tract_fips` = first 11 digits
5. **Group by** `(block_geoid, provider_id, holding_company, technology)`
6. **Aggregate**:
   - `max_download` = MAX of all `max_advertised_download_speed` values in the group
   - `max_upload` = MAX of all `max_advertised_upload_speed` values
   - `serves_residential` = TRUE if any row has `business_residential_code` in ('R', 'X')
   - `serves_business` = TRUE if any row has `business_residential_code` in ('B', 'X')
   - `low_latency` = MAX (TRUE if any row is low-latency)
7. **Export** to CSV

**Why rollup?** A census block may contain hundreds of location points, all served by the same provider at the same speed. Rolling up collapses these duplicates. California goes from 19.4M rows to 868K rows (22x reduction). The final combined dataset across all 5 states: **3,618,304 rows**.

### 1.3 Provider Master List

The provider master list (`data/bdc_us_provider_list_J25_03mar2026.csv`, 2,883 records) maps FCC `provider_id` values to canonical holding company names. This is important because the same company may appear under different `brand_name` values in the FCC data (e.g., "AT&T California" vs "AT&T Texas" are both "AT&T Inc."). The notebooks `Provider_Master_Prep.ipynb` and `Provider_Master_Prep_II.ipynb` handle this merge and resolve 63 name mismatches between the two source files.

### 1.4 Final Output

```
output/
  all_states_block_level_availability.csv   (3,618,304 rows, 365.6 MB)
```

Columns in the output CSV match the PostgreSQL schema exactly:
`block_geoid, state_fips, county_fips, tract_fips, provider_id, brand_name, technology, technology_name, max_download, max_upload, serves_residential, serves_business, low_latency`

---

## Phase 2: Database Setup (PostgreSQL)

### 2.1 Schema

The database `broadband_lookup` has two tables:

**`block_availability`** - the main data table (3,618,304 rows):

```sql
CREATE TABLE block_availability (
    id                 SERIAL PRIMARY KEY,
    block_geoid        VARCHAR(15) NOT NULL,
    state_fips         VARCHAR(2) NOT NULL,
    county_fips        VARCHAR(5) NOT NULL,
    tract_fips         VARCHAR(11) NOT NULL,
    provider_id        VARCHAR(20) NOT NULL,
    brand_name         VARCHAR(255) NOT NULL,
    technology         INTEGER NOT NULL,        -- 10=DSL, 40=Cable, 50=Fiber
    technology_name    VARCHAR(100) NOT NULL,
    max_download       NUMERIC(10,2),
    max_upload         NUMERIC(10,2),
    serves_residential BOOLEAN DEFAULT TRUE,
    serves_business    BOOLEAN DEFAULT FALSE,
    low_latency        BOOLEAN DEFAULT FALSE
);
```

**`technology_types`** - lookup table for human-readable names:

```sql
CREATE TABLE technology_types (
    code INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
-- Values: (10, 'Copper Wire (DSL)'), (40, 'Cable (DOCSIS)'), (50, 'Fiber to the Premises')
```

### 2.2 Indexes

Seven indexes are created to support different query patterns:

| Index | Column(s) | Purpose |
|-------|-----------|---------|
| `idx_block_geoid` | `block_geoid` | **Primary query path** - every API request queries by this |
| `idx_state_fips` | `state_fips` | Filter/validate by state |
| `idx_county_fips` | `county_fips` | County-level analytics |
| `idx_tract_fips` | `tract_fips` | Tract-level analytics |
| `idx_provider` | `brand_name` | Provider-specific lookups |
| `idx_technology` | `technology` | Technology filtering |
| `idx_block_residential` | `(block_geoid, serves_residential)` WHERE `serves_residential = TRUE` | Partial index for the most common query (residential-only) |

The `idx_block_geoid` index is the critical one. Without it, every query would full-scan 3.6M rows. With it, lookups complete in under 10ms.

### 2.3 Data Loading

The rolled-up CSV was loaded using PostgreSQL's `COPY` command:

```sql
COPY block_availability (
    block_geoid, state_fips, county_fips, tract_fips,
    provider_id, brand_name, technology, technology_name,
    max_download, max_upload, serves_residential, serves_business, low_latency
)
FROM '/path/to/all_states_block_level_availability.csv'
WITH (FORMAT csv, HEADER true);
```

### 2.4 Data Statistics

| Metric | Value |
|--------|-------|
| Total rows | 3,618,304 |
| Unique census blocks | 1,511,126 |
| Unique providers | 389 |
| Top provider by coverage | AT&T Inc. (25.4%) |
| Technology split | 38.9% Fiber, 37.3% Cable, 23.8% DSL |
| States | CA (06), GA (13), IL (17), NY (36), TX (48) |

---

## Phase 3: Geocoding Pipeline

Phase 3 is the bridge between a user's address and the database. It consists of a backend Express server and frontend integration.

### 3.1 Backend Entry Point

**File**: `server/index.js`

The Express server starts on port 3001 (configurable via `PORT` env var). On startup it:

1. Loads environment variables from `.env` via `dotenv`
2. Sets up CORS to allow requests from the Vite dev server (ports 5173, 4173)
3. Mounts the broadband router at `/api/broadband`
4. Mounts the cache router at `/api/cache` (frontend cache CRUD backed by MongoDB)
5. Tests the PostgreSQL and MongoDB connections
6. Starts listening

The server is intentionally minimal - no authentication, no rate limiting yet (Phase 4 scope).

### 3.2 Configuration

**File**: `server/config.js`

Centralizes all configuration. Reads from environment variables with sensible defaults:

- `port` - Server port (default 3001)
- `db.*` - PostgreSQL connection parameters (host, port, database name, user, password, pool settings)
- `googleMapsApiKey` - Read from `VITE_GOOGLE_MAPS_API_KEY` (same key the frontend uses)
- `coveredStates` - Maps state FIPS codes to names: `{ '06': 'California', '13': 'Georgia', ... }`
- `coveredStateAbbreviations` - `['CA', 'GA', 'IL', 'NY', 'TX']`

The covered states list is used to return a clear message when a user searches an address outside coverage.

### 3.3 Database Connection Pool

**File**: `server/db/connection.js`

Creates a `pg.Pool` with the connection parameters from config. The pool:

- Maintains up to 20 concurrent connections
- Automatically manages connection lifecycle (checkout, return, idle timeout)
- Logs connection events and errors
- Exports a `testConnection()` function that runs `SELECT COUNT(*) FROM block_availability` to verify connectivity at startup

Using a pool instead of individual connections is important because each API request needs a database query, and creating a new connection per request would add ~50ms of overhead.

### 3.4 Server-Side Geocoding

**File**: `server/services/geocoder.js`

**What it does**: Takes a street address string and returns lat/lon coordinates plus address components.

**How it works**:

1. Builds a Google Maps Geocoding API URL: `https://maps.googleapis.com/maps/api/geocode/json?address=...&key=...`
2. Sends the request and parses the JSON response
3. Extracts from the first result:
   - `lat` and `lon` from `geometry.location`
   - `formattedAddress` - Google's canonical version of the address
   - `placeId` - Google's unique identifier for this place
   - `components` - Parsed address parts (street number, street, city, county, state, state abbreviation, ZIP, country)
4. Returns the structured object

**Why server-side?** The frontend already does client-side geocoding, but the backend needs coordinates for the Census Bureau API call. Rather than requiring the frontend to pass coordinates, the `/lookup` endpoint accepts a raw address string and does everything server-side. The `/by-coordinates` endpoint exists for when the frontend already has coordinates (avoiding a redundant Google Maps call).

### 3.5 Census Block FIPS Lookup

**File**: `server/services/censusBlock.js`

This is the core innovation of Phase 3 - the piece that didn't exist before.

**What it does**: Takes lat/lon coordinates and returns the 15-digit Census Block FIPS code (the `block_geoid` used to query the database).

**How it works**:

1. **Cache check** - Looks up `lat,lon` (rounded to 6 decimal places) in an in-memory Map. Cache entries last 7 days. This avoids repeated Census Bureau API calls for the same location.

2. **Census Bureau API call**:
   ```
   GET https://geocoding.geo.census.gov/geocoder/geographies/coordinates
       ?x={longitude}&y={latitude}
       &benchmark=Public_AR_Current
       &vintage=Census2020_Current
       &format=json
   ```
   - `x` is longitude, `y` is latitude (note: Census Bureau uses x/y, not lat/lon)
   - `benchmark=Public_AR_Current` uses the latest address range data
   - `vintage=Census2020_Current` uses Census 2020 geography boundaries
   - 15-second timeout (the Census Bureau API can be slow, sometimes 500ms-2s)

3. **Response parsing** - The API returns a nested JSON structure. The FIPS code is at:
   ```
   result.geographies["Census Blocks"][0].GEOID
   ```
   or sometimes under `"2020 Census Blocks"`. The service checks both keys.

4. **FIPS decomposition** - From the 15-digit GEOID, derives:
   - `stateFips` = first 2 digits (e.g., `06`)
   - `countyFips` = first 5 digits (e.g., `06085`)
   - `tractFips` = first 11 digits (e.g., `06085501200`)

5. **Cache store** - Saves the result for future requests.

**Alternative: address-based lookup** - The service also exports `getCensusBlockByAddress(street, city, state)` which sends the address directly to the Census Bureau's address geocoder, bypassing Google Maps entirely. This is useful as a fallback but is less reliable than Google's geocoding for address matching.

**Why not PostGIS?** The plan describes a PostGIS option (Option C) where census block shapefiles are loaded locally for sub-millisecond lookups. That's the production path. For the MVP, the Census Bureau API (Option A) is simpler to set up - no shapefile downloads, no PostGIS extension - at the cost of ~500ms-1.5s per lookup (cached after first hit).

### 3.6 Availability Query Service

**File**: `server/services/availability.js`

**What it does**: Takes a Census Block GEOID and queries PostgreSQL for all providers at that block.

**`getAvailabilityByBlock(blockGeoid, options)`**

1. Runs a SQL query against `block_availability`:
   ```sql
   SELECT brand_name, provider_id, technology, technology_name,
          max_download, max_upload, serves_residential,
          serves_business, low_latency
   FROM block_availability
   WHERE block_geoid = $1 AND serves_residential = TRUE
   ORDER BY max_download DESC
   ```
   Uses a parameterized query (`$1`) to prevent SQL injection. The `serves_residential = TRUE` filter is on by default (configurable via `options.residentialOnly`).

2. **Groups results by provider**. A single provider often has multiple service entries (e.g., AT&T may offer both Fiber and DSL at the same block). The function creates a map keyed by `brand_name`, collecting all services under each provider.

3. Returns:
   ```json
   {
     "providers": [
       {
         "name": "AT&T Inc.",
         "providerId": "130077",
         "services": [
           { "technology": "Fiber to the Premises (FTTP)", "maxDownloadMbps": 5000, ... },
           { "technology": "Copper Wire (DSL)", "maxDownloadMbps": 100, ... }
         ]
       }
     ],
     "totalServices": 4,
     "totalProviders": 2,
     "queryTimeMs": 3
   }
   ```

**`getBlockSummary(blockGeoid)`** - Returns aggregate statistics for a block:
- `providerCount` - How many distinct providers serve this block
- `maxDownloadAvailable` - The fastest download speed available from any provider
- `hasFiber`, `hasCable`, `hasDsl` - Boolean flags for technology availability

**`isStateCovered(stateFips)`** - Quick check: does the database have any rows for this state?

### 3.7 API Routes

**File**: `server/routes/broadband.js` and `server/routes/cache.js`

Four broadband endpoints under `/api/broadband`, plus four cache endpoints under `/api/cache` (see the Caching section below for cache endpoint details):

**`GET /lookup?address=...`** - The full pipeline:

```
address string
    |
    v
geocoder.js: Google Maps Geocoding API
    |  -> lat, lon, formattedAddress, state abbreviation
    v
censusBlock.js: Census Bureau Geocoder API
    |  -> 15-digit block_geoid, state FIPS
    v
config.js: Is this state in coveredStates?
    |  -> If no: return { covered: false, message: "We cover CA, GA, IL, NY, TX..." }
    v
availability.js: PostgreSQL query
    |  -> providers grouped with services
    v
JSON response with address, coordinates, censusBlock, providers, summary, timing
```

Each step can fail independently. If Google Maps fails, the whole request fails with a 500. If the Census Bureau API fails, same. If the state isn't covered, a 200 is returned with `covered: false` and a human-readable message.

**`GET /by-coordinates?lat=...&lon=...`** - Same pipeline but skips step 1 (Google Maps geocoding). Used when the frontend already has coordinates from its own client-side geocoding.

**`GET /coverage`** - Returns the static list of covered states and the data-as-of date. No database query.

**`GET /health`** - Runs `isStateCovered('06')` (California) as a quick database connectivity test. Returns `{ status: "healthy" }` or `{ status: "unhealthy" }`.

### 3.8 Frontend API Client

**File**: `src/services/broadbandPipelineApi.js`

This is the frontend's interface to the backend. It exports:

**`lookupByAddress(address)`** - Calls `GET /api/broadband/lookup?address=...` and returns the JSON response.

**`lookupByCoordinates(lat, lon)`** - Calls `GET /api/broadband/by-coordinates?lat=...&lon=...`. This is what `multiProviderApi.js` uses, since the frontend already has coordinates from its own geocoding step.

**`transformPipelineToPlans(pipelineResult)`** - Converts the backend's provider/service format into the "plan" format that `OfferingsPage.jsx` expects. This is important because the existing UI was built around a plan card format with fields like `name`, `speed`, `price`, `features`, `color`, `source`. The transformer:

1. Iterates over each provider and each service within it
2. Formats speed as human-readable strings (e.g., 5000 Mbps becomes "5 Gbps")
3. Estimates a price range based on download speed tier (FCC data doesn't include pricing):
   - >= 1000 Mbps: $80-120/mo
   - >= 500 Mbps: $60-80/mo
   - >= 300 Mbps: $50-70/mo
   - etc.
4. Generates feature bullets based on technology type and speed
5. Assigns a color from a provider-to-color map (AT&T = blue, Comcast = purple, etc.)
6. Sets `source` to `"FCC BDC Data (2026-03-03)"` so the UI shows where the data came from

### 3.9 Multi-Provider Integration

**File**: `src/services/multiProviderApi.js` (modified)

The `fetchAllProviders()` function was updated to add the pipeline as **Strategy 0** (highest priority):

```
Strategy 0: FCC BDC Database Pipeline (NEW)
    Try: lookupByCoordinates(lat, lon) via backend
    If backend returns providers for a covered state -> use this data
    If backend is down or state not covered -> fall through

Strategy 1: ZIP-based Lookup
    Try: fetchProvidersByZip(zipCode)
    If ZIP available and returns data -> use this data
    If not -> fall through

Strategy 2: FCC Broadband Map API
    Try: fetchFCCProviders(coordinates, address) via live FCC API
    If returns data -> use this data
    If not -> fall through

Strategy 3: Individual Provider APIs
    fetchATT, fetchVerizon, fetchXfinity, fetchTMobile, fetchSpectrum
    All called in parallel via Promise.allSettled
    Collects whatever succeeds
```

The key design principle: **the frontend never breaks if the backend is down**. Strategy 0 catches the error (`catch` block logs a warning), and execution falls through to the existing strategies. The user sees data either way.

### 3.10 Vite Proxy Configuration

**File**: `vite.config.js` (modified)

Added a `server.proxy` rule:

```js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

This means during development, any request from the React frontend to `/api/*` is transparently proxied to the Express backend on port 3001. The browser only talks to port 5173; the proxy handles cross-origin concerns. In production, you'd configure your reverse proxy (nginx, Cloudflare, etc.) to route `/api/*` to the backend instead.

---

## Pre-Phase 3: Frontend Components (Original Build)

These components were built before the pipeline existed and continue to work alongside it.

### SearchPage.jsx

**Purpose**: Address input with Google Places Autocomplete.

**Flow**:
1. On mount, loads the Google Maps JavaScript API script tag
2. Initializes `google.maps.places.Autocomplete` on the input field
3. When user selects a suggestion, extracts `formatted_address`, `geometry.location`, and `place_id`
4. On form submit:
   - If autocomplete selection exists, uses its coordinates directly
   - Otherwise, calls `geocodeAddress()` from `googleMapsGeocoding.js`
5. Passes the address string and geocode result to the parent (`App.jsx`) via `onAddressSubmit`
6. Navigates to `/offerings`

Also supports ZIP-code-only mode using the Zippopotam.us API.

### OfferingsPage.jsx

**Purpose**: Displays provider plans, map, reviews, and chatbot.

**Flow**:
1. Receives `userAddress` and `geocodeData` as props from `App.jsx`
2. Extracts coordinates, sets the Leaflet map center
3. Calls `fetchAllProviders(address, coordinates, geocodeData)` - this is where Strategy 0 (the pipeline) gets invoked
4. Formats the returned plans into card format
5. Renders a paginated grid of plan cards (6 per page)
6. After plans load, fetches Google Places reviews for each unique provider name
7. Renders the `ChatbotWidget` with plans, reviews, and address as context

### ReviewsSection.jsx

**Purpose**: Displays Google Places reviews for a single provider.

Shows star ratings, review text, author name, and relative time. Reviews are fetched by `googlePlacesReviews.js` which searches for `"{provider name} store near {coordinates}"` via the Google Places API and caches results for 24 hours.

### ChatbotWidget.jsx

**Purpose**: Floating chat interface powered by Google Gemini.

The chatbot receives the full list of offerings and reviews as context. Its system prompt instructs it to analyze actual customer reviews, cite specific feedback, and make recommendations that balance technical specs with real customer satisfaction. Uses `@google/generative-ai` SDK with Gemini 1.5 Flash model.

### Caching (utils/cache.js) — MongoDB-Backed

The client-side `Cache` class was migrated from `localStorage` to MongoDB Atlas cloud storage. All cache data now persists across devices and browser sessions, stored in the `netconnect_cache` database.

**How it works**: The frontend `Cache` class makes REST API calls to the backend's `/api/cache` endpoints, which delegate to the `mongoCache.js` service. All methods are `async` and fail silently on network errors (return `null` / do nothing), preserving the app's graceful degradation pattern.

**API endpoints** (defined in `server/routes/cache.js`):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/cache/:namespace/:key` | Retrieve a cached value |
| `POST` | `/api/cache/:namespace/:key` | Store a value (body: `{ value, ttlMinutes }`) |
| `DELETE` | `/api/cache/:namespace/:key` | Delete a single entry |
| `DELETE` | `/api/cache/:namespace` | Clear all entries in a namespace |

**Cache instances**:
- `reviewsCache` (24-hour TTL) — Avoids re-fetching Google Places reviews
- `geocodeCache` (7-day TTL) — Avoids re-geocoding the same address
- `offeringsCache` (1-hour TTL) — Avoids re-fetching provider data

**Default TTLs per namespace** (enforced server-side when the client doesn't specify):
- `reviews` → 24 hours
- `geocode` → 7 days
- `offerings` → 1 hour

**MongoDB storage details**: Each cache namespace maps to a MongoDB collection inside the `netconnect_cache` database. Documents use the cache key as `_id`, store the value in a `value` field, and have an `expiresAt` field with a TTL index so MongoDB automatically purges expired entries. The `mongoCache.js` service double-checks expiration on reads (MongoDB's TTL monitor can lag up to 60 seconds).

**Why the migration?** `localStorage` is limited to a single browser on a single device and has a ~5MB storage cap. Moving to MongoDB means cached reviews, geocoding results, and offerings persist across sessions and devices, and the server-side cache is shared across all users — if one user looks up reviews for "AT&T near 37.3861,-122.0839", the next user searching the same area gets a cache hit without another Google Places API call.

### Environment Helpers (utils/env.js)

Exports `getGoogleMapsKey()` and `getGeminiKey()`. Each reads from `import.meta.env.VITE_*` (Vite's mechanism for exposing env vars to the browser). Throws a descriptive error if the key is missing, which upstream callers catch to trigger fallback behavior.

### Fallback Strategy

The application is designed so that **no single API failure shows an error screen to the user**:

| Service | If unavailable |
|---------|---------------|
| Google Maps API | Falls back to mock geocoding (15 major US cities) |
| Google Places API | Reviews section silently hidden |
| Gemini AI API | Chatbot button hidden |
| Backend / PostgreSQL | Falls through to Strategy 1-3 in multiProviderApi |
| Census Bureau API | Backend returns 500, frontend falls through |
| MongoDB cache | All cache methods return null silently; app works without caching |
| Individual provider API | Other providers still display (Promise.allSettled) |

---

## MongoDB Cache Layer

### Overview

The application uses MongoDB Atlas as a persistent cache layer. The MongoDB connection is managed by `server/db/mongoConnection.js` as a singleton, and all cache operations go through `server/services/mongoCache.js`.

There are two independent sets of MongoDB-backed caches:

1. **Server-side caches** (used directly by backend services):
   - `geocode_cache` — Used by `server/services/geocoder.js` to cache Google Maps geocoding results (7-day TTL)
   - `census_block_cache` — Used by `server/services/censusBlock.js` to cache Census Bureau FIPS lookups (7-day TTL)
   - `availability_cache` — Used by `server/services/availability.js` to cache PostgreSQL query results (1-hour TTL)

2. **Client-facing caches** (accessed via REST API from the frontend):
   - `reviews` — Google Places reviews (24-hour TTL)
   - `geocode` — Frontend geocoding results (7-day TTL)
   - `offerings` — Provider offerings (1-hour TTL)

### MongoDB Connection

**File**: `server/db/mongoConnection.js`

The connection is configured via the `MONGODB_URI` environment variable. Key characteristics:

- **Singleton pattern** — A single `MongoClient` instance is created and reused for the lifetime of the process
- **Fail-open** — If MongoDB is unavailable (no URI configured, connection timeout, Atlas outage), the app continues without caching. No errors propagate to the user
- **Database name** — `netconnect_cache` (hardcoded)
- **Timeouts** — 5-second connect timeout, 5-second server selection timeout

### mongoCache.js Service

**File**: `server/services/mongoCache.js`

A generic cache service with four operations:

- **`get(collectionName, key)`** — Finds a document by `_id: key`. Double-checks `expiresAt` against the current time (MongoDB's TTL monitor can lag up to 60 seconds). Returns the `value` field or `null`.
- **`set(collectionName, key, value, ttlSeconds)`** — Upserts a document with `{ _id: key, value, createdAt, expiresAt }`. Creates a TTL index on `expiresAt` (once per collection per process).
- **`del(collectionName, key)`** — Deletes the document with `_id: key`.
- **`clear(collectionName)`** — Deletes all documents in the collection.

All methods catch errors internally and return `null` or `false` — they never throw.

### Cache REST API

**File**: `server/routes/cache.js`

Exposes the `mongoCache.js` service as REST endpoints for the frontend:

```
GET    /api/cache/:namespace/:key     → mongoCache.get(namespace, key)
POST   /api/cache/:namespace/:key     → mongoCache.set(namespace, key, body.value, ttl)
DELETE /api/cache/:namespace/:key     → mongoCache.del(namespace, key)
DELETE /api/cache/:namespace           → mongoCache.clear(namespace)
```

The `POST` endpoint accepts `{ value, ttlMinutes? }` in the request body. If `ttlMinutes` is omitted, a default is applied based on the namespace (`reviews` = 24h, `geocode` = 7d, `offerings` = 1h, anything else = 1h).

### Frontend Cache Client

**File**: `src/utils/cache.js`

The `Cache` class provides the same interface as the original localStorage version, but all methods are now `async`:

```js
const cached = await reviewsCache.get(cacheKey);    // Returns value or null
await reviewsCache.set(cacheKey, data);               // Fire-and-forget is fine
await reviewsCache.delete(cacheKey);                   // Remove one entry
await reviewsCache.clear();                            // Remove all reviews
const exists = await reviewsCache.has(cacheKey);       // Boolean
```

Each method makes a `fetch()` call to the corresponding `/api/cache` endpoint. On any network error (backend down, timeout, etc.), methods return `null` or do nothing — matching the app's fail-silently pattern. The Vite dev server proxy forwards `/api/*` to `localhost:3001`.

---

## End-to-End Pipeline Walkthrough

This section traces exactly what happens from the moment a user types an address to the moment provider results appear on screen.

### Step 1: User Enters an Address

The user lands on `SearchPage.jsx` (route `/`). They see an input field with Google Places Autocomplete enabled.

**Two input modes**:
- **Full Address mode** (default): The input field has a Google `Autocomplete` instance attached. As the user types, Google returns address suggestions. When the user selects one, the component stores the `formatted_address`, `geometry.location` (lat/lng), and `place_id` in local state (`selectedPlace`).
- **ZIP Code mode**: The user enters a 5-digit ZIP. On submit, the app calls the Zippopotam.us API to get approximate coordinates.

When the user clicks "Find Telecom Offerings":

1. `handleSubmit()` fires in `SearchPage.jsx`
2. If the user selected an autocomplete suggestion, coordinates are extracted directly from `selectedPlace.geometry.location.lat()` / `.lng()`. No geocoding API call is needed.
3. If the user typed an address manually (no autocomplete selection), `geocodeAddress()` from `googleMapsGeocoding.js` is called to get coordinates from Google Maps.
4. The result — `{ coordinates: [lat, lng], formattedAddress, ... }` — is passed to `App.jsx` via the `onAddressSubmit` callback.
5. `App.jsx` stores `userAddress` (string) and `geocodeData` (object with coordinates) in React state.
6. The router navigates to `/offerings`.

### Step 2: OfferingsPage Loads and Calls fetchAllProviders

`OfferingsPage.jsx` receives `userAddress` and `geocodeData` as props. On mount:

1. Extracts coordinates from `geocodeData.coordinates` → `[lat, lng]`
2. Sets the Leaflet map center to those coordinates
3. Calls `fetchAllProviders(address, coordinates, geocodeData)` from `multiProviderApi.js`

### Step 3: Strategy 0 — FCC BDC Database Pipeline

Inside `fetchAllProviders()`, **Strategy 0** runs first:

1. Calls `lookupByCoordinates(lat, lon)` from `broadbandPipelineApi.js`
2. This sends: `GET /api/broadband/by-coordinates?lat=37.386052&lon=-122.083851`
3. The Vite dev server proxy forwards this to `http://localhost:3001/api/broadband/by-coordinates?...`

### Step 4: Backend Receives the Request

The Express server's `broadband.js` router handles `GET /by-coordinates`:

1. **Parses** `lat` and `lon` from query parameters, validates they're numbers
2. Calls `getCensusBlockByCoordinates(lat, lon)` from `censusBlock.js`

### Step 5: Census Block FIPS Lookup

`censusBlock.js` converts coordinates to a 15-digit Census Block FIPS code:

1. **Cache check**: Looks up `"37.386052,-122.083851"` in the `census_block_cache` MongoDB collection. If found and not expired, returns immediately.
2. **Census Bureau API call** (on cache miss):
   ```
   GET https://geocoding.geo.census.gov/geocoder/geographies/coordinates
       ?x=-122.083851&y=37.386052
       &benchmark=Public_AR_Current
       &vintage=Census2020_Current
       &format=json
   ```
   Note: The Census Bureau uses `x` for longitude and `y` for latitude.
3. **Response parsing**: Extracts the GEOID from `result.geographies["Census Blocks"][0].GEOID`. Example: `"060855012003005"`.
4. **FIPS decomposition**:
   - `stateFips` = `06` (California)
   - `countyFips` = `06085` (Santa Clara County)
   - `tractFips` = `06085501200`
   - `blockGeoid` = `060855012003005`
5. **Cache store**: Saves the result to MongoDB with a 7-day TTL (fire-and-forget).
6. Returns the result to the broadband route handler.

### Step 6: State Coverage Check

Back in the route handler:

1. Extracts `stateFips` from the census block result (`"06"`)
2. Looks it up in `config.coveredStates`: `{ '06': 'California', '13': 'Georgia', '17': 'Illinois', '36': 'New York', '48': 'Texas' }`
3. If the state is **not** in the map, returns a 200 response with `{ covered: false, message: "We currently cover CA, GA, IL, NY, TX..." }` and the frontend falls through to Strategy 1
4. If covered (California = yes), proceeds to the database query

### Step 7: PostgreSQL Query

`availability.js` queries the `block_availability` table:

1. **Cache check**: Looks up `"060855012003005:res"` in the `availability_cache` MongoDB collection.
2. **SQL query** (on cache miss):
   ```sql
   SELECT brand_name, provider_id, technology, technology_name,
          max_download, max_upload, serves_residential,
          serves_business, low_latency
   FROM block_availability
   WHERE block_geoid = $1 AND serves_residential = TRUE
   ORDER BY max_download DESC
   ```
   The `$1` is a parameterized placeholder — the actual value `060855012003005` is passed separately, preventing SQL injection. The query uses the `idx_block_geoid` index and typically completes in under 10ms.
3. **Result grouping**: Rows are grouped by `brand_name`. For example, AT&T might have both a Fiber row (5000/5000 Mbps) and a DSL row (100/20 Mbps). These become two entries under a single provider object.
4. **Cache store**: Saves the grouped result to MongoDB with a 1-hour TTL.
5. Returns:
   ```json
   {
     "providers": [
       {
         "name": "AT&T Inc.",
         "providerId": "130077",
         "services": [
           { "technology": "Fiber to the Premises (FTTP)", "maxDownloadMbps": 5000, "maxUploadMbps": 5000, "lowLatency": true },
           { "technology": "Copper Wire (DSL)", "maxDownloadMbps": 100, "maxUploadMbps": 20, "lowLatency": false }
         ]
       }
     ],
     "totalProviders": 2,
     "totalServices": 4,
     "queryTimeMs": 3
   }
   ```

A second query runs in parallel via `getBlockSummary()` to get aggregate stats (provider count, max speed, technology flags).

### Step 8: Response Assembly

The route handler assembles the full JSON response:

```json
{
  "coordinates": { "lat": 37.386052, "lon": -122.083851 },
  "censusBlock": "060855012003005",
  "state": "06",
  "stateName": "California",
  "covered": true,
  "providers": [ ... ],
  "totalProviders": 2,
  "totalServices": 4,
  "summary": { "providerCount": 2, "maxDownloadAvailable": 5000, "hasFiber": true, ... },
  "dataSource": "fcc-bdc-database",
  "dataAsOf": "2026-03-03",
  "pipelineTimeMs": 723
}
```

### Step 9: Frontend Transforms the Response

Back in the frontend, `broadbandPipelineApi.js`'s `transformPipelineToPlans()` converts the backend response into plan cards:

1. Iterates over each provider and each service within it
2. Formats speeds (5000 Mbps → "5 Gbps")
3. Estimates a price range based on speed tier (FCC data has no pricing)
4. Generates feature bullets based on technology type
5. Assigns a color per provider (AT&T = blue, Comcast = purple, etc.)
6. Sets `source` to `"FCC BDC Data (2026-03-03)"`

### Step 10: UI Renders the Results

`OfferingsPage.jsx` receives the plan array:

1. Stores plans in `offerings` state, triggers a re-render
2. Renders a paginated grid of plan cards (6 per page)
3. Each card shows: provider name, technology, speed, estimated price, features, and data source
4. The Leaflet map centers on the user's coordinates with a marker

### Step 11: Reviews and Chatbot (Parallel)

After plans are loaded, two more things happen:

1. **Reviews**: `fetchMultipleProviderReviews()` is called with the unique provider names and coordinates. For each provider, it searches Google Places for `"{provider} store"` nearby, fetches reviews, and caches them to MongoDB via the `/api/cache/reviews/:key` endpoint. Results appear in the `ReviewsSection` component.

2. **Chatbot**: The `ChatbotWidget` receives the full plan list and reviews as context. Its Gemini system prompt instructs it to make recommendations based on the actual data shown to the user.

### Complete Request Timeline

For a typical lookup (backend warm, Census API responsive):

| Step | Time | Cumulative |
|------|------|------------|
| Frontend geocoding (autocomplete) | 0ms (already done) | 0ms |
| `/by-coordinates` request sent | ~5ms | 5ms |
| Census Bureau API call | ~500-1500ms | ~1000ms |
| PostgreSQL query (indexed) | ~3-10ms | ~1010ms |
| Block summary query | ~3-10ms | ~1015ms |
| JSON serialization + response | ~2ms | ~1017ms |
| Frontend transform + render | ~10ms | ~1027ms |

On **subsequent lookups** for the same or nearby address, the Census Bureau and PostgreSQL results are served from MongoDB cache, bringing the total pipeline time down to ~50-100ms.

### Data Flow Diagram

```
User types "1600 Amphitheatre Pkwy, Mountain View, CA"
    |
    v
[SearchPage.jsx] Google Autocomplete → lat: 37.386, lon: -122.084
    |
    v
[App.jsx] stores userAddress + geocodeData in state, navigates to /offerings
    |
    v
[OfferingsPage.jsx] calls fetchAllProviders(address, [37.386, -122.084], geocodeData)
    |
    v
[multiProviderApi.js] Strategy 0: lookupByCoordinates(37.386, -122.084)
    |
    v
[broadbandPipelineApi.js] GET /api/broadband/by-coordinates?lat=37.386&lon=-122.084
    |                                                    (Vite proxy → localhost:3001)
    v
[server/routes/broadband.js] parses lat/lon
    |
    v
[censusBlock.js] MongoDB cache check → miss → Census Bureau API
    |  GET https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=-122.084&y=37.386&...
    |  Response: GEOID = "060855012003005"
    |  → Cache to MongoDB (7-day TTL)
    v
[broadband.js route] state "06" → config.coveredStates → "California" ✓
    |
    v
[availability.js] MongoDB cache check → miss → PostgreSQL query
    |  SELECT ... FROM block_availability WHERE block_geoid = '060855012003005'
    |    AND serves_residential = TRUE ORDER BY max_download DESC
    |  → 4 rows returned in 3ms
    |  → Grouped into 2 providers with their services
    |  → Cache to MongoDB (1-hour TTL)
    v
[broadband.js route] assembles JSON { covered: true, providers: [...], summary: {...} }
    |
    v
[broadbandPipelineApi.js] transformPipelineToPlans() → array of plan card objects
    |
    v
[OfferingsPage.jsx] renders plan cards + map + reviews + chatbot
```
