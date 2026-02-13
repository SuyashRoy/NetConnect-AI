# NetConnect AI - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Copy Environment File
```bash
cp .env.example .env
```

Your `.env` file now contains:
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDYDtt9HZq5nY-WHvyHTKSBMQo223OELUQ
VITE_GEMINI_API_KEY=AIzaSyB-OSlvfqDdDZHzAMVofucIwIuJle7n4Co
```

✅ **Note**: These are your actual API keys from `.env.example`

### Step 2: Enable Google Cloud APIs

Go to [Google Cloud Console](https://console.cloud.google.com/) and enable:

1. **Maps JavaScript API**
2. **Geocoding API**
3. **Places API**

All three are needed for your Google Maps API key to work fully.

### Step 3: Run the App
```bash
npm run dev
```

Open http://localhost:5173 and enjoy! 🎉

---

## ✨ Features to Try

### 1. Address Autocomplete (NEW!)
- Start typing an address
- See smart suggestions appear
- Select from dropdown

### 2. Multiple Providers
- View plans from 5 ISPs
- AT&T (real API data)
- Verizon, Xfinity, T-Mobile, Spectrum (mock data)

### 3. Customer Reviews
- Real Google Places reviews
- Star ratings
- Recent customer feedback

### 4. AI Chatbot Assistant
- Click "Ask AI Assistant" button
- Get personalized recommendations
- Ask about speed, price, features

---

## 🎯 Only 2 API Keys Needed!

| API Key | What It Does | Free Tier |
|---------|--------------|-----------|
| **Google Maps** | Geocoding + Autocomplete + Reviews | $200/month credit |
| **Gemini AI** | Smart chatbot recommendations | 1,500 requests/day |

**That's it!** Much simpler than the original 3-key setup.

---

## 📖 More Information

- **Full Documentation**: `README.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Migration Info**: `GOOGLE_MAPS_MIGRATION.md`

---

## ❓ Quick Troubleshooting

**Autocomplete not working?**
- Enable "Maps JavaScript API" in Google Cloud Console
- Restart dev server

**Geocoding failing?**
- Enable "Geocoding API" in Google Cloud Console
- App will fall back to mock geocoding

**Reviews not showing?**
- Enable "Places API" in Google Cloud Console
- Reviews hide silently if API unavailable

**Chatbot not appearing?**
- Check Gemini API key is valid
- Verify you haven't exceeded free tier (1500/day)

---

## 🎉 You're All Set!

Run `npm run dev` and explore your AI-powered broadband comparison platform!

**Pro Tip**: Try searching for "1600 Amphitheatre Parkway, Mountain View, CA" to see all features in action.
