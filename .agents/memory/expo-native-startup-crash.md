---
name: Expo native module startup crashes
description: Native modules that auto-init at app startup crash a standalone Android build (~2s after launch) if their app.json plugin/config is missing, even when JS wraps require() in try/catch.
---

# Expo native module startup crashes (~2s after launch)

A standalone Android (EAS) build that opens then closes ~2 seconds later is almost
always a **native module that auto-initializes during `Application.onCreate()`** and
finds its required build-time config missing. The crash happens in native code
*before* any JS runs, so JS-level `try/catch` around `require(...)` does NOT protect
against it.

**Why:** `expo run`/Metro in dev links modules differently and tolerates missing
config; the release build embeds config into the AndroidManifest / google-services
at build time. If the config isn't in `app.json`, the manifest is incomplete and the
native SDK throws on init.

**How to apply:** For each native dep in `package.json`, confirm its required
`app.json` config exists before building. Two that have bitten this project:

- `react-native-google-mobile-ads` → needs a plugin entry with the AdMob App ID:
  `["react-native-google-mobile-ads", {"androidAppId": "ca-app-pub-...~..."}]`.
  Having the App ID only hardcoded in JS (e.g. ad-manager.ts) is NOT enough.
- `@react-native-firebase/app` + `/crashlytics` → need (1) `android.googleServicesFile:
  "./google-services.json"`, (2) `@react-native-firebase/app` plugin, (3) the
  crashlytics plugin, and (4) `expo-build-properties`. A valid google-services.json
  sitting in the repo does nothing until referenced from app.json.

General rule: a native module being present in deps + lazy-required in JS does not
mean it's configured. Audit plugins vs. native deps when chasing a startup crash.
