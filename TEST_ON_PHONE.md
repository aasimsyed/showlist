# Testing on Your Phone

## Steps to Test on Your Real Phone

### 1. Install Expo Go App

**For iOS:**
- Open the App Store
- Search for "Expo Go"
- Install the app

**For Android:**
- Open Google Play Store
- Search for "Expo Go"
- Install the app

### 2. Start the Development Server

In your terminal, run:
```bash
cd /Users/aasimsyed/src/showlist
npx expo start
```

### 3. Connect Your Phone

**Option A: Scan QR Code (Recommended)**
- The terminal will show a QR code
- Open Expo Go app on your phone
- Tap "Scan QR Code"
- Point your camera at the QR code in the terminal
- The app will load on your phone

**Option B: Same WiFi Network**
- Make sure your phone and computer are on the same WiFi network
- In Expo Go app, tap "Enter URL manually"
- Enter the URL shown in the terminal (usually `exp://192.168.x.x:8081`)

**Option C: Tunnel (Works on Different Networks)**
- Press `s` in the terminal to switch to tunnel mode
- Scan the new QR code that appears

### 4. Troubleshooting

**If the app doesn't load:**
- Make sure both devices are on the same WiFi network
- Try using tunnel mode (press `s` in terminal)
- Check that your firewall isn't blocking port 8081
- Restart the Expo server

**If you see errors:**
- Check the terminal for error messages
- Make sure the API URL is correct in `src/utils/constants.ts`
- Verify the Cloudflare Worker is deployed and working

### 5. Development Tips

- Shake your phone to open the developer menu
- Press `r` in terminal to reload the app
- Press `m` to toggle menu
- Press `j` to open debugger

## Current API Configuration

Your app is configured to use:
- API URL: `https://showlist-proxy.aasim-ss.workers.dev`

This is already set in `src/utils/constants.ts`.
