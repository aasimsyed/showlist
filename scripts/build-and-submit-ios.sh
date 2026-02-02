#!/bin/bash
# Automated iOS build and TestFlight submission (no EAS, no Xcode GUI)
# Usage: ./scripts/build-and-submit-ios.sh
#        ./scripts/build-and-submit-ios.sh --build-only  (skip upload)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
BUILD_DIR="$IOS_DIR/build"
ARCHIVE_PATH="$BUILD_DIR/showlistaustin.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"
IPA_PATH="$EXPORT_DIR/showlistaustin.ipa"

# Load env from .env.build if present
if [ -f "$PROJECT_DIR/.env.build" ]; then
  set -a
  source "$PROJECT_DIR/.env.build"
  set +a
fi

# Required: Apple Team ID (10 chars, e.g. K5A25879TB)
TEAM_ID="${APPLE_TEAM_ID:-}"

# For upload: App Store Connect API Key (recommended for automation)
# Create at: App Store Connect → Users and Access → Keys
API_KEY_ID="${APP_STORE_CONNECT_API_KEY_ID:-}"
API_ISSUER_ID="${APP_STORE_CONNECT_ISSUER_ID:-}"
API_KEY_PATH="${APP_STORE_CONNECT_API_KEY_PATH:-}"  # Path to .p8 file

# Alternative: Apple ID + app-specific password (if no API key)
APPLE_ID="${APPLE_ID:-}"
APP_SPECIFIC_PASSWORD="${APP_SPECIFIC_PASSWORD:-}"

BUILD_ONLY=false
for arg in "$@"; do
  [ "$arg" = "--build-only" ] && BUILD_ONLY=true
done

echo "=== iOS Build & TestFlight Script ==="
echo "Project: $PROJECT_DIR"
echo ""

# Step 0: Increment build number in app.json
cd "$PROJECT_DIR"
BUILD_NUM=$(node -e "
  const fs = require('fs');
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const current = parseInt(app.expo?.ios?.buildNumber || '1', 10);
  const next = current + 1;
  app.expo.ios = app.expo.ios || {};
  app.expo.ios.buildNumber = String(next);
  fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
  console.log(current + ' -> ' + next);
")
echo "[1/7] Incremented build number: $BUILD_NUM"

# Commit the version bump so it's included when you push
NEW_NUM="${BUILD_NUM##* -> }"
git add app.json
git diff --cached --quiet || git commit -m "Bump iOS build number to $NEW_NUM"

# Step 2: Prebuild
echo "[2/7] Running expo prebuild..."
cd "$PROJECT_DIR"
npx expo prebuild --platform ios --clean

# Step 2: Pod install
echo "[3/7] Installing CocoaPods dependencies..."
cd "$IOS_DIR"
pod install
cd "$PROJECT_DIR"

# Detect scheme and workspace (.xcworkspace is a directory; use -d so ls gives path not contents)
WORKSPACE=$(ls -d "$IOS_DIR"/*.xcworkspace 2>/dev/null | head -1)
[ -z "$WORKSPACE" ] && { echo "Error: No .xcworkspace found in ios/"; exit 1; }
WORKSPACE_NAME=$(basename "$WORKSPACE" .xcworkspace)

SCHEME="$WORKSPACE_NAME"

echo "Workspace: $WORKSPACE_NAME"
echo "Scheme: $SCHEME"
echo ""

# Step 3: Require Team ID for archive
if [ -z "$TEAM_ID" ]; then
  echo "Error: APPLE_TEAM_ID is required."
  echo "Create .env.build with:"
  echo "  APPLE_TEAM_ID=K5A25879TB"
  echo ""
  echo "Find your Team ID: developer.apple.com/account → Membership"
  exit 1
fi

# Step 4: Create ExportOptions.plist
echo "[4/7] Creating export options..."
EXPORT_PLIST="$BUILD_DIR/ExportOptions.plist"
mkdir -p "$BUILD_DIR"

cat > "$EXPORT_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>teamID</key>
  <string>$TEAM_ID</string>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
EOF

# Step 5: Archive
echo "[5/7] Building archive (this may take several minutes)..."
xcodebuild -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  archive

# Step 6: Export IPA
echo "[6/7] Exporting IPA..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST"

# Find the exported IPA (name may vary)
EXPORTED_IPA=$(find "$EXPORT_DIR" -name "*.ipa" 2>/dev/null | head -1)
[ -z "$EXPORTED_IPA" ] && { echo "Error: No IPA found in $EXPORT_DIR"; exit 1; }

echo ""
echo "Build complete. IPA: $EXPORTED_IPA"
echo ""

if [ "$BUILD_ONLY" = true ]; then
  echo "Skipping upload (--build-only)."
  echo "To submit: Open Transporter app, drag $EXPORTED_IPA"
  exit 0
fi

# Step 7: Upload to TestFlight
echo "[7/7] Uploading to TestFlight..."

UPLOAD_SUCCESS=false

if [ -n "$API_KEY_ID" ] && [ -n "$API_ISSUER_ID" ] && [ -n "$API_KEY_PATH" ] && [ -f "$API_KEY_PATH" ]; then
  echo "Using App Store Connect API Key..."
  if xcrun altool --upload-app \
    --type ios \
    --file "$EXPORTED_IPA" \
    --apiKey "$API_KEY_ID" \
    --apiIssuer "$API_ISSUER_ID" \
    --apiKeyPath "$API_KEY_PATH"; then
    UPLOAD_SUCCESS=true
  fi
elif [ -n "$APPLE_ID" ] && [ -n "$APP_SPECIFIC_PASSWORD" ]; then
  echo "Using Apple ID..."
  if xcrun altool --upload-app \
    --type ios \
    --file "$EXPORTED_IPA" \
    --username "$APPLE_ID" \
    --password "$APP_SPECIFIC_PASSWORD"; then
    UPLOAD_SUCCESS=true
  fi
else
  echo "No upload credentials configured."
  echo ""
  echo "Add to .env.build (choose one):"
  echo ""
  echo "Option A - App Store Connect API Key (recommended):"
  echo "  APP_STORE_CONNECT_API_KEY_ID=xxxxx"
  echo "  APP_STORE_CONNECT_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  echo "  APP_STORE_CONNECT_API_KEY_PATH=/path/to/AuthKey_xxxxx.p8"
  echo ""
  echo "Option B - Apple ID + app-specific password:"
  echo "  APPLE_ID=your@email.com"
  echo "  APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx"
  echo ""
fi

if [ "$UPLOAD_SUCCESS" = true ]; then
  echo ""
  echo "Upload complete. Build will appear in TestFlight in 10-30 minutes."
else
  echo ""
  echo "Upload skipped or failed. Submit manually:"
  echo "  1. Open Transporter app (Mac App Store)"
  echo "  2. Drag: $EXPORTED_IPA"
  echo "  3. Click Deliver"
fi
