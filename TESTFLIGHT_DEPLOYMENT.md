# TestFlight Deployment Guide

## Prerequisites

Before you begin, make sure you have:
- ✅ An Expo account (free tier works)
- ✅ An Apple Developer account ($99/year)
- ✅ Your app configured in App Store Connect
- ✅ EAS CLI installed

---

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

Verify installation:
```bash
eas --version
```

---

## Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials.

---

## Step 3: Configure Your App

The following files have been created/updated:
- `eas.json` - EAS Build configuration
- `app.json` - Updated with iOS build settings

**Important iOS Settings:**
- Bundle Identifier: `com.showlist.austin`
- Version: `1.0.0`
- Build Number: Auto-incremented by EAS

---

## Step 4: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Showlist Austin
   - **Primary Language**: English
   - **Bundle ID**: `com.showlist.austin` (must match app.json)
   - **SKU**: `showlist-austin-ios` (unique identifier)
   - **User Access**: Full Access
4. Click **"Create"**

**Note**: If you don't have a Bundle ID yet:
- Go to [Apple Developer Portal](https://developer.apple.com/account)
- Certificates, Identifiers & Profiles → Identifiers
- Click **"+"** → **"App IDs"** → **"App"**
- Description: `Showlist Austin`
- Bundle ID: `com.showlist.austin`
- Enable capabilities you need (Push Notifications, etc.)
- Register

---

## Step 5: Build for iOS

### Option A: Build and Submit Automatically (Recommended)

This builds and submits to TestFlight in one command:

```bash
eas build --platform ios --profile production --auto-submit
```

### Option B: Build First, Submit Later

**Build:**
```bash
eas build --platform ios --profile production
```

This will:
- Upload your code to EAS servers
- Build your app in the cloud
- Take 10-20 minutes
- Show you a build URL to track progress

**Wait for build to complete**, then submit:
```bash
eas submit --platform ios --latest
```

---

## Step 6: Configure Credentials (First Time Only)

On your **first build**, EAS will ask about credentials:

```
? How would you like to upload your credentials?
❯ Expo handles all credentials, you can still provide overrides
```

**Choose**: "Expo handles all credentials" (easiest option)

EAS will:
- Generate certificates automatically
- Manage provisioning profiles
- Store credentials securely

---

## Step 7: Wait for Build

The build process takes **10-20 minutes**. You can:
- Watch progress in terminal
- Visit the build URL shown
- Check status: `eas build:list`

When complete, you'll see:
```
✅ Build finished
```

---

## Step 8: Submit to TestFlight

If you used `--auto-submit`, this already happened!

Otherwise, submit manually:
```bash
eas submit --platform ios --latest
```

EAS will:
- Upload the build to App Store Connect
- Process takes 5-10 minutes
- Appears in TestFlight automatically

---

## Step 9: Configure TestFlight

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select **"Showlist Austin"** app
3. Click **"TestFlight"** tab
4. Wait for processing (can take 10-30 minutes)
5. Once processed, you'll see your build

---

## Step 10: Add Testers

### Internal Testers (Up to 100)
1. In TestFlight, click **"Internal Testing"**
2. Click **"+"** to add testers
3. Add email addresses of team members
4. They'll receive an email invitation

### External Testers (Up to 10,000)
1. Click **"External Testing"**
2. Click **"+"** → **"Create Group"**
3. Name it (e.g., "Beta Testers")
4. Add the build
5. Fill in required info:
   - **What to Test**: Description of features
   - **Feedback Email**: Your email
   - **Privacy Policy URL**: (if required)
6. Submit for Beta Review (takes 24-48 hours)
7. Once approved, add testers

---

## Step 11: Testers Install App

Testers will:
1. Receive email invitation
2. Install **TestFlight** app from App Store
3. Open email → Tap **"View in TestFlight"**
4. Tap **"Accept"** → **"Install"**
5. App installs like a normal app

---

## Updating Your App

For future updates:

1. **Update version** in `app.json`:
   ```json
   "version": "1.0.1"
   ```

2. **Build and submit**:
   ```bash
   eas build --platform ios --profile production --auto-submit
   ```

3. **New build appears in TestFlight** automatically

---

## Troubleshooting

### Build Fails
- Check build logs: `eas build:view [BUILD_ID]`
- Common issues:
  - Missing dependencies
  - TypeScript errors
  - Native module issues

### Submission Fails
- Check: `eas submit:view [SUBMISSION_ID]`
- Common issues:
  - Missing app information in App Store Connect
  - Invalid bundle identifier
  - Missing privacy policy (for external testing)

### App Not Appearing in TestFlight
- Wait 10-30 minutes for processing
- Check App Store Connect → TestFlight → Builds
- Ensure build status is "Ready to Submit"

### Credentials Issues
- Reset credentials: `eas credentials`
- Check certificates: `eas credentials:list`

---

## Useful Commands

```bash
# List all builds
eas build:list

# View build details
eas build:view [BUILD_ID]

# List submissions
eas submit:list

# View submission details
eas submit:view [SUBMISSION_ID]

# Check credentials
eas credentials

# Update app configuration
eas update:configure
```

---

## Build Profiles Explained

In `eas.json`, we have two profiles:

### `development`
- For development/testing
- Faster builds
- Can install on device via Expo Go

### `production`
- For TestFlight/App Store
- Full optimization
- Production certificates
- App Store distribution

---

## Next Steps After TestFlight

Once testing is complete:

1. **Prepare for App Store**:
   - Add screenshots
   - Write description
   - Set pricing
   - Configure app metadata

2. **Submit for Review**:
   - In App Store Connect
   - Click **"App Store"** tab
   - Fill in all required information
   - Submit for review

3. **Release**:
   - After Apple approval (usually 24-48 hours)
   - App goes live on App Store!

---

## Cost Breakdown

- **Expo EAS**: Free tier includes 30 builds/month
- **Apple Developer**: $99/year
- **TestFlight**: Free (included with Apple Developer)
- **App Store**: Free (included with Apple Developer)

---

## Support

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [Expo Discord](https://chat.expo.dev/)
- [Apple Developer Support](https://developer.apple.com/support/)
