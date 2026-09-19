# GradeRig controller: protocol proposal only

No executable controller firmware, wired lighting fixture, BLE service or hardware connection is included in release 0.2. The active app does not present a working GradeRig button.

A future transport should identify hardware revision, firmware revision and calibration record; explicitly acknowledge all-off/dark state and each selected illumination channel; report readiness before exposure; detect disconnects; enforce thermal/current limits; and fail with lights off. LED timing, camera timing and exposure metadata need to be associated with every image.

A valid command acknowledgement is not proof of correct irradiance. Hardware acceptance requires measured optical/radiometric behavior and safe failure tests, as described in docs/GRADERIG.md. Do not substitute a simulated acknowledgement for a real connection.
