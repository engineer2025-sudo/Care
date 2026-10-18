#!/bin/bash
# Run from any directory on a Mac. Does not modify signing or your device.
set -euo pipefail
IOS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "The iPhone compile check requires macOS and full Xcode. Run this on your Mac."
  exit 1
fi
if ! xcodebuild -version; then
  echo "Install full Xcode, open it once, and select it with xcode-select."
  exit 1
fi
python3 "$IOS_DIR/scripts/check_project.py"
swift test --package-path "$IOS_DIR/ActivityKit"
xcodebuild -resolvePackageDependencies -project "$IOS_DIR/CareSphere.xcodeproj" -scheme CareSphere
xcodebuild -project "$IOS_DIR/CareSphere.xcodeproj" -scheme CareSphere \
  -destination 'generic/platform=iOS' -configuration Debug \
  CODE_SIGNING_ALLOWED=NO build
printf '\nCompile check passed. Open CareSphere.xcodeproj, select your team and iPhone, then press Run.\n'
