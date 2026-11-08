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
