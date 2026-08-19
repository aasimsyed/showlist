# TestFlight Deployment Without EAS

This documents the successful, verified method for building and uploading `ShowlistAustin` to
TestFlight entirely on your own Mac, no `eas build`, no Expo servers, no Xcode GUI clicking.

Everything is driven by `./scripts/build-and-submit-ios.sh`, which wraps `expo prebuild`,
`xcodebuild archive`, `xcodebuild -exportArchive`, and `xcrun altool --upload-app`.

## One-time machine setup

1. **Full Xcode, not just Command Line Tools.**

   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   xcodebuild -runFirstLaunch
   ```

2. **iOS platform support installed** (device SDK, not just the simulator):

   ```bash
   xcodebuild -downloadPlatform iOS
   xcodebuild -showsdks   # confirm "iOS SDKs: iOS <version>" is listed
   ```

3. **CocoaPods**:

   ```bash
   brew install cocoapods
   ```

4. **Project dependencies**:

   ```bash
   npm install
   ```

## One-time Apple setup

1. **App Store Connect API key with the Admin role.**

   Users and Access -> Integrations -> App Store Connect API -> Generate API Key.

   The role matters: cloud-managed distribution signing (what lets `xcodebuild` create/fetch
   the Distribution certificate and App Store provisioning profile without ever signing into
   Xcode with an Apple ID) only works with an **Admin** key. `App Manager` or `Developer` role
   keys fail at export time with `Cloud signing permission error`, this is a hard Apple-side
   restriction, not a bug in the script.

   Download the `.p8` file once, Apple only lets you download it once, then store it **outside
   the git repo**:

   ```bash
   mkdir -p ~/Keys && chmod 700 ~/Keys
   mv ~/Downloads/AuthKey_<KEY_ID>.p8 ~/Keys/
   chmod 600 ~/Keys/AuthKey_<KEY_ID>.p8
   ```

   `*.p8` is in `.gitignore` as defense in depth, but keeping keys out of the repo directory
   entirely avoids relying on that.

2. **Fill in `.env.build`** (already gitignored) at the project root:

   ```bash
   APPLE_TEAM_ID=K5A25879TB
   APP_STORE_CONNECT_API_KEY_ID=VS289C599J
   APP_STORE_CONNECT_ISSUER_ID=040f4e49-6f5e-4068-97d9-ac4ff983b618
   APP_STORE_CONNECT_API_KEY_PATH=/Users/you/Keys/AuthKey_VS289C599J.p8
   ```

## Running a build

```bash
./scripts/build-and-submit-ios.sh
```

This does, in order:

1. Bumps `expo.ios.buildNumber` in `app.json` and commits it.
2. `npx expo prebuild --platform ios --clean`, regenerates `ios/` from scratch.
3. Ensures the 1024x1024 App Store icon is in the asset catalog.
4. Patches `ios/*.xcodeproj/project.pbxproj` (see below, why this is needed).
5. `pod install`.
6. `xcodebuild archive` with `-allowProvisioningUpdates` and the API key, so Xcode fetches/
   creates the needed certificate and provisioning profile itself.
7. `xcodebuild -exportArchive` to produce the `.ipa`, also with `-allowProvisioningUpdates`
   and the API key (needed a second time, for the Distribution cert specifically).
8. `xcrun altool --upload-app` to push the `.ipa` straight to App Store Connect.

Use `--build-only` to stop after step 7 and upload manually via the Transporter app instead.

Typical wall-clock time: 3-6 minutes once Xcode/SDKs are already set up (first run is longer
due to the one-time iOS platform download, ~8GB).

## Why the pbxproj patch (`scripts/patch-release-signing.js`) exists

Expo's prebuild template hardcodes `CODE_SIGN_IDENTITY[sdk=iphoneos*] = "iPhone Developer"` on
**both** Debug and Release configurations. With automatic signing, having any explicit identity
value there conflicts with the archive action wanting to sign for distribution:

```
error: ShowlistAustin has conflicting provisioning settings. ShowlistAustin is automatically
signed for development, but a conflicting code signing identity Apple Distribution has been
manually specified.
```

The fix is to strip the key from the Release configuration entirely (not set it to "Apple
Distribution", that's still a manual override and hits the same conflict). With no explicit
identity, automatic signing picks a Development cert for the archive step and then correctly
cloud-signs with a Distribution cert during export, matching what Xcode's GUI does internally
(the `.xcarchive` itself is Development-signed; the *export* step is what actually produces the
App Store-signed IPA).

Because `expo prebuild --clean` deletes and regenerates `ios/` every run, this patch has to run
after every prebuild, not just once. That's why it's step 2c of the script, not a one-off fix.

## Why `-allowProvisioningUpdates` is needed on both `archive` and `-exportArchive`

- On `archive`, it lets Xcode create a Development certificate/profile if one doesn't exist yet.
- On `-exportArchive`, it lets Xcode create the **Distribution** certificate/profile via cloud
  signing. Omitting it here is what produces `No signing certificate "iOS Distribution" found`.

## Why `altool` needs the key copied into `~/.appstoreconnect/private_keys/`

`xcrun altool --upload-app --apiKeyPath <path>` silently ignores `--apiKeyPath`. `altool` only
resolves API keys by filename convention (`AuthKey_<KEY_ID>.p8`) inside a fixed set of
directories, `~/.appstoreconnect/private_keys` being the reliable one. The script copies the
key there automatically before uploading; you don't need to do this by hand.

## Common errors and what they actually mean

| Error | Cause | Fix |
|---|---|---|
| `xcode-select: error: tool 'xcodebuild' requires Xcode` | Command Line Tools active, not full Xcode | `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |
| `A required plugin failed to load` | Xcode's first-launch setup never ran | `xcodebuild -runFirstLaunch` |
| `iOS <version> is not installed` | Device SDK missing (simulator-only Xcode install) | `xcodebuild -downloadPlatform iOS` |
| `No Accounts: Add a new account in Accounts settings` | No API key/auth flags passed to `xcodebuild` | Pass `-authenticationKeyPath/-authenticationKeyID/-authenticationKeyIssuerID` |
| `conflicting provisioning settings ... Apple Distribution has been manually specified` | An explicit `CODE_SIGN_IDENTITY` fights automatic signing | Remove the key instead of setting it (see pbxproj patch above) |
| `No signing certificate "iOS Distribution" found` (only on export) | Missing `-allowProvisioningUpdates` on the export step | Add it |
| `Cloud signing permission error` | API key role is not Admin | Generate a new key with the **Admin** role |
| `altool ... Failed to load AuthKey file` | `altool` ignores `--apiKeyPath` | Copy the `.p8` to `~/.appstoreconnect/private_keys/AuthKey_<ID>.p8` |

## Security notes

- The `.p8` file is a long-lived credential with account-wide power for whatever role it was
  granted. Treat it like a password: never commit it, store it with `chmod 600` outside the
  repo, and revoke it in App Store Connect if it's ever exposed.
- `.env.build` holds the Key ID and Issuer ID (not secret by themselves, but keep the file
  gitignored anyway since it also holds the local path to the key and, optionally, an
  app-specific password if you use the Apple ID fallback).
