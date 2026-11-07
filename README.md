# HelioClock — ChatGPT Independent Edition

An original, independently implemented astronomical dashboard, created for comparison with the Google AI Studio HelioClock project. **This repository must never write to or modify `darethehair/HelioClock`.**

## What it does

- Solar altitude and azimuth; sunrise, sunset, solar noon, daylight duration and equation of time.
- Interactive 24-hour annual solar ephemeris with sky-blue daylight, civil/nautical/astronomical twilight bands, sunrise/sunset contours, selected-date readout and date scrubbing. The vertical chart uses **local mean solar time**, not a guessed civil timezone.
- Interactive **NASA Blue Marble satellite-textured** Earth map with calculated daylight/twilight shading, Equal Earth / orthographic globe / Mercator projection tabs directly above the map, observer/subsolar markers, drag-pan, zoom buttons and wheel zoom.
- Local horizon sky compass with Sun and approximate Moon positions, selectable Sun/Moon paths, a compact J2000 bright-star catalogue with names, zoom and rotation.
- Moon phase and approximate synodic age, rendered as one centered antialiased disc (including correct high-DPI scaling).
- Schematic inner-planet orrery.
- Offline PWA with local files and no required backend.
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

Solar outputs use standard approximate NOAA/Meeus-style formulae and are suitable for general visualization, not navigation or eclipse prediction. Sunrise/sunset use a nominal -0.833° altitude and simple iteration. Polar day/night is supported. Moon position is a low-precision orbital approximation; lunar phase and planetary orrery are approximate. Sunrise/noon/sunset are displayed in **UTC** and does not guess legal civil time zones from longitude. This avoids an especially common class of time-zone errors. A future release can add explicit IANA zone selection with tested timezone data. Star catalogue positions are J2000 approximations without precession or nutation, and are not navigation grade.

The Earth map embeds the **NASA/Goddard Space Flight Center Scientific Visualization Studio Blue Marble** 2048×1024 image (https://svs.gsfc.nasa.gov/2915/), available as a NASA public scientific visualization. The build downloads and packages the imagery, so the deployed PWA does not need the NASA website at runtime. Credits: NASA/GSFC SVS; Blue Marble data courtesy of Reto Stöckli (NASA/GSFC) and NASA Earth Observatory. The World Atlas geographic outlines and mathematically computed Sun/twilight shading are overlaid locally. The orrery uses simplified, roughly circular orbits and is **not suitable for precision conjunctions**.

## Safety boundary

All work and GitHub Actions run solely in this separate repository. No workflow has write permissions to GitHub contents. The original Google AI Studio repo is read-only reference material.

## License

Project-specific experimental prototype; no license granted by default.
