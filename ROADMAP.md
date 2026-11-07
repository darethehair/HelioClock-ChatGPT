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

## Existing experimental baseline (through Version 12)

The experimental application already contains: Sun events and annual twilight chart, interactive Earth map with NASA Blue Marble imagery and multiple projections, polar and rectangular sky views, catalogue stars to magnitude 7 and constellation-line toggle, sky daylight/black modes, local/UTC/LMST displays, sidereal-day stepping, Moon image with approximate illumination and horizon orientation, inner/outer schematic orrery through Neptune with optional labeled AU rings, PWA/offline distribution, full-screen panels, and persistent time dock.

**These exist but are not yet scientifically validated to precision-ephemeris standards.** Some computations (Moon, planets, star positions and sidereal time) use approximations.

## Priority A: Scientific foundations and review

- [ ] **Comprehensive original-versus-experimental feature inventory.** Inspect all relevant source/components and build a traceable comparison: present, partial, absent, and proposed new. Distinguish source-only capabilities from verified UI behaviour.
- [ ] **Astronomical accuracy inspector.** Document algorithms and references; compare positions/events with a high-precision reference across locations, centuries, polar regions, leap years and DST cases. Display accuracy class/limitations in the UI.
- [ ] **Precession-aware coordinate pipeline (required).** Preserve catalogue coordinates in J2000/ICRS; transform to requested epoch with a documented IAU-compatible precession model. Apply consistently to star points, constellation lines, equator/ecliptic grids, the celestial poles and sidereal coordinate transformations.
- [ ] **Nutation and sidereal frame consistency.** Make clear whether time is mean or apparent sidereal; use matching coordinate frames and Earth orientation equations.
- [ ] **Stellar proper motion**, particularly important for historical/future epoch exploration. Include catalogue provenance and missing-data handling.
- [ ] **Optional refinements:** annual aberration, topocentric parallax, atmospheric refraction and extinction. Distinguish geometric from apparent horizon positions.
- [ ] **Improve planetary and lunar ephemerides.** Current schematic/circular orbits and simplified lunar model should not be represented as precise. Seek a compact offline high-quality solution before implementing conjunction or observing alerts.
- [ ] **Define date range.** JS Date has limitations for ancient dates, BCE labels and astronomical year numbering. Decide on robust Julian Date/time-scale handling for epochs spanning millennia.

## Priority B: Enhanced sky observatory

- [ ] **Milky Way overlay — user requested.** Independent controls for (a) outline, (b) softly shaded brightness, and (c) galactic-centre marker. Use actual galactic coordinates and an appropriately licensed map/model; project into both polar and rectangular sky views.
- [ ] **Lighting interaction.** In black-sky mode show full Milky Way overlay; attenuate/hide it as computed twilight/daylight brightens. Allow explicit override for education.
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

1. Audit and accuracy/reference-model selection; publish gap report before adding more major astronomy.
2. Precession/time-frame foundations and tests.
3. Milky Way layers and epoch-compatible sky drawing.
4. Time-lapse + motion trails + tracking/retrograde demonstration.
5. Event finder + timeline + explanation mode.
6. Continuous visual, mathematical, accessibility, Firefox, PWA/offline and performance verification.

## Collaboration and testing

The user directs priorities and judges ergonomics/appearance. ChatGPT should also **proactively propose** useful features based on architecture and scientifically valid combinations, not merely wait for user prompts. Never overwrite the original Google AI Studio repository. For each iteration: identify the scope, commit only to this repository, run CI/Firefox tests, and report what was actually verified versus what remains approximate.
