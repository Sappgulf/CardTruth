# iPhone implementation and verification limits

## Included source

The app now uses AVFoundation JPEG capture, a live camera preview, a permission prompt, explicit front/back review, retake and cancellation paths, and a bundled WKWebView inspector. Captured JPEGs are passed to the same local JavaScript image pipeline used by the standalone app. The report export bridge writes a protected temporary JSON file and opens the system share sheet.

The camera controller serializes session mutation, guards overlapping captures, identifies delegate results by capture ID, and times out a capture that never finishes. Native UI rejects an unusable image before accepting it. Scene changes stop the camera and permit a restart. The pure Swift state machine prevents empty photos and advancing without review.

No ARKit/LiDAR, RAW reconstruction, GradeRig BLE, optical calibration or automatic physical-defect measurement is active. Removing dormant demo controllers was preferable to pretending those features were connected.

## Build on a Mac

From the repository root:

```sh
python3 tools/build_standalone.py
cd apps/ios
xcodegen generate
open CardTruth.xcodeproj
```

Install XcodeGen in your own Mac development environment if needed. Select your signing team and a unique bundle identifier in Xcode, then build for an actual iPhone. The project targets iOS 18+. The bundle contains the generated CardTruth.html resource; no network model or secret key is required.

Pure Swift flow tests can be run separately:

```sh
swift test --package-path apps/ios
```

## What was actually verified

The eight pure Swift capture-flow tests were compiled and run on Linux with Swift 6.2.1. Platform source files passed Swift syntax parsing. Neither step compiles AVFoundation, UIKit, SwiftUI or WebKit against the iOS SDK. No signed IPA, simulator camera test or physical iPhone run was produced.

The JavaScript native-input bridge accepted synthetic JPEG front/back frames and rejected malformed input in Chromium. The real WKWebView bridge still needs device verification.

## Required device checks before calling the iOS app ready

Check fresh permission grant/denial, no-camera environments, front/back orientation, focus and crop behavior, interruption/background return, rapid repeated capture, capture timeout, large JPEG memory pressure, retake after back capture, native-to-inspector transfer, importing a saved report, share-sheet export, report reopening, JavaScript confirmation dialogs, accessibility text sizes and VoiceOver.

Safari and WKWebView are separate test targets. HEIC/photo-picker behavior and camera-file inputs should be verified by device/OS version, not assumed from Chromium success.
