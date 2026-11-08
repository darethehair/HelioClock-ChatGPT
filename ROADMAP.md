# HelioClock-ChatGPT: Consolidated Development Roadmap

**Status:** Planning document, first recorded 2026-11-07.  
**Scope:** Experimental repository `darethehair/HelioClock-ChatGPT` only.  
**Safety rule:** Never modify `darethehair/HelioClock` (the original Google AI Studio application). Treat it as read-only reference material.

This file records requested and independently proposed capabilities, their relationships, and outstanding verification work. It is **not** a claim that proposed features are implemented. Update it after each substantial design decision or release.

## Guiding principles

1. **Scientific correctness before spectacle.** State the frame, time standard, epoch, accuracy, and approximations used.
2. **Coherent simulation.** Date, time, location, and ephemerides should drive every view from shared state.
3. **Works offline.** Deliver one directly extractable GitHub Actions artifact ZIP, installable as a PWA or on a static Apache directory.
4. **Usable in Firefox.** Keep automated browser checks; verify actual rendering, interactions and calculations against trusted references.
5. **Preserve choice.** Hideable overlays, adjustable limits, full-screen panels, and persistent time controls.
6. **Distinct from source.** Audit the original application thoroughly, then make independent implementation choices. No writes to the original.
7. **Avoid feature bloat.** Stage capabilities and measure performance, complexity and usefulness.

## Existing experimental baseline (through Version 18)

The experimental application already contains: Sun events and annual twilight chart, interactive Earth map with NASA Blue Marble imagery and multiple projections, polar and rectangular sky views, catalogue stars to magnitude 7 and constellation-line toggle, sky daylight/black modes, local/UTC/LMST displays, sidereal-day stepping, Moon image with approximate illumination and horizon orientation, inner/outer schematic orrery through Neptune with optional labeled AU rings, PWA/offline distribution, full-screen panels, and persistent time dock.

**These exist but are not yet scientifically validated to precision-ephemeris standards.** Some computations (Moon, planets, star positions and sidereal time) use approximations.

## Completed Version 18 refinements (requested 2026-11-08)

- [x] **Daylight-year graph contrast:** Replace the pale green daylight-duration line with a thicker, high-contrast dark blue/navy line visible across the light-blue daylight band; preserve twilight layers and clear labeling.
- [x] **Solar nadir on Earth maps:** Show the subsolar zenith and antipodal nadir markers, with distinctive symbols/labels in the supported map projections; ensure globe back-side occlusion is respected.

## Version 20 release milestones

- [x] Display v20 in main header and persistent/fullscreen observation dock; embed version, UTC build date and commit hash in offline metadata.
- [x] Credit “Created by Darethehair with assistance from ChatGPT”, link the experiment's GitHub repository, and acknowledge NASA imagery, D3-Celestial/Vieira and Astronomy Engine.
- [x] Add optional mean ecliptic-of-date overlay in polar and full-altitude rectangular views.
- [x] Show Sun/Moon alt/az and equatorial RA/Dec, plus Moon distance and illuminated fraction.
- [x] Replace the Moon's previous few-term geocentric model and mean-phase estimates with MIT-licensed Astronomy Engine topocentric ephemerides and phase calculations, with eclipse-era regression tests.
- [ ] Follow-up: precision review of sidereal frame, atmospheric refraction and lunar image orientation, and rigorous ephemeris comparison across epochs and observer locations.

## Priority A: Scientific foundations and review

- [ ] **Optional later original-versus-experimental feature inventory.** Not a prerequisite for current HelioClock development: the user has already requested the missing functionality they can identify. Revisit only if a specific parity gap arises or a comparison becomes useful. **For future rebuilds of existing applications, a thorough source-and-user-experience audit should be Step 1, before implementation.**
- [ ] **Astronomical accuracy inspector.** Document algorithms and references; compare positions/events with a high-precision reference across locations, centuries, polar regions, leap years and DST cases. Display accuracy class/limitations in the UI.
- [x] **Initial precession toggle for sky views (Version 13).** Keep the source star catalogue at J2000 and optionally transform stars, bright-star labels, and constellation-line vertices to mean equator/equinox of date with the documented IAU 1976 classical precession polynomial. Default on; off preserves the legacy J2000 plotting. Tested at J2000 and ±100 years. **Not a precision or long-millennia model.**
- [ ] **Full precession-aware coordinate pipeline (later).** Upgrade to a modern IAU 2006-compatible model with consistent frame handling across future celestial pole, equator/ecliptic grids, Epoch Explorer, and any further layers. Current sky-toggle implementation is initial, not complete, and does not model proper motion or nutation.
- [ ] **Nutation and sidereal frame consistency.** Make clear whether time is mean or apparent sidereal; use matching coordinate frames and Earth orientation equations.
- [ ] **Stellar proper motion**, particularly important for historical/future epoch exploration. Include catalogue provenance and missing-data handling.
- [ ] **Optional refinements:** annual aberration, topocentric parallax, atmospheric refraction and extinction. Distinguish geometric from apparent horizon positions.
- [ ] **Improve planetary and lunar ephemerides.** Current schematic/circular orbits and simplified lunar model should not be represented as precise. Seek a compact offline high-quality solution before implementing conjunction or observing alerts.
- [ ] **Define date range.** JS Date has limitations for ancient dates, BCE labels and astronomical year numbering. Decide on robust Julian Date/time-scale handling for epochs spanning millennia.

## Completed SChronos-inspired visual upgrade (Version 17)

- [x] Full rectangular sky chart spanning +90° to −90° altitude with a prominent horizon line, black below the horizon, and optional below-horizon stars and Sun/Moon trails.
- [x] Sun-centred illustrative radial glow, adapting the SChronos PyCairo concept for an offline browser canvas, with automatic day/twilight fade and azimuth-seam continuity.
- [x] Retain polar compass and separate pure-black mode, white magnitude-scaled stars, sidereal steps and optional precession.
- [ ] Additional SChronos concepts for future iteration: ecliptic overlay, richer event annotations, seasonal solar paths, and refined typography to avoid crowded labels.

## Completed Version 19 Milky Way refinement

- [x] Replace the uniform galactic-plane glow with subtle, nested, irregular neutral-grey fills taken directly from the published five-level Vieira contours, including interior polygon holes.
- [x] Rename the setting to **Milky Way shading** and preserve separate outline and galactic-centre controls.
- [x] Retain the full-sphere rectangular sky, polar compass, epoch precession toggle, daylight dimming, and below-horizon visibility. Browser checks confirm actual even-odd contour fills.

## Priority B: Enhanced sky observatory

- [x] **Milky Way overlay (Version 18).** Independent controls for (a) published five-level Vieira brightness outlines (D3-Celestial/BSD), (b) illustrative galactic-plane glow, and (c) galactic-centre marker. Both polar and rectangular projections; optional precession and below-horizon mode. **Glow is artistic, not photometric.**
- [x] **Initial lighting interaction (Version 18).** Black-sky mode shows the Milky Way at full overlay strength; daylight mode attenuates it as the solar altitude rises. Explicit brightness override is still a future option.
- [ ] **Precession-aware sky and constellation lines.** Ensure catalogued positions, stick figures, galactic overlay and pole are transformed in one consistent reference-frame pipeline.
- [ ] **Celestial motion trails.** Trace apparent Sun, Moon and planet motion over a configurable interval. Offer horizon/RA-Dec/heliocentric reference frames and selectable trace lengths. Clearly label approximate versus validated trajectories.
- [ ] **Epoch Explorer.** Explore changes in the celestial pole and approximate pole stars in historical/future skies, with accuracy warnings for long time horizons.

## Priority C: Interactive astronomical laboratory

- [ ] **Time-lapse laboratory.** User-selectable hours/days/sidereal days/months/years per simulated step; pause, reset, direction and speed. Preserve current user-facing UTC/local time conventions.
- [ ] **Object lock/tracking.** Fix a selected celestial body in the viewport to demonstrate relative and retrograde motion.
- [ ] **Retrograde-motion demonstration.** Show apparent geocentric loops against stars alongside the heliocentric explanation. Build on improved ephemerides, not current circular-orbit schematics.
- [ ] **Offline explanation mode.** Short context-dependent text about sidereal versus solar days, lunar phases, twilight, seasonal changes and planetary motions, grounded in active simulation state; no chatbot service required.

## Priority D: Observation and event planning

- [ ] **Astronomical event finder.** Search upcoming windows for selected location, e.g. long astronomical darkness, Moon availability after sunset, favourable Venus altitude, dark sky intervals and conjunctions (subject to validated ephemerides).
- [ ] **Celestial event timeline.** Solstices, equinoxes, lunar phases, conjunctions and optional meteor-shower peak dates. Click an event to synchronize all views and the time dock.
- [ ] **Planner ergonomics.** Helpful local legal time display with explicit IANA zone selection when the observation location differs from the computer location. Distinguish estimated events and precise alerts.

## Deferred / excluded

- **Do not implement split-screen sky comparison** (the earlier proposed Idea #1): user declined it. Existing ± sidereal day stepping serves that teaching objective.
- Avoid presenting visually attractive but unvalidated results as observatory-grade measurements.

## Suggested implementation sequence

1. Scientific accuracy/reference-model selection and targeted validation; do not delay current work for a comprehensive feature-parity audit.
2. Precession/time-frame foundations and tests.
3. Milky Way layers and epoch-compatible sky drawing.
4. Time-lapse + motion trails + tracking/retrograde demonstration.
5. Event finder + timeline + explanation mode.
6. Continuous visual, mathematical, accessibility, Firefox, PWA/offline and performance verification.

## Lessons for future app-reconstruction projects

**First step before writing code:** Examine the existing app comprehensively (source, rendered UI, interactions, calculations and deployment), produce a capability inventory, and agree on which features to preserve, improve or omit. This is a lesson for **future** projects, not a prerequisite for continuing this already mature HelioClock experiment.

## Collaboration and testing

The user directs priorities and judges ergonomics/appearance. ChatGPT should also **proactively propose** useful features based on architecture and scientifically valid combinations, not merely wait for user prompts. Never overwrite the original Google AI Studio repository. For each iteration: identify the scope, commit only to this repository, run CI/Firefox tests, and report what was actually verified versus what remains approximate.
