# Testing Guide - Google Maps Integration

This guide helps you test and verify that Google Maps functionality is working correctly.

## ✅ What I Fixed

### 1. Created .env File
- **Problem**: The `.env` file didn't exist - only `.env.example` had the API keys
- **Solution**: Created `.env` with your API keys from `.env.example`
- **Why**: Vite ONLY reads environment variables from `.env` file, not `.env.example`

### 2. Improved Autocomplete Script Loading
- **Problem**: The Google Maps script loading had race conditions and no `onload` handler
- **Solution**: Improved script loading with proper callbacks, better error handling, and mount guards
- **Features**:
  - Uses `onload` event instead of unreliable callback parameter
  - Prevents duplicate script loading
  - Better console logging with emoji indicators
  - Proper cleanup on unmount

### 3. Added API Key Validation
- **New File**: `src/utils/apiKeyValidator.js`
- **Purpose**: Validates API keys on app startup (development mode only)
- **Usage**: Automatically runs when you start the app, logs validation status to console

### 4. Fixed .gitignore
- **Problem**: `.env.example` was incorrectly ignored
- **Solution**: Removed `.env.example` from `.gitignore` so it can be committed as a template

## 🧪 How to Test

### Step 1: Open the Application
The dev server is already running at: **http://localhost:5173**

Open your browser and navigate to this URL.

### Step 2: Check Console for API Key Validation
Open browser DevTools (F12 or Cmd+Option+I) and check the Console tab.

You should see:
```
🚀 NetConnect AI - Development Mode
🔑 API Key Validation
  📍 Google Maps API:
    ✅ Configured (key starts with AIza...)
    📝 Key preview: AIzaSyDYDt...ELUQ

  🤖 Gemini AI API:
    ✅ Configured (key starts with AIza...)
    📝 Key preview: AIzaSyB-OS...n4Co

  📊 Summary:
    Google Maps: ✅
    Gemini AI: ✅
```

If you see ❌ marks, the API keys are not being read correctly.

### Step 3: Test Address Autocomplete
1. On the search page, make sure "Full Address" is selected (not ZIP Code Only)
2. Click on the address input field
3. Start typing an address (e.g., "123 Main St, New York")
4. **Expected**: You should see autocomplete suggestions appear below the input
5. **Console**: Look for these messages:
   - `📡 Loading Google Maps script with API key...`
   - `✓ Google Maps script loaded`
   - `✓ Google Places Autocomplete initialized successfully`

### Step 4: Select an Address
1. Select an address from the autocomplete dropdown
2. Click "Find Telecom Offerings" button
3. **Expected**: You should be redirected to the offerings page
4. **Console**: Look for:
   - `✓ Address selected from autocomplete: [address]`
   - `Using geocoded coordinates from SearchPage: [lat, lng]`

### Step 5: Verify Map Display
On the offerings page:
1. **Expected**: You should see an OpenStreetMap (Leaflet) showing your location
2. **Expected**: A marker should appear at your address location
3. The map should be centered on the correct coordinates

### Step 6: Check Google Places Reviews
Scroll down to the offerings cards:
1. **Expected**: Each provider should show a reviews section
2. **Console**: Look for:
   - `Fetching reviews for providers: [list]`
   - `Reviews loaded for X providers`

## 🔍 Troubleshooting

### Autocomplete Not Working

**Check 1: API Key Enabled Services**
Go to [Google Cloud Console](https://console.cloud.google.com/apis/library):
- Ensure these are ENABLED for your project:
  - ✅ Maps JavaScript API
  - ✅ Geocoding API
  - ✅ Places API

**Check 2: API Key Restrictions**
Go to [Credentials](https://console.cloud.google.com/apis/credentials):
- If you have API restrictions, make sure all 3 APIs above are allowed
- If you have HTTP referrer restrictions, add `http://localhost:5173`

**Check 3: Console Errors**
Look for these error messages:
- `❌ API request denied` → APIs not enabled or key restrictions
- `❌ Failed to load Google Maps script` → Network issue or invalid key
- `❌ Google Maps failed to load after 5 seconds` → Script loading timeout

### Map Not Showing Location

**Issue**: Map shows default location (NYC) instead of your address
- **Cause**: Geocoding failed, using fallback coordinates
- **Solution**: Check if API key has Geocoding API enabled

**Issue**: Map is blank or not loading
- **Cause**: This uses Leaflet/OpenStreetMap (not Google Maps), so it should always work
- **Solution**: Check browser console for errors related to Leaflet

### Reviews Not Loading

**Issue**: "No reviews available" shown for all providers
- **Cause 1**: CORS proxy (`api.allorigins.win`) might be down
- **Cause 2**: Places API not enabled or key restrictions
- **Console**: Check for errors in reviews fetching

## 🎯 Test Checklist

Use this checklist to verify everything works:

- [ ] ✅ API key validation shows green checkmarks in console
- [ ] ✅ Address input shows autocomplete suggestions when typing
- [ ] ✅ Selecting an autocomplete suggestion fills the input
- [ ] ✅ Clicking search button navigates to offerings page
- [ ] ✅ Map displays with marker at correct location
- [ ] ✅ Provider offerings are displayed
- [ ] ✅ Reviews sections show customer reviews (if available)
- [ ] ✅ AI chatbot button appears (bottom-right)

## 📝 Manual Testing Commands

If autocomplete still doesn't work, you can test the API directly:

### Test Geocoding API
Open browser console and run:
```javascript
fetch('https://maps.googleapis.com/maps/api/geocode/json?address=New+York&key=AIza....OELUQ')
  .then(r => r.json())
  .then(d => console.log(d))
```

Expected result: `status: "OK"` with geocoded results

### Test Places API
```javascript
fetch('https://maps.googleapis.com/maps/api/place/textsearch/json?query=verizon+store&location=40.7128,-74.0060&radius=5000&key=AIzaSyDYDtt9...3OELUQ')
  .then(r => r.json())
  .then(d => console.log(d))
```

**Note**: This will likely fail with CORS error in browser, which is expected. The app uses a CORS proxy to work around this.

## 🆘 Still Having Issues?

If things still don't work:

1. **Restart the dev server**: Stop it (Ctrl+C) and run `npm run dev` again
2. **Clear browser cache**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
3. **Check API quotas**: Make sure you haven't exceeded Google Maps API free tier
4. **Verify .env file**: Run `cat .env` to confirm keys are present
5. **Check browser network tab**: Look for failed requests to googleapis.com

## 📊 Expected Console Output

When everything works, you should see:
```
🚀 NetConnect AI - Development Mode
🔑 API Key Validation
  ✅ All keys configured

📡 Loading Google Maps script with API key...
✓ Google Maps script loaded
✓ Google Places Autocomplete initialized successfully
✓ Autocomplete enabled

Fetching plans from all providers for: [address]
Using geocoded coordinates from SearchPage: [lat, lng]
✓ Final result: X plans from [source]

Fetching reviews for providers: [list]
Reviews loaded for X providers
```

## 🎉 Success Indicators

Your Google Maps integration is working if:
1. Typing in the search box shows address suggestions
2. Selecting a suggestion auto-fills the address
3. The map on the offerings page shows your location accurately
4. Reviews appear for major providers (AT&T, Verizon, etc.)
