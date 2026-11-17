#!/usr/bin/env bash
# Enables Dynamic Island / Live Activities for TrackFit iOS.
# Run on macOS after Capacitor iOS platform exists:
#   npx cap add ios && npx cap sync ios
#   bash scripts/ios-enable-live-activities.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d "ios/App/App.xcodeproj" ]]; then
  echo "[live-activities] iOS project missing. Run: npx cap add ios && npx cap sync ios"
  exit 1
fi

# Ensure the Capacitor Live Activity plugin is linked into the iOS app.
if [[ ! -d "node_modules/@hassankbrian/capacitor-live-activity" ]]; then
  echo "[live-activities] Installing @hassankbrian/capacitor-live-activity…"
  npm install @hassankbrian/capacitor-live-activity@^7.5.1 --legacy-peer-deps
  npx cap sync ios
fi

if ! command -v ruby >/dev/null 2>&1; then
  echo "[live-activities] ruby is required"
  exit 1
fi

if ! ruby -e "require 'xcodeproj'" 2>/dev/null; then
  echo "[live-activities] Installing xcodeproj gem…"
  gem install xcodeproj --no-document
fi

ruby scripts/setup-live-activity-extension.rb
echo "[live-activities] Done. Open Xcode (npx cap open ios), select your Team for App + TrackFitLiveActivity, then run on your iPhone 17."
