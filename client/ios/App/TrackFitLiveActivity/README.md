# TrackFit Dynamic Island (Live Activity)

The JS library `@hassankbrian/capacitor-live-activity` is already in the app.  
Dynamic Island still needs this **Widget Extension** compiled into the iOS binary.

## One-time setup (Mac + Xcode)

```bash
cd client
npm install
npm run build:ios
npx cap add ios || true
npx cap sync ios
bash scripts/ios-enable-live-activities.sh
npx cap open ios
```

In Xcode:

1. Select the **App** target → Signing & Capabilities → choose your Team.
2. Select **TrackFitLiveActivity** → same Team.
3. Run on your **iPhone 17** (not Simulator for Dynamic Island).
4. Settings → Face ID & Passcode / Live Activities → allow TrackFit if prompted.

After a set is saved, rest should appear in the Dynamic Island and keep counting while you leave the app.

## Files

| File | Role |
|------|------|
| `GenericAttributes.swift` | Shared ActivityKit model (must match the Capacitor plugin) |
| `TrackFitLiveActivityWidget.swift` | Lock Screen + Dynamic Island UI + native countdown |
| `TrackFitLiveActivityBundle.swift` | WidgetKit entry point |
| `Info.plist` / entitlements | Extension metadata |
