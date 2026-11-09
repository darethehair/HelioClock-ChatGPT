# HelioClock — ChatGPT Independent Edition

An original, independently implemented astronomical dashboard, created for comparison with the Google AI Studio HelioClock project. **This repository must never write to or modify `darethehair/HelioClock`.**

## What it does

- Solar altitude and azimuth; sunrise, sunset, solar noon, daylight duration and equation of time.
- Interactive 24-hour annual solar ephemeris with sky-blue daylight, civil/nautical/astronomical twilight bands, sunrise/sunset contours, selected-date readout and date scrubbing. The vertical chart uses **local mean solar time**, not a guessed civil timezone.
- Interactive **NASA Blue Marble satellite-textured** Earth map with calculated daylight/twilight shading, Equal Earth / orthographic globe / Mercator projection tabs directly above the map, observer/subsolar markers, drag-pan, zoom buttons and wheel zoom.
- Two sky projections (polar and rectangular horizon) with Sun/Moon tracks, an offline J2000 star catalogue down to magnitude 7, optional constellation stick figures, configurable magnitude cutoff and bright-star names suppressed in faint-star mode. Both modes share sky illumination settings, magnification and rotation.
- Local mean sidereal time (LMST) in the sky panel and persistent time dock. Dedicated ±1 sidereal day controls advance 86,164.0905 seconds, keeping the stars nearly fixed while Sun/Moon positions progress. Ordinary ±1 day controls remain exactly 86,400 seconds.
- Moon phase and approximate synodic age, rendered as one centered antialiased disc (including correct high-DPI scaling).
- Schematic inner-planet orrery.
- Offline PWA with local files and no required backend.
- Browser-local clock and IANA time-zone identifier (with current UTC offset) shown beside UTC time, using the device's time-zone database.
- Fixed bottom simulation bar for changing dates and times while observing any panel; each graphics panel supports browser fullscreen.
- Lunar photograph zoom controls, plus schematic inner/outer orbital modes through Neptune.
- No runtime JavaScript framework or external API required. GitHub Actions uses npm/esbuild to bundle the map libraries and local world atlas directly into the ZIP; nothing needs installing on Apache.

## Download and deploy to Apache

1. Open **Actions → Build standalone PWA ZIP** in this repository.
2. Choose the latest successful workflow, then download the **HelioClock-ChatGPT-PWA** artifact.
3. Extract the downloaded ZIP **once** directly into the Apache directory that will serve the app, for example `/var/www/html/helioclock-chatgpt/`.
4. Browse to `https://darethehair.net/helioclock-chatgpt/`.

The GitHub artifact is already a ZIP containing `index.html`, `app.js`, and all other deployable files at its top level; there is **no nested ZIP**.

The ZIP uses relative resource paths, so it can be hosted at the domain root **or in any subdirectory**. HTTPS is required for geolocation and offline service-worker features (localhost is also allowed). On first load, the app caches its files for subsequent offline visits. The Google Fonts stylesheet is optional and falls back to system fonts when offline.

## Development

Run `npm install && npm run build` to bundle the app, then copy `index.html`, `styles.css`, `astronomy.js`, `manifest.webmanifest`, `sw.js` and `icon.svg` to `dist/`. Run `python3 -m http.server --directory dist 8080` to test. GitHub Actions runs these steps automatically. The browser requires HTTP(S) rather than `file://` for service-worker and module features.

## Accuracy and limitations

Solar outputs use standard approximate NOAA/Meeus-style formulae and are suitable for general visualization, not navigation or eclipse prediction. Sunrise/sunset use a nominal -0.833° altitude and simple iteration. Polar day/night is supported. Moon position is a low-precision orbital approximation; lunar phase and planetary orrery are approximate. Sunrise/noon/sunset continue to be displayed in **UTC**; the app also displays the device's local clock, IANA zone and UTC offset for the selected instant. The bottom dock accepts device-local dates/times and handles its DST transitions through the browser. The observer's geographic coordinates do **not** automatically imply a legal time zone, so there is no guess based on longitude. A future release can add explicit IANA zone selection with tested timezone data. Star catalogue positions are J2000 approximations without precession or nutation, and are not navigation grade.

The Earth map embeds the **NASA/Goddard Space Flight Center Scientific Visualization Studio Blue Marble** 2048×1024 image (https://svs.gsfc.nasa.gov/2915/), available as a NASA public scientific visualization. The build downloads and packages the imagery, so the deployed PWA does not need the NASA website at runtime. Credits: NASA/GSFC SVS; Blue Marble data courtesy of Reto Stöckli (NASA/GSFC) and NASA Earth Observatory. The World Atlas geographic outlines and mathematically computed Sun/twilight shading are overlaid locally. The orrery uses simplified, roughly circular orbits and is **not suitable for precision conjunctions**.

## Safety boundary

All work and GitHub Actions run solely in this separate repository. No workflow has write permissions to GitHub contents. The original Google AI Studio repo is read-only reference material.

## License

Project-specific experimental prototype; no license granted by default.

## Star atlas provenance

Star positions, brightness and constellation-line shapes are converted at build time from [D3-Celestial](https://github.com/ofrohn/d3-celestial) datasets, originally based on Hipparcos and curated constellation representations. The PWA includes local JSON data and functions entirely offline once installed; no sky-atlas service is called at runtime. Coordinates are J2000 approximations and currently omit precession, proper motion, nutation, atmospheric refraction, and extinction. A sidereal-day demonstration is consequently educational rather than an observatory-grade forecast.

## SChronos-inspired full celestial horizon (Version 17)

The rectangular sky projection covers **altitudes +90° through −90°** with the astronomical horizon at 0° halfway down; white magnitude-scaled catalogue stars and solar/lunar trajectories can be shown below the horizon using the new checkbox. The lower half of the plot is black. Above the horizon, daylight mode uses a Sun-azimuth-dependent radial atmosphere glow (with wrap at the north/south azimuth seam) that fades toward black through twilight. Black-sky mode removes atmospheric colour; neither mode changes the simulated positions. The polar projection remains an above-horizon compass.

The gradient approach is adapted from the author's Python/PyCairo SChronos project (2011–2024), using simplified illustrative rather than radiometrically calibrated atmospheric colours. The original Python application's GNU GPL notice remains applicable to its source; this JavaScript implementation is a newly authored rendering approach rather than a source translation.

## Version 18: Milky Way and Earth reference markers

The sky has independent checkboxes for **Milky Way glow**, **MW outlines** and the **galactic-centre marker**, projected into both polar and full-sphere rectangular views with optional J2000→date precession and below-horizon handling. The illustrative soft glow follows the actual J2000 galactic equator, with a central enhancement; it is **not a calibrated surface-brightness map**. Published five-level brightness outlines are sourced from Jose R. Vieira's Milky Way Outline Catalog via [D3-Celestial](https://github.com/ofrohn/d3-celestial), released under its [BSD license](https://github.com/ofrohn/d3-celestial/blob/master/LICENSE). The outline data is downloaded, reduced in size and bundled for offline use during the GitHub Actions build. Black-sky mode displays it at full strength; atmospheric daylight attenuates it.

The Earth panels now show a golden ring for the **solar zenith** and violet diamond at the antipodal **solar nadir**. The globe projection omits any markers on its back side. The annual daylight-duration graph now uses a dark navy line with a light under-stroke for improved contrast.

## Version 19: Milky Way contour shading

The earlier artificial, uniform galactic-plane glow has been removed. The **Milky Way shading** checkbox now fills the irregular five-level Vieira catalogue contours using nested, low-opacity neutral grey polygons (including catalogue holes). The independent **MW outlines** and **Galactic centre** toggles remain. Shading responds to precession, azimuth rotation, both sky projections, below-horizon clipping and daylight attenuation. This aims for the restrained, irregular SidClock-style star-chart treatment rather than an airbrushed glow. The shaded contour tiers are illustrative, not photometrically calibrated.

## Version 20: release identification and more useful sky measurements

The header and persistent time dock display the release version. The footer credits **Created by Darethehair with assistance from ChatGPT**, links to this repository and acknowledges astronomical data and NASA imagery. GitHub Actions embeds the version, exact commit and UTC build date in `build-info.json`; these are available offline after installing the PWA.

Sky controls now include an optional **ecliptic of date**, computed using the solar obliquity of the selected date, with horizon clipping in polar sky and optional below-horizon visibility in rectangular sky. A coordinate readout shows Sun/Moon altitude, azimuth, RA (hours), declination (degrees) and lunar distance/illumination. The stars and Milky Way remain unchanged.

The Moon's topocentric RA/declination, position, geocentric lunar coordinates and phase illumination now use Donald Cross's MIT-licensed **Astronomy Engine** instead of the application's original few-term lunar orbit and mean synodic phase. A visual lunar image still uses the existing approximate disc/orientation renderer. Sun and planetary orrery calculations remain approximate; the application is an educational tool rather than an observing-grade ephemeris.

## Version 21 — Customizable observatory and astronomical almanac

- **Layout controls:** independently show/hide solar summary, daylight chart, Earth map, sky compass, Moon, orrery, observation notes and the new Astronomical Information panel. **Show all**, **Default layout** and **Text Only** shortcuts are available; visibility is saved locally across reloads.
- **Stars:** brighter stars display larger solid discs and subtle halos, and approximate B−V colours from the bundled D3-Celestial catalogue. **Stellar colours** toggles white-only display. Missing B−V values remain white, rather than being assigned a fabricated colour. The original Milky Way contour shading is preserved.
- **Astronomical Information:** an optional, responsive MChronos-inspired text almanac. Groups can be collapsed individually. Includes local and UTC clocks, Julian/MJD, local mean sidereal time, observer coordinates, solar/lunar altitude, azimuth, equatorial positions, rise/set and transit events, solar daylight, twilight boundaries (civil/nautical/astronomical), season and four equinoxes/solstices, lunar phase/distance/illuminated percentage and major upcoming phases. Events in the list move the dashboard to that moment. **Copy Almanac** exports plain text.
- **Accuracy and timezone notes:** event searches use Astronomy Engine and are scoped to the **device's local civil date** and timezone, including local DST handling. This is *not automatically the timezone at the observer's entered coordinates*. For days without a specified sunrise, sunset or twilight event, the panel shows a dash rather than substituting a different astronomical event. No weather or cloud-cover claims are made; observing conditions are derived from celestial geometry only. Planetary ephemerides remain a future improvement.
- **Source credit:** the layout and output fields are inspired by Darren Enns's MChronos v0.37 (2008–2009). This is a newly written implementation and does not embed the original GPL program.


## Version 22 — Equal-status dashboard presets

Added **Sky Only** beside the existing **Text Only** button. Both presets work by selecting the visibility of one ordinary panel using the same dashboard layout code. Astronomical Information has no special priority or rendering status: it can be independently shown, hidden, full-screened, and combined with any other panel. A sole visible panel occupies the full grid width. Previous saved checkbox layouts remain compatible, and the new offline PWA cache is labelled v22.

## Version 23 — Rectangular sky and wide Earth geometry corrections

- **Milky Way:** preserved the original Vieira MultiPolygon groups and hole rings in the offline source conversion. In rectangular altitude/azimuth mode the contour renderer now uses D3's spherical antimeridian clipping, instead of joining an unwrapped planar ring across the azimuth seam. The established polar-view and greyscale Milky Way style are retained.
- **Earth-only layout:** satellite imagery is clipped to the *actual projected globe/world outline*, matching the vector coastline layer. This prevents repeated phantom continents and wide horizontal raster wraps when the map is displayed as a single full-width panel.
- **Regression tests:** Firefox verifies wide-map raster boundaries, Milky Way even-odd fills, and long unwanted polygon segments; the service worker cache and release/build numbers are v23.

## Version 25 — Solar observations alongside the Moon

- **Sun / Moon selector** in the existing lunar photographic panel; both use its ordinary fullscreen capability and share pan/zoom/reset tools. The Moon remains the simulated phase/orientation view based on the bundled NASA LRO mosaic.
- **High-resolution Sun** from the NASA Solar Dynamics Observatory (SDO), HMI colour intensitygram, currently requested as `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_HMIIC.jpg`. A **Refresh Sun** button requests a fresh URL with a cache-busting query parameter; the timestamp printed in the image belongs to the NASA observation, not to the simulation clock or browser request.
- **Offline fallback:** the PWA ZIP bundles a 1024-pixel NASA HMI image as `solar-fallback.jpg`, cached by the service worker; fallback is explicitly marked as a saved reference rather than presented as a current observation.
- **Cursor-anchored zoom** for **both** celestial discs: mouse-wheel zooms around the pointer, plus and minus buttons zoom around the last pointer position or centre, drag pans the magnified view, and **Reset view** restores the centre. Zoom/pan state is independent for Sun and Moon. Normal and fullscreen layouts use the same controls.
- **Data/time distinction:** current NASA solar photographs are *not* rewound when the simulated date changes. The moon view continues to reflect the selected astronomical date/time. No unverified automated interpretation of the NASA embedded timestamp is attempted.


## Version 26 — Point-focused polar sky zoom and pan

- Scrolling the mouse wheel over the **polar sky** magnifies the astronomical chart *toward the pointer* instead of only around the zenith. Its pan offset is adjusted using the ratio of new and old projection radii to keep the selected celestial position stationary.
- With zoom greater than 1×, dragging pans the view in two dimensions. At 1×, dragging continues to rotate the compass as before; **Shift+drag** rotates the compass while zoomed. The existing heading slider also continues to rotate.
- **Reset sky** restores 1× scale, heading 0°, and zero pan offset.
- The polar reference grid, stars, ecliptic, Sun/Moon, and Vieira Milky Way overlays all use the same translated canvas frame. The established rectangular sky and Milky Way geometry are untouched.

## Version 27 — Corrected top-down orrery handedness

- Corrects the previous mirror-image display of the eight approximate heliocentric orbital positions.
- The conventional view is **from north of the ecliptic**, with heliocentric longitude 0° at the top and orbital longitudes increasing **counterclockwise**. Planet coordinates now use `x = centerX - radius * sin(longitude)`, `y = centerY - radius * cos(longitude)` to compensate for canvas's downward-positive Y axis.
- Retains the existing simplified circular orbits, orbital phases, visual proportions, AU rings, and inner/outer zoom views. This change fixes **orientation only**, not full ephemeris accuracy.
- Firefox regression test verifies Earth's and Mercury's opposing J2000 orientations, making a future accidental mirror reversal detectable.

## Version 28 — Fix disappearing stars during zoomed polar panning

The sky atlas previously rejected points using unshifted polar projection coordinates before the canvas pan transform was applied. This made stars and labels disappear prematurely near the screen edges when the polar view was zoomed and dragged. Stars and labels are now culled using their **final translated screen coordinates**. The Milky Way, constellation geometry, sky zoom/drag behavior, and rectangular projection are unchanged. Regression coverage includes independent viewport-boundary assertions and a browser panning smoke test.

## Version 29 — Zoom-sensitive star designations and live sky cursor coordinates

- The **Labels** checkbox is now independent of limiting magnitude, including magnitude 5–7. In polar mode, higher magnification gradually reveals fainter proper names and Bayer/Flamsteed identifiers from the D3-Celestial star-name catalogue; zoomed-out views remain comparatively uncluttered. Candidate labels are ranked and placed only when their visible screen rectangles do not overlap existing labels.
- The bundled star catalogue keeps its stellar B−V colours and magnitude data, and now joins a compact descriptive designation for stars where an actual name is available. These names are real catalogue metadata, never inferred from star positions.
- A new **Cursor: RA / Dec / Az / Alt** strip appears beneath the sky canvas. It converts the pointer's screen position to sky coordinates in both polar and rectangular modes, accounting for the observer's latitude/longitude, simulation time, sky heading and polar zoom/pan. The RA/Dec readout follows the current chart coordinate model, and the display clears when the pointer leaves.
- Tests cover inverse equatorial/horizontal coordinate round trips, large-magnitude labels and both cursor projections. Milky Way geometry, source star positions, and the orrery are unchanged.

## Version 31 — Stable Milky Way contour orientation

The rectangular Milky Way renderer now normalizes each source contour's spherical winding in its fixed J2000 celestial coordinates **before** converting it to the rotating observer horizon. The prior orientation check on projected Alt/Az vertices could switch interior/complement when the azimuth seam moved across a contour as time advanced. D3 still splits polygons at the rectangular seam, with the catalogue MultiPolygon groupings and holes preserved. The polar renderer is unchanged. Check the same one-hour comparison that exposed the v30 issue to verify the visual result.

## Version 32 — Inertial Milky Way shading in rectangular sky

Rectangular Milky Way **fills** now sample a fixed, offline J2000 RA/Dec coverage mask rather than asking a spherical projector to resolve a polygon's winding after local rotation. This avoids the time-dependent selection of the complementary sky region and keeps all uncovered black-sky pixels black. Equatorial-to-horizontal inverse transformation respects sidereal time, observer, heading and optional precession. The mask includes the original five contour levels and hole rings; existing vector outlines and polar shading remain independently available. Firefox regression checks multiple hours around the reported reversal and requires the black background to remain unshaded outside the Milky Way.

## Version 33 — Spherical seam-safe fixed Milky Way mask

Replaces the planar contour closing used to build the fixed J2000 mask with spherical antimeridian clipping via D3, retaining the original five Vieira contour levels and their hole rings. An additional topology safeguard derives the maximum galactic latitude of every published contour vertex and rejects any raster fill beyond that legitimate catalogue footprint, eliminating spurious high-latitude bands. This prevents long false arcs created by wrapping a planar polygon across the RA seam. Rectangular shading continues to sample the time-independent mask; the polar implementation is not changed. Adds the exact November 9, 2026 07:44 Manitoba local (12:44 UTC) artifact scene to Firefox regression coverage, including checks for spurious shading well outside the galactic plane.

## Version 34 — Milky Way diagnostic comparison

The rectangular Milky Way renderer exposes both fixed-mask construction algorithms (planar RA seam unwrapping and spherical clipping) under a diagnostic dropdown. The default is the guarded planar method for comparison against the more sparse v33 spherical shading. The status readout shows actual mask coverage, source polygon count and the catalogue-derived latitude guard; **Copy Debug State** exports a JSON report of the precise simulation date/time (UTC and browser local), observer, mode, controls, mask statistics and canvas dimensions. This build is instrumentation for diagnosing missing contour regions, not a claim that the mask geometry has been completely solved. Polar rendering remains unchanged.

### Mask selection after visual verification

The user-facing spherical-clip comparison toggle has been retired because its shading was incomplete. The repaired planar J2000 mask is selected automatically for rectangular views, and the previously validated legacy planar mask is retained for polar views. Copy Debug State and cursor diagnostics remain available. The internal source-mode comparison is no longer offered as a UI setting.
