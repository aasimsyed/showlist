#!/bin/bash
# Run the app locally for testing on a physical device via Expo Go (QR code).
# Usage: ./scripts/run-local.sh
#        ./scripts/run-local.sh --tunnel   (use tunnel if phone and computer are on different networks)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Use deployed API by default (no EXPO_PUBLIC_API_URL = showlist-proxy worker)
# To point at a local worker: EXPO_PUBLIC_API_URL=http://YOUR_IP:8787 npx expo start
if [ "$1" = "--tunnel" ]; then
  echo "Starting Expo with tunnel (QR code works from any network)..."
  npx expo start --tunnel
else
  echo "Starting Expo (scan QR with Expo Go; phone and computer must be on same WiFi for LAN)..."
  echo "If the QR code doesn't connect, run: ./scripts/run-local.sh --tunnel"
  npx expo start
fi
