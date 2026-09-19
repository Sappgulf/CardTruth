# GradeRig: research design, not validated hardware

## Scope

An optional fixed-camera, multi-illumination fixture could expose defects hidden in a single photograph. No physical fixture was built or tested for this release. No validated price, defect-size threshold, absolute height accuracy or grade-prediction performance is established.

## Keep the methods separate

Photometric stereo estimates orientation from changing illumination under assumptions about reflectance and calibration. Structured-light triangulation uses a calibrated projected pattern and different geometry. They are not interchangeable names. Moving a handheld phone through an orbit is not automatically a calibrated photometric-stereo dataset.

The bundled reference solver is a basic distant-light Lambertian model. Actual small-ring LEDs are near-field: light directions and intensity vary across the card. Holographic foil, gloss, printed texture, multilayer optical effects and specular highlights violate a simple diffuse model. Low numerical residual alone does not prove correct shape. Normal integration adds boundary, missing-data and drift problems. Never label the current solver's relative output as measured millimeter topography.

## Prototype optical sequence

A rigid phone/camera mount, repeatable non-abrasive card support and controlled ambient enclosure are proposed. Determine working distance from the actual lens, focus behavior and usable field of view. Do not force a nominal phone height across devices.

Start with individually controlled directional emitters at eight azimuths. Capture a dark frame, a diffuse reference and one exposure sequence per light with locked exposure/focus/white balance where supported. Characterize both parallel- and cross-polarized configurations: suppressing specular reflection can also remove diagnostically useful gloss information. Polarization is not a universal fix for foil.

Keep linear radiometric data for reconstruction. JPEG tone mapping, sharpening and denoising can bias measurements. The current native JPEG capture is evidence collection, not a validated RAW metrology path.

## Required calibration

- Camera intrinsics, distortion, focus and field scale at the actual working distance.
- Per-light spatial direction, intensity/falloff, exposure stability and thermal behavior.
- Flat-field and dark response; clipping/shadow/specular masks.
- Independent reference artifacts with known relief, followed by real card materials/finishes.
- Non-damaging reference measurements from an appropriate microscope/profilometer.

Printed fiducials can support alignment and scale, but an ordinary paper printer or 3D-printed relief is not automatically a traceable micro-height reference. Record calibration versions with every acquisition.

## Card safety

No rollers, adhesive, clamps or spring pressure on collectible edges. Use a clean, broad, non-abrasive support and avoid sliding the card into a tight recess. The operator handles the card. Do not assume the same support is suitable for warped, fragile or unusually sized cards. Dust control and gentle handling are part of the procedure.

## Acceptance testing

Compare known defects under repeated remounting, multiple operators and device models. Report detection and false positives by finish and physical size. Test foil separately. Separate repeatability from accuracy, and image sampling pitch from the actual resolved feature size. Explicitly abstain in shadowed, clipped or optically ambiguous regions.

Until these tests pass, the UI should show “extra-angle evidence” or “experimental reconstruction,” not a measured dent depth or defect confidence percentage.
