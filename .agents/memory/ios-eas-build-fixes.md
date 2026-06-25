---
name: iOS EAS Build Fixes
description: Lessons from building Antik Ghost Hunter iOS IPA via EAS — pnpm lockfile, Firebase, entitlements, submit config
---

## lightningcss darwin binary missing on EAS

pnpm lockfile generated on Linux marks `lightningcss-darwin-arm64: '-'` (skipped). EAS runs on macOS ARM64 with `--frozen-lockfile` and won't install it.

**Fix:** Add explicit `optionalDependencies` to `artifacts/ghost-hunter/package.json`:
```json
"optionalDependencies": {
  "lightningcss-darwin-arm64": "1.32.0",
  "lightningcss-darwin-x64": "1.32.0"
}
```
Then run `CI=true pnpm install --no-frozen-lockfile` to update lockfile.

**Why:** `supportedArchitectures` in root package.json didn't work on Linux to include darwin packages.

## Firebase removal required

`@react-native-firebase/app` + `@react-native-firebase/crashlytics` v24 + `use_frameworks! :linkage => :static` + New Architecture (`newArchEnabled: true`) = unresolvable Xcode errors (non-modular headers cascade). Neither `$RNFirebaseAsStaticFramework = true` nor `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES` fully resolved it.

**Fix:** Remove Firebase packages entirely. They were not used in any TypeScript/TSX code. Also remove `useFrameworks: static` from `expo-build-properties` in app.json.

**Why:** Firebase was only installed, never imported. Removal is safe and eliminates all use_frameworks conflicts.

## aps-environment entitlement must be manually removed

`expo-notifications` plugin always adds `aps-environment: development` to `ios/AntikGhostApp/AntikGhostApp.entitlements`. The provisioning profile (`keystore/ios/app.mobileprovision`) does NOT include push notifications capability.

EAS uses the committed `ios/` directory directly (no prebuildCommand in eas.json). `withDangerousMod` and `withEntitlementsPlist` custom plugins don't remove it reliably.

**Fix:** After every `expo prebuild`, directly overwrite `ios/AntikGhostApp/AntikGhostApp.entitlements` with an empty dict:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
  </dict>
</plist>
```

**Why:** App only uses local notifications; APNs/remote push not needed. Provisioning profile lacks aps-environment and cannot be easily regenerated.

## EAS Submit configuration

Apple API key fields in `eas.json` submit profile:
```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6784369963",
        "ascApiKeyPath": "./secrets/apple-api-key.p8",
        "ascApiKeyId": "6K4GTUR7CD",
        "ascApiKeyIssuerId": "9cad8b69-6f83-4703-abff-ddfe05ea797a"
      }
    }
  }
}
```

Key file is at `artifacts/ghost-hunter/secrets/apple-api-key.p8`.
Bundle ID: `com.berrakilebanaanlat.paranormalhunter`
ASC App ID: `6784369963`

## Submission URL

https://expo.dev/accounts/antikghost/projects/paranormal-hunter/submissions/34d8630b-5bc2-4aac-9d6d-74a3e5ba508f
