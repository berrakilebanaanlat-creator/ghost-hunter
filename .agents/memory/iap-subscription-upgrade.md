---
name: IAP subscription base-plan upgrade (Google Play Billing)
description: Why monthly→yearly subscription switches need replacement params, and how to surface failures
---

# Switching base plans within the same subscription group (e.g. monthly → yearly)

Google Play Billing rejects a plain `requestPurchase` for a new base plan when the
user already owns another base plan in the SAME subscription group → returns
`E_ALREADY_OWNED`. You MUST pass the existing purchase's `purchaseToken` plus
`subscriptionProductReplacementParams` ({ oldProductId, replacementMode: 'with-time-proration' })
in the Android request. Find the active sub via `getAvailablePurchases()` and match a
different product id in the group.

**Why:** Without replacement params Billing never opens the Play sheet; the error was
silently swallowed (handler returned `false`), so the upgrade button looked dead — the
user's actual complaint.

**How to apply:** In ghost-hunter `lib/ad-context.tsx` `purchaseVoxWithIAP` builds the
google request with these fields. Same group = vox_monthly / vox_yearly.

# Surface purchase outcomes — never return bare boolean

Purchase helpers return a structured `PurchaseResult { ok, cancelled?, errorMessage? }`.
UI shows an Alert only when `!ok && !cancelled` (don't alert on user-cancel). A bare
boolean conflates cancel vs. real error and produces silent dead buttons.

**Gotcha:** `handlePurchaseVoxSubscription` only does the dev/emulator local-grant
fallback when `require('expo-iap')` itself throws (module missing). Real-device purchase
errors must NOT reach that fallback or they'd wrongly grant premium. Keep the require()
in its own try/catch, separate from the purchase call.
