# App icon in App Store Connect (Apps list)

The icon shown under **My Apps** and on the App Store comes from your **build’s asset catalog**, not from a separate upload in App Store Connect.

## 1. Build script (already in place)

Your `scripts/build-and-submit-ios.sh` runs `scripts/ensure-app-icon-1024.js` **after** `expo prebuild`. That script:

- Copies `assets/icon.png` (1024×1024) into the generated `AppIcon.appiconset`
- Ensures `Contents.json` includes an **ios-marketing** 1024×1024 entry (the “App Store iOS well”)

So every local build should include the correct App Store icon.

## 2. Verify in Xcode (before archiving)

After running prebuild (or the full build script), open the project in Xcode and confirm the icon is set:

1. **Open the workspace**
   - `cd ios && open ShowlistAustin.xcworkspace` (or open `ios/ShowlistAustin.xcworkspace` from Finder).

2. **Open the AppIcon asset**
   - In the Project navigator (left), expand **ShowlistAustin** → **Images.xcassets** → **AppIcon**.

3. **Check the 1024×1024 slot**
   - You should see an **“App Store”** or **“1024pt”** well with your icon.
   - If it’s empty or has a warning:
     - Drag your 1024×1024 PNG (`assets/icon.png`) onto that well, or
     - Re-run the build script so `ensure-app-icon-1024.js` runs again after prebuild.

4. **No extra icon keys in Info.plist**
   - Select the **ShowlistAustin** target → **Info** tab.
   - Under “Custom iOS Target Properties” there should be **no** `CFBundleIconFiles` / `CFBundleIcons` / `UILaunchImages` overriding the asset catalog. Let the asset catalog provide the icon.

5. **Archive and upload**
   - Product → **Archive**, then **Distribute App** → **App Store Connect** → Upload.
   - After the build is processed (often 10–30 minutes), the icon should appear under **Apps** and on the store listing.

## 3. If the icon still doesn’t show under Apps

- **Wait for processing**  
  New builds can take a while to update the app-level icon in App Store Connect.

- **Use a new build**  
  Upload a **new** build (new build number) after the script and Xcode checks; don’t rely on an old IPA.

- **Confirm in the IPA**  
  After archiving, you can “Show in Finder” the archive, right‑click → **Show Package Contents** → **Products/Applications/ShowlistAustin.app** → **AppIcon.appiconset** and confirm the 1024×1024 image and `Contents.json` with `"idiom": "ios-marketing"` are present.
