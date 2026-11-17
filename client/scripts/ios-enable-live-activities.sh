#!/usr/bin/env bash
# Patches the Capacitor iOS app Info.plist so Live Activities / Dynamic Island are allowed.
# Run after `npx cap add ios` / `npx cap sync ios`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/ios/App/App/Info.plist"

if [[ ! -f "$PLIST" ]]; then
  echo "[live-activities] Info.plist not found at $PLIST — skip"
  exit 0
fi

if /usr/libexec/PlistBuddy -c 'Print :NSSupportsLiveActivities' "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c 'Set :NSSupportsLiveActivities true' "$PLIST"
else
  /usr/libexec/PlistBuddy -c 'Add :NSSupportsLiveActivities bool true' "$PLIST"
fi

echo "[live-activities] NSSupportsLiveActivities=true in $PLIST"
echo "[live-activities] Still required in Xcode (once): Widget Extension + copy GenericAttributes.swift + TrackFitLiveActivity*.swift from client/native/ios-live-activity/"
