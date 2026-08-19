# Deploying the Cloudflare Worker

This app expects the Worker at:

`https://showlist-proxy.aasim-ss.workers.dev`

`npm run deploy` **refuses to publish** if Wrangler is logged into a different Cloudflare account (for example `yourfrugalfriendetsy`).

## Prerequisites

1. The Cloudflare account that owns the `aasim-ss` workers.dev subdomain
2. Node.js 18+

## One-time: bind this repo to the correct Cloudflare login

If you use multiple Cloudflare accounts on this machine, create a named auth profile and bind it to `backend/`:

```bash
cd backend
npx wrangler auth create showlist-aasim
# Sign in with the account that owns *.aasim-ss.workers.dev
npx wrangler auth activate showlist-aasim .
npx wrangler whoami --json
```

Confirm the workers.dev subdomain is `aasim-ss`:

```bash
npm run deploy:check
```

Optional hard pin: put that account’s ID in `wrangler.toml` as `account_id = "..."` (see comment in the file).

## Step-by-Step Deployment

### 1. Login (if not using a bound profile)

```bash
cd backend
npx wrangler login
```

Sign in with the **aasim-ss** account, not another project’s Cloudflare login.

### 2. Deploy the Worker

```bash
npm run deploy
```

This runs the account check, then `wrangler deploy`.

### 3. Confirm the URL

Deploy output should show:

```
https://showlist-proxy.aasim-ss.workers.dev
```

The mobile app already defaults to that URL in `src/utils/constants.ts`.

### 5. (Optional) Set Gemini API key for artist-genre fallback

The `/api/artist-genre?artist=...` endpoint uses MusicBrainz first, then **Google Gemini** when no tags are found. To enable Gemini:

```bash
cd backend
npx wrangler secret put GEMINI_API_KEY
```

Paste your Gemini API key when prompted. **Do not commit the key to the repo.** If the secret is not set, the endpoint still works using only MusicBrainz.

### 6. Test the API

```
https://showlist-proxy.aasim-ss.workers.dev/api/events
https://showlist-proxy.aasim-ss.workers.dev/api/artist-genre?artist=Black%20Pumas
```

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

### "Cloudflare account check failed" / wrong workers.dev subdomain
- You are logged into a different Cloudflare account than `aasim-ss`
- Run `npx wrangler auth create showlist-aasim`, sign in to the aasim-ss account, then `npx wrangler auth activate showlist-aasim .`
- Or `npx wrangler logout` and `npx wrangler login` with the correct account
- Verify with `npm run deploy:check`

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

```bash
npm run deploy
```

## Viewing Logs

```bash
npx wrangler tail
```

## Cloudflare Dashboard

- Go to: https://dash.cloudflare.com
- Navigate to "Workers & Pages"
- Find "showlist-proxy"
