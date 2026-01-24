# Quick Start: Deploy to TestFlight

## 🚀 Step-by-Step Commands

### 1. Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```
Enter your Expo account email and password.

### 3. Configure EAS Project (First Time Only)
```bash
eas build:configure
```
This will:
- Link your project to EAS
- Add a project ID to `app.json`
- Set up build configuration

### 4. Build for iOS Production
```bash
eas build --platform ios --profile production
```

**What happens:**
- EAS uploads your code
- Builds your app in the cloud (10-20 minutes)
- You'll see a build URL to track progress

**First time only:** EAS will ask about credentials:
```
? How would you like to upload your credentials?
❯ Expo handles all credentials, you can still provide overrides
```
**Choose the default option** (Expo handles credentials).

### 5. Wait for Build to Complete

Watch the terminal or visit the build URL. When done, you'll see:
```
✅ Build finished
```

### 6. Submit to TestFlight

**Option A: Auto-submit (Recommended)**
```bash
eas submit --platform ios --latest
```

**Option B: Build and submit in one command**
```bash
eas build --platform ios --profile production --auto-submit
```

**First time only:** EAS will ask for App Store Connect credentials:
- Apple ID (your developer account email)
- App-specific password (create at appleid.apple.com → Sign-In and Security → App-Specific Passwords)
- Or use App Store Connect API key (more secure)

### 7. Configure App in App Store Connect

**Before submitting, make sure:**

1. **Create App in App Store Connect:**
   - Go to https://appstoreconnect.apple.com
   - Click "My Apps" → "+" → "New App"
   - Fill in:
     - Platform: iOS
     - Name: Showlist Austin
     - Primary Language: English
     - Bundle ID: `com.showlist.austin`
     - SKU: `showlist-austin-ios`
   - Click "Create"

2. **Create Bundle ID (if needed):**
   - Go to https://developer.apple.com/account
   - Certificates, Identifiers & Profiles → Identifiers
   - Click "+" → "App IDs" → "App"
   - Description: Showlist Austin
   - Bundle ID: `com.showlist.austin`
   - Register

### 8. Wait for Processing

After submission:
- Build uploads to App Store Connect (5-10 minutes)
- Apple processes the build (10-30 minutes)
- Build appears in TestFlight tab

### 9. Add Testers

1. Go to App Store Connect → Your App → TestFlight
2. Click "Internal Testing" or "External Testing"
3. Add testers by email
4. They'll receive an invitation

---

## 📝 Important Notes

### Before Building

**Make sure you have:**
- ✅ Apple Developer account ($99/year)
- ✅ App created in App Store Connect
- ✅ Bundle ID created in Apple Developer Portal

### Icon & Assets (Optional but Recommended)

**For a polished app, create:**
- `./assets/icon.png` (1024x1024px, PNG, no transparency)
- `./assets/splash.png` (optional splash screen)

**Icon Requirements:**
- Size: 1024x1024 pixels
- Format: PNG
- No transparency
- No rounded corners (iOS adds them automatically)

**Note:** The build will work without these, but Expo will use a default icon. You can add them later and rebuild.

### Update `eas.json` (Optional)

If you want to auto-submit, update the submit section in `eas.json`:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-email@example.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABCD123456"
    }
  }
}
```

You can find these values in App Store Connect.

---

## 🔄 Future Updates

To update your app:

1. **Update version in `app.json`:**
   ```json
   "version": "1.0.1"
   ```

2. **Build and submit:**
   ```bash
   eas build --platform ios --profile production --auto-submit
   ```

3. **New build appears in TestFlight automatically**

---

## 🐛 Troubleshooting

### Build Fails
```bash
# View build logs
eas build:view [BUILD_ID]

# List all builds
eas build:list
```

### Submission Fails
```bash
# View submission details
eas submit:view [SUBMISSION_ID]

# List submissions
eas submit:list
```

### Check Credentials
```bash
eas credentials
```

---

## ✅ Checklist

Before building:
- [ ] EAS CLI installed
- [ ] Logged into Expo (`eas login`)
- [ ] App configured in App Store Connect
- [ ] Bundle ID created in Apple Developer Portal
- [ ] Icon file exists (`./assets/icon.png`)
- [ ] `eas.json` configured
- [ ] `app.json` has correct bundle identifier

Ready to build:
- [ ] Run `eas build --platform ios --profile production`
- [ ] Wait for build to complete
- [ ] Run `eas submit --platform ios --latest`
- [ ] Add testers in TestFlight

---

## 📚 Full Documentation

See `TESTFLIGHT_DEPLOYMENT.md` for detailed explanations of each step.
