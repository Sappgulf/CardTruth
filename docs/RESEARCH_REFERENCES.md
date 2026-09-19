# Primary references reviewed September 19, 2026

These support the stated platform/standards facts, not performance claims for this application. Review date is not necessarily a policy-effective date.

- PSA grading standards: https://www.psacard.com/gradingstandards
  Current top-grade centering guidance and the important distinction between centering and overall condition/eye appeal.
- CGC card grading scale: https://www.cgccards.com/card-grading/grading-scale/
  Distinct Pristine 10 and Gem Mint 10 labels and the corresponding published guidance. Do not copy sports-card exceptions indiscriminately into TCG profiles.
- Beckett scale: https://www.beckett.com/grading/scale
  Redirected to https://maintenance.beckett.com/ during review. Numeric BGS references were therefore not embedded as verified current rules.
- Apple, Explore ARKit 4: https://developer.apple.com/videos/play/wwdc2020/10611/
  Scene-depth maps have lower spatial resolution than camera imagery, with reliability affected by reflective/absorbing surfaces. This is not a microscopic grading-accuracy specification.
- Apple AVCam: https://developer.apple.com/documentation/avfoundation/avcam-building-a-camera-app
  Reference for capture-session/photo architecture. Native source still requires iOS SDK compilation and device tests.
- Apple WKWebView async JavaScript: https://developer.apple.com/documentation/webkit/wkwebview/callasyncjavascript(_:arguments:in:in:completionhandler:)
  Reference for passing captured image data into the bundled inspector.
- OpenCV image transforms: https://docs.opencv.org/4.13.0/da/d54/group__imgproc__transform.html
  Perspective transforms are image geometry; they do not prove true card size or create optical resolution.
- FastAPI request files: https://fastapi.tiangolo.com/tutorial/request-files/
  The implemented inspect endpoint deliberately accepts bounded raw image bytes rather than browser multipart uploads.
- MDN camera access: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  Browser camera/security constraints. The released browser interface uses file input/capture hints, not an active getUserMedia/LiDAR pipeline.

The bundled Lambertian photometric solver is explicitly a mathematical research reference. No citation here should be read as validating its behavior on reflective Pokémon cards.
