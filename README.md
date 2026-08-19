# Showlist Austin Mobile App

A React Native mobile application for displaying live music events from [austin.showlists.net](https://austin.showlists.net).

## Features

- 📅 **Day Navigation**: Swipe or tap arrows to navigate between days
- 🔍 **Search**: Real-time search by artist or venue name
- 🔄 **Pull to Refresh**: Refresh event data with pull-to-refresh
- 📍 **Map Integration**: Tap map pin icons to open venue locations in Google Maps
- 🔗 **Event Links**: Tap artist names to open event/ticket pages
- 💾 **Offline Support**: Cached data available when offline
- 🎨 **Design Match**: Matches the original website design exactly

## Tech Stack

- **React Native** with **Expo**
- **TypeScript** for type safety
- **Cloudflare Workers** for backend API proxy
- **AsyncStorage** for local caching
- **React Navigation** for navigation (future)
- **React Native Gesture Handler** for swipe gestures

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- Cloudflare account (for backend deployment)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Cloudflare Worker:**
   ```bash
   cd backend
   npm install -g wrangler
   wrangler login
   wrangler publish
   ```
   
   Copy the worker URL and update `src/utils/constants.ts`:
   ```typescript
   export const API_BASE_URL = 'https://your-worker.workers.dev';
   ```

3. **Run the app:**
   ```bash
   npm start
   ```
   
   Then press `i` for iOS simulator or `a` for Android emulator.

## Project Structure

```
showlist-austin/
├── src/
│   ├── components/      # React components
│   ├── screens/         # Screen components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities and constants
├── backend/             # Cloudflare Worker
│   └── src/
│       └── index.js     # Worker code
└── App.tsx              # App entry point
```

## Backend Deployment

The Cloudflare Worker parses HTML from austin.showlists.net and serves it as JSON.

### Deploy to Cloudflare:

```bash
cd backend
wrangler publish
```

### Environment Variables:

Update `backend/wrangler.toml` if needed for production settings.

## Configuration

### API Endpoint

Update the API URL in `src/utils/constants.ts`:

```typescript
export const API_BASE_URL = 'https://your-worker.workers.dev';
```

### Cache Duration

Adjust cache duration in `src/utils/constants.ts`:

```typescript
export const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
```

## Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web browser

### Code Style

- TypeScript strict mode enabled
- Follow React Native best practices
- Use functional components with hooks
- Maintain accessibility (a11y) standards

## Testing

### Manual Testing Checklist

- [ ] Swipe left/right works smoothly
- [ ] Arrow buttons disabled at boundaries
- [ ] All event links open correctly
- [ ] Map pins open Google Maps
- [ ] Search filters events in real-time
- [ ] Loading states show appropriately
- [ ] Error states display helpful messages
- [ ] Pull to refresh works
- [ ] App works offline with cached data

## Deployment

### iOS (App Store)

1. Build with EAS:
   ```bash
   eas build --platform ios
   ```

2. Submit to App Store Connect

Building and uploading to TestFlight without EAS (local `xcodebuild` + `altool`) is documented
in [`TESTFLIGHT_NO_EAS.md`](./TESTFLIGHT_NO_EAS.md).

### Android (Google Play)

1. Build with EAS:
   ```bash
   eas build --platform android
   ```

2. Upload to Google Play Console

## Legal & Attribution

- Data sourced from [austin.showlists.net](https://austin.showlists.net)
- Submit shows: [austin.showlists.net/submit/](https://austin.showlists.net/submit/)
- Support Showlist: [Patreon](https://www.patreon.com/showlistaustin)

## License

[Your License Here]

## Contributing

[Contributing Guidelines]

## Support

For issues or feature requests, please open an issue on GitHub.
