# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Backend (Cloudflare Worker)

```bash
cd backend
npm install
wrangler login
wrangler publish
```

Copy the deployed worker URL (e.g., `https://showlist-proxy.YOUR-SUBDOMAIN.workers.dev`)

### 3. Configure API Endpoint

Update `src/utils/constants.ts`:

```typescript
export const API_BASE_URL = 'https://showlist-proxy.YOUR-SUBDOMAIN.workers.dev';
```

Or create a `.env` file:

```bash
cp .env.example .env
# Edit .env and add your API URL
```

### 4. Run the App

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser

## Development

### Running on Device

1. Install Expo Go app on your phone
2. Scan QR code from `npm start` output
3. App will load on your device

### Building for Production

#### iOS
```bash
eas build --platform ios
```

#### Android
```bash
eas build --platform android
```

## Troubleshooting

### "Network error" on startup
- Check that your Cloudflare Worker is deployed and accessible
- Verify the API_BASE_URL in constants.ts
- Check worker logs: `wrangler tail`

### Events not loading
- Check browser/network console for errors
- Verify the worker is parsing HTML correctly
- Check austin.showlists.net hasn't changed structure

### CORS errors
- The worker includes CORS headers automatically
- If issues persist, check worker code

## Next Steps

1. Test all features (swipe, search, links)
2. Customize colors/branding if needed
3. Add app icons and splash screens
4. Prepare for App Store submission
