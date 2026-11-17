# TrackFit Dynamic Island — Xcode Simulator Guide (Free Apple ID)

**Package note:** `@capacitor-community/live-activities` is not the package this app uses.  
TrackFit already depends on **`@hassankbrian/capacitor-live-activity`** (Capacitor 7–compatible). The API below matches that plugin. Do **not** install a second Live Activity package.

**Paid Apple Developer account is NOT required for Simulator.**  
Use a free Apple ID in Xcode → Signing & Capabilities → Team (Personal Team).

**Critical:** In the Xcode toolbar device menu, pick an **iPhone 15 Pro**, **iPhone 16 Pro**, or **iPhone 17 Pro** Simulator.  
Non‑Pro simulators have **no Dynamic Island** — the Live Activity will only show on the Lock Screen (if at all).

---

## 0. Prerequisites (Mac)

```bash
cd "/path/to/Food Tracking app/client"
npm install --legacy-peer-deps
npm run build:ios
npx cap add ios   # skip if ios/ already exists
npx cap sync ios
open ios/App/App.xcworkspace
```

If CocoaPods prompts appear:

```bash
cd ios/App && pod install && cd ../..
open ios/App/App.xcworkspace
```

Always open **`App.xcworkspace`**, not `App.xcodeproj`.

---

## 1. Xcode target setup (Widget Extension, no paid provisioning)

1. Xcode → open `client/ios/App/App.xcworkspace`.
2. Menu: **File → New → Target…**
3. Choose **Widget Extension** → Next.
4. Configure:
   - **Product Name:** `TrackFitWidget`
   - **Team:** your free Personal Team (Apple ID)
   - **Language:** Swift
   - Check **Include Live Activity**
   - Uncheck **Include Configuration App Intent** (if shown)
5. Finish → when asked **Activate scheme?** → **Activate**.
6. In the scheme/device control at the top of Xcode, select:
   - Scheme: **App** (the main TrackFit app, not only the widget)
   - Destination: **iPhone 15 Pro** (or newer Pro) Simulator

### Signing without a paid account

For **both** targets (`App` and `TrackFitWidget`):

1. Select the target → **Signing & Capabilities**
2. Enable **Automatically manage signing**
3. Team = **Personal Team**
4. Ignore “paid provisioning” warnings for **Simulator** runs — Simulator does not need a paid profile.

### Replace generated widget code with TrackFit sources

Xcode creates placeholder Swift files under `TrackFitWidget/`. Replace them as follows:

| Paste into (Xcode file) | Source in repo |
|-------------------------|----------------|
| Keep / replace attributes file | `native/ios-live-activity/GenericAttributes.swift` |
| Widget Live Activity UI | `native/ios-live-activity/TrackFitLiveActivityWidget.swift` |
| `@main` WidgetBundle | `native/ios-live-activity/TrackFitLiveActivityBundle.swift` |

**Important:** `GenericAttributes.swift` must be in the **TrackFitWidget** target (Target Membership checked).  
It must match the Capacitor plugin’s model (`id`, `staticValues`, `State.values`).

Delete Xcode’s default `*LiveActivity.swift` / sample `Attributes` if they conflict (duplicate `ActivityAttributes` or duplicate `@main`).

---

## 2. Info.plist — `NSSupportsLiveActivities`

### Main App target

Open **App → Info** (or `ios/App/App/Info.plist`) and ensure:

```xml
<key>NSSupportsLiveActivities</key>
<true/>
```

This is already present in the repo’s `Info.plist`. Confirm in Xcode:

1. Select **App** target → **Info** tab  
2. If missing: click **+** → custom key `Supports Live Activities` / `NSSupportsLiveActivities` → Type **Boolean** → **YES**

### Widget target

In `TrackFitWidget/Info.plist`, Live Activity support is implied by the Widget Extension + Live Activity template. No paid capability is required for Simulator.

---

## 3. Swift — Dynamic Island UI

### File: `GenericAttributes.swift`  
**(Target membership: TrackFitWidget — and must stay identical to the plugin)**

```swift
import ActivityKit
import Foundation

struct GenericAttributes: ActivityAttributes {
    public typealias ContentState = State

    public struct State: Codable, Hashable {
        var values: [String: String]
    }

    var id: String
    var staticValues: [String: String]
}
```

### File: `TrackFitLiveActivityWidget.swift`  
**(This is the Live Activity UI — Dynamic Island + Lock Screen)**

Paste the full contents from:

`client/native/ios-live-activity/TrackFitLiveActivityWidget.swift`

That file already defines:

- Lock Screen presentation  
- Dynamic Island **compactLeading** (timer icon)  
- **compactTrailing** (native `Text(timerInterval:countsDown:)` countdown)  
- **minimal**  
- **expanded** leading / trailing / bottom  
- Reads `endsAt` / `endsAtEpoch` from the JS plugin so the countdown keeps running without JS ticks  

### File: `TrackFitLiveActivityBundle.swift`  
**(Entry point — only one `@main` in the widget target)**

```swift
import SwiftUI
import WidgetKit

@main
struct TrackFitLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    TrackFitLiveActivityWidget()
  }
}
```

If Xcode left another `@main` struct in the widget target, remove it or you will get a compile error.

---

## 4. React / frontend trigger

TrackFit already wires this when a set is auto-saved:

`ExerciseSetCard` → `onSetLogged` → `WorkoutPanel` starts rest →  
`restBackgroundTimer.js` → `startRestLiveActivity()` in `restLiveActivity.js`.

### Core Live Activity API (`client/src/services/restLiveActivity.js`)

```js
import { Capacitor } from '@capacitor/core';
import { LiveActivity } from '@hassankbrian/capacitor-live-activity';

const ACTIVITY_ID = 'trackfit-rest-timer';

export async function startRestLiveActivity({ seconds, exerciseName }) {
  if (Capacitor.getPlatform() !== 'ios') return false;
  try {
    const available = await LiveActivity.isAvailable();
    if (!available) return false;

    const endsAtMs = Date.now() + Math.max(0, seconds) * 1000;

    await LiveActivity.startSingleActivity({
      id: ACTIVITY_ID,
      attributes: {
        type: 'rest-timer',
        exercise: exerciseName ?? 'Rest',
      },
      contentState: {
        title: 'Rest',
        status: '1:00', // display hint; Island uses endsAt for real countdown
        message: exerciseName ? `Next: ${exerciseName}` : 'Break between sets',
        endsAt: new Date(endsAtMs).toISOString(),
        endsAtEpoch: String(Math.floor(endsAtMs / 1000)),
      },
      timestamp: Math.floor(Date.now() / 1000),
    });
    return true;
  } catch {
    return false;
  }
}

export async function endRestLiveActivity() {
  if (Capacitor.getPlatform() !== 'ios') return;
  try {
    await LiveActivity.endActivity({
      id: ACTIVITY_ID,
      contentState: {
        title: 'Rest',
        status: '0:00',
        message: 'Ready for next set',
        endsAt: new Date().toISOString(),
        endsAtEpoch: String(Math.floor(Date.now() / 1000)),
      },
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch {
    // already ended
  }
}
```

### When a set is logged (already in app)

In `WorkoutPanel.jsx`, after a successful set save:

```js
setTimer({ seconds: restSeconds /* 60 or 90 */, exerciseName });
```

`RestTimerOverlay` then:

1. Calls `startBackgroundRestTimer` → starts the Live Activity with **now + restSeconds**  
2. When the countdown hits 0 (or Skip): calls `endRestLiveActivity()` so the Island dismisses  

To force a 60s rest for testing, set Rest to **60s** on the Train screen before checking a set.

---

## 5. Run & verify on Simulator

1. Xcode destination: **iPhone 15 Pro** (or newer Pro) Simulator ← required for Dynamic Island  
2. Scheme: **App**  
3. Press **Run** (▶)  
4. In TrackFit → Train → log a set (checkmark)  
5. Look at the **Dynamic Island** at the top of the simulator (timer icon + countdown)  
6. Optional: lock the simulator (**Device → Lock**) to see the Lock Screen Live Activity  
7. When time reaches 0, the activity should end automatically  

### If Island does not appear

| Check | Fix |
|-------|-----|
| Simulator is non‑Pro | Switch to **iPhone 15 Pro** / **16 Pro** |
| Wrong scheme | Run **App**, not only `TrackFitWidget` |
| `isAvailable()` false | Settings → Face ID & Passcode → Live Activities On; reboot simulator |
| Duplicate `@main` / Attributes | Clean widget target; keep only TrackFit Swift files above |
| Stale web bundle | `npm run build:ios && npx cap sync ios` then Run again |

---

## 6. What free account + Simulator cannot do

- Install a GitHub Actions **unsigned** IPA on a physical iPhone  
- Guaranteed Background Modes / push-to-start Live Activities (not needed for this local timer)  
- Testing on a **physical** iPhone beyond free Personal Team limits (7‑day cert) — Simulator is the reliable free path  

For this Option 1 goal: **Xcode + iPhone 15 Pro Simulator + Widget Extension + existing React trigger is enough.**
