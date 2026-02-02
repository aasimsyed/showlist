# Deploying the Cloudflare Worker

## Prerequisites

1. A Cloudflare account (free tier works fine)
   - Sign up at: https://dash.cloudflare.com/sign-up

## Step-by-Step Deployment

### 1. Login to Cloudflare

```bash
cd backend
npx wrangler login
```

This will open your browser to authenticate with Cloudflare. Click "Allow" to authorize.

### 2. Deploy the Worker

```bash
npx wrangler deploy
```

Or use the npm script:
```bash
npm run deploy
```

### 3. Get Your Worker URL

After deployment, you'll see output like:

```
✨  Success! Published showlist-proxy
   https://showlist-proxy.YOUR-ACCOUNT.workers.dev
```

**Copy this URL** - you'll need it for the next step.

### 4. Update the App Configuration

Edit `../src/utils/constants.ts` and update the API URL:

```typescript
export const API_BASE_URL = 'https://showlist-proxy.YOUR-ACCOUNT.workers.dev';
```

Replace `YOUR-ACCOUNT` with your actual subdomain from step 3.

### 5. Test the API

You can test the worker directly in your browser:

```
https://showlist-proxy.YOUR-ACCOUNT.workers.dev/api/events
```

You should see JSON data with events.

## Development Mode

To test locally before deploying:

```bash
npm run dev
```

This starts a local server (usually at `http://localhost:8787`).

## Troubleshooting

### "Authentication required"
- Run `npx wrangler login` again
- Make sure you're logged into Cloudflare in your browser

### "Worker name already exists"
- The worker name is set in `wrangler.toml`
- Either change the name or delete the existing worker from Cloudflare dashboard

### "Module not found" errors
- Make sure you're in the `backend` directory
- Run `npm install` if you haven't already

### CORS errors in the app
- The worker includes CORS headers automatically
- Make sure you're using the correct worker URL
- Check that the worker deployed successfully

## Updating the Worker

After making changes to `src/index.js`:

```bash
npx wrangler deploy
```

The update will be live within seconds.

## Viewing Logs

To see real-time logs from your worker:

```bash
npx wrangler tail
```

## Cloudflare Dashboard

You can also manage your worker from the Cloudflare dashboard:
- Go to: https://dash.cloudflare.com
- Navigate to "Workers & Pages"
- Find "showlist-proxy"
- View analytics, logs, and settings
