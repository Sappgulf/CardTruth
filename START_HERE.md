# Your first inspection

## Open the app

On a Mac or Windows computer, open CardTruth.html in a normal browser. No Node, Python, account or API key is needed for the single-file path. Download/preview behavior depends on your browser and operating system. The preview inside this chat or a file-manager preview may not execute it.

The included platform launcher or `python launch.py` is an alternative. It starts a local-only page and opens your default browser. Photographs are still processed in the browser, not sent to that server.

On iPhone, the responsive web interface supports importing photos when opened as a normal web page in a compatible browser. An HTML attachment in Files is not a reliable app-installation method. An AVFoundation iPhone app is included as source, but no signed installable IPA or TestFlight build is included. Building it requires a Mac with Xcode, XcodeGen and your own signing setup. Safari, the camera picker and the native app still need physical-device testing.

## Inspect

1. Select **Try demo** to learn the controls, or load a clear front photo of your card. Use a dark matte background with all four corners visible. Keep sleeves, reflections and fingers out of the measurement area.
2. Check the proposed outer outline. Drag handles or use numeric coordinates. Align to the actual card edges, not an inner border or a sleeve. Confirm it.
3. Check the four inner border guides. Move them to the visible printed border boundary. A uniform border is required for a meaningful ratio. If the artwork is borderless or ambiguous, skip centering.
4. Review the ratios and placement-error sensitivity. A result near a threshold is displayed as boundary-uncertain rather than automatically passing.
5. Inspect enlarged corners and mark observations. Bright-spot suggestions need visual confirmation under other lighting; they are not automatically labeled damage. Additional angle images are evidence for manual review only.
6. Repeat for the back and open the report. Export it to keep the photos, notes and measurements together. Reopen the exported report to continue later.

## Important habits

The app works in memory and does not silently persist your collection. Export before closing, reloading or replacing an inspection. Keep your original photographs: reports contain resized/reoriented analysis copies, not the original camera files.

A saved SHA-256 checksum can detect ordinary changes to the exported JSON. It does not prevent a knowledgeable person from recomputing a checksum and does not authenticate the card, its owner or the capture time.

You can record a returned grading result in the report. It remains user-reported and does not automatically train a model.

## Troubleshooting

**No card outline found:** make the background simpler and darker, remove glare, or position the outline manually.

**White card edges show warnings:** white print and reflections can trigger clipping heuristics. Review the pixels and retake in diffuse light. Do not interpret that warning as a detected flaw.

**Centering is unavailable:** missing side, low resolution, dark/featureless frame, overlapping guides or an ambiguous border can block measurement. The app should keep it unknown rather than supply a number.

**HEIC fails:** browser HEIC support varies. Export a JPEG or PNG copy. The optional Python image endpoint accepts JPEG, PNG and WebP, not HEIC.

**Report rejected:** use a supported CardTruth inspection report. Legacy 0.2.0 reports remain readable; modified checksummed reports are rejected. Corrupt or modified reports do not replace the inspection already open.

**The app will not open from an attachment:** save it to a computer and use a normal browser or the local launcher. The package is not a remotely hosted site or signed phone app.
