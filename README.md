# HelioClock — ChatGPT Independent Edition

An original, independently implemented astronomical dashboard, created for comparison with the Google AI Studio HelioClock project. **This repository must never write to or modify `darethehair/HelioClock`.**

## What it does

- Solar altitude and azimuth; sunrise, sunset, solar noon, daylight duration and equation of time.
- Interactive yearly daylight chart with date selection.
- Live worldwide solar illumination map showing day, civil, nautical and astronomical twilight.
- Local horizon sky compass with Sun and approximate Moon positions.
- Moon phase and approximate synodic age.
- Schematic inner-planet orrery.
- Offline PWA with local files and no required backend.
- No JavaScript framework or npm install required.

## Download and deploy to Apache

1. Open **Actions → Build standalone PWA ZIP** in this repository.
2. Choose the latest successful workflow, then download the **HelioClock-ChatGPT-PWA** artifact.
3. Unzip the downloaded GitHub artifact archive. It contains **HelioClock-ChatGPT-PWA.zip**.
4. Extract that inner ZIP into the Apache directory that will serve the app, for example `/var/www/html/helioclock-chatgpt/`.
5. Browse to `https://darethehair.net/helioclock-chatgpt/`.

The ZIP uses relative resource paths, so it can be hosted at the domain root **or in any subdirectory**. HTTPS is required for geolocation and offline service-worker features (localhost is also allowed). On first load, the app caches its files for subsequent offline visits. The Google Fonts stylesheet is optional and falls back to system fonts when offline.

## Development

No build step required. Serve these files with any static HTTP server, e.g. `python3 -m http.server 8080`. The browser requires HTTP(S) rather than `file://` for service-worker and module features.

## Accuracy and limitations

Solar outputs use standard approximate NOAA/Meeus-style formulae and are suitable for general visualization, not navigation or eclipse prediction. Sunrise/sunset use a nominal -0.833° altitude and simple iteration. Polar day/night is supported. Moon position is a low-precision orbital approximation; lunar phase and planetary orrery are approximate. This version intentionally shows sunrise/noon/sunset in **UTC** and does not guess legal civil time zones from longitude. This avoids an especially common class of time-zone errors. A future release can add explicit IANA zone selection with tested timezone data.

The world map intentionally renders *twilight geometry* without geopolitical boundaries rather than relying on a third-party map service. The orrery uses simplified, roughly circular orbits and is **not suitable for precision conjunctions**.

## Safety boundary

All work and GitHub Actions run solely in this separate repository. No workflow has write permissions to GitHub contents. The original Google AI Studio repo is read-only reference material.

## License

Project-specific experimental prototype; no license granted by default.
