# Showlist Proxy - Cloudflare Worker

This Cloudflare Worker fetches HTML from austin.showlists.net, parses it, and serves structured JSON data to the mobile app.

## Setup

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Deploy the worker:**
   ```bash
   npm run deploy
   # or
   wrangler publish
   ```

4. **Get your worker URL:**
   After deployment, you'll get a URL like: `https://showlist-proxy.YOUR-SUBDOMAIN.workers.dev`

5. **Update the app:**
   Update `src/utils/constants.ts` in the main app with your worker URL:
   ```typescript
   export const API_BASE_URL = 'https://showlist-proxy.YOUR-SUBDOMAIN.workers.dev';
   ```

## Development

Run the worker locally:
```bash
npm run dev
# or
wrangler dev
```

## API Endpoint

- **GET** `/api/events` - Returns parsed event data

### Response Format:
```json
{
  "events": [
    {
      "date": "Saturday, January 24th 2026",
      "shows": [
        {
          "artist": "Artist Name",
          "venue": "Venue Name",
          "address": "123 Street",
          "eventLink": "https://...",
          "venueLink": "https://...",
          "mapLink": "https://goo.gl/maps/...",
          "time": "10:00pm"
        }
      ]
    }
  ],
  "lastUpdated": "2026-01-24T12:00:00Z"
}
```

## Caching

The worker uses Cloudflare's edge caching:
- Cache TTL: 5 minutes
- Automatic cache invalidation on updates

## Error Handling

The worker handles:
- Network timeouts
- Invalid HTML structure
- Empty responses
- Rate limiting

Errors are returned in this format:
```json
{
  "error": "Error message",
  "timestamp": "2026-01-24T12:00:00Z"
}
```
