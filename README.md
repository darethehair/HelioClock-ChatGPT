# HelioClock — ChatGPT Independent Edition

**A personal astronomical observatory for the Sun, Moon, Earth, stars, and planets — in your browser.**

[**Launch HelioClock**](https://helioclock-chatgpt.pages.dev/) · [**Download the standalone PWA**](https://github.com/darethehair/HelioClock-ChatGPT/actions/workflows/build-pwa.yml) · [**Source repository**](https://github.com/darethehair/HelioClock-ChatGPT)

HelioClock combines live astronomical information with interactive, time-traveling views of the sky and solar system. Explore the current sky, move to another date, change your observing location, and examine how sunlight, the Moon, planets, and stars change.

This is the **independent ChatGPT edition**, created by **Darethehair with assistance from ChatGPT**. It is a separate implementation inspired by the original Google AI Studio HelioClock project. **The original [`darethehair/HelioClock`](https://github.com/darethehair/HelioClock) repository and its deployment are never modified by this project's workflow.**

## At a glance

- **Live observatory banner:** prominent local date and time, current solar altitude, a time-versus-altitude plot of the Sun's journey, sunrise/noon/sunset, daylight duration, Moon phase, and an illustrated landscape. The Sun is shown as a dotted marker below the horizon.
- **Annual daylight chart:** a year of sunrise, sunset, civil/nautical/astronomical twilight and darkness, plotted in local mean solar time, with interactive date selection.
- **Illuminated Earth:** optional NASA NOAA-20/NOAA-21 VIIRS daily true-colour satellite clouds (qualitative white-pixel extraction, not a cloud-cover percentage or forecast, network required; up to several days stale), strength slider, and NASA Black Marble 2016 city lights and current NOAA OVATION auroral forecast (network required, no historical rewind); a planetary Kp indicator in the header; NASA Blue Marble cloud-free imagery; mathematical day/night terminator and selectable twilight bands; solar zenith/nadir markers; Equal Earth, Mercator and interactive globe projections; panning and zooming.
- **Sky Compass:** north-polar and full rectangular horizon projections, with stars, solar/lunar paths, planets, constellation lines and names, the ecliptic, celestial grids, and an interactive RA/Dec/Az/Alt pointer readout.
- **Milky Way and deep sky:** shaded irregular Milky Way contour regions and outlines, galactic-centre marker, Messier galaxies, nebulae and clusters, with independently controlled labels and zoom-aware decluttering.
- **Sun and Moon:** simulated lunar phase and orientation displayed on a NASA LRO surface mosaic; optional recent NASA SDO/HMI solar imagery, including an offline fallback. Each image supports zoom and pan.
- **Solar system orrery:** approximate top-down heliocentric positions of Mercury through Neptune, inner/outer viewing modes, AU rings and zoom.
- **Astronomical Information:** a detailed text almanac with Julian dates, sidereal time, Sun/Moon coordinates, rise/set and twilight events, major lunar phases, and upcoming events. Visible in the default dashboard, or usable as a stand-alone text-only view.

### Explore time and space

The **fixed bottom time dock** remains visible while using the graphical displays, including fullscreen views. It provides local date/time controls, a time scrubber, ±hour and ±day steps, a live-clock return, and local sidereal time. The Sky Compass also offers ±**sidereal day** steps (approximately 23h 56m 4.091s). You can choose observing latitude and longitude independently of the device's timezone.

The dashboard has independently switchable sections and **Show all**, **Default layout**, **Sky Only**, and **Text Only** presets. Settings are stored locally, can be exported/imported as JSON, and may optionally include zoom and view positions. There is no user account or required application backend.

### Mobile and fullscreen

HelioClock works in ordinary desktop browsers and as an installable progressive web app (PWA). Zoomable views support mouse-wheel/drag interaction and **two-finger pinch-to-zoom** on touch devices (Earth, both sky projections, Sun/Moon and orrery). On compact screens, fullscreen visualization prioritizes the plot, with controls available in a drawer and a reduced-height time dock.

## Try it

**Public application:** https://helioclock-chatgpt.pages.dev/

Open the site on a desktop or phone. On supported Chromium-based Android browsers, use the browser's **Install app** or **Add to Home screen** option to install the PWA. Installation support varies by browser; the site also works without installing.

HelioClock uses your browser's local timezone for displayed civil time and the selected latitude/longitude for astronomical observations. For a geographically different observing location, the device timezone **does not automatically switch** to the location's legal timezone.

## Download and self-host

Every successful main-branch build publishes the **HelioClock-ChatGPT-PWA** GitHub Actions artifact:

1. Open [**Build standalone PWA ZIP — Actions**](https://github.com/darethehair/HelioClock-ChatGPT/actions/workflows/build-pwa.yml).
2. Select a successful run and download the `HelioClock-ChatGPT-PWA` artifact.
3. Extract the downloaded ZIP **once** to a static HTTP(S) server's document root or subdirectory.

The artifact contains the deployable files directly, **not another ZIP nested inside**. No Node.js runtime, database or server-side API is needed after building. Relative asset paths support deployment beneath a subdirectory.

A browser's service worker and geolocation require a secure context (**HTTPS** or `localhost`). The cached PWA includes NASA's static Black Marble 2016 composite, bundled astronomical catalogues and core imagery, though NASA daily cloud imagery and live NOAA aurora and Kp require internet access and are independent of the simulation date; loading a fresh NASA solar photograph also requires network access; the offline solar fallback is explicitly identified as such. External Google Fonts are optional.

## Build and test from source

**Requirements:** Node.js/npm, Python 3 (for optional local static serving), and Playwright Firefox if running browser tests.

```bash
npm install
npm run build
npm test
npm run test:browser
```

`npm run build` bundles the browser application into `dist/app.js` using esbuild. **That command alone does not assemble a complete standalone distribution**: the GitHub Actions workflow also stages HTML/CSS, the service worker and manifest, imagery, star/constellation/Milky Way catalogues, and build metadata.

For a packaged download or a deployment-ready `dist/`, **use the successful GitHub Actions artifact** rather than copying only the JavaScript bundle. The same tested `dist/` files are used for the Cloudflare Pages deployment.

The workflow runs a separate quick-check job, compiles the app, prepares the imagery/catalogues, exercises a Firefox browser regression suite, and uploads the artifact. With the required repository secrets configured, the final step deploys to the separate `helioclock-chatgpt` Cloudflare Pages project. The deployment step checks that the run still represents the latest `main` commit before publishing.

**Cloudflare secrets** (repository administrators only): `CLOUDFLARE_API_TOKEN` with suitable Pages permissions, and `CLOUDFLARE_ACCOUNT_ID`. Do not commit either value to source.

> A README-only change also triggers the normal GitHub Actions workflow. A spinning GitHub page can occasionally remain stale after the run has already completed; refreshing the Actions page retrieves the current recorded status.

## Astronomical methods and important limitations

HelioClock is an **educational and exploratory** application, **not** a navigation, eclipse-prediction, telescope-control or observatory-grade ephemeris system.

| Area | Implementation and caveat |
| --- | --- |
| Sun/daylight | Approximate NOAA/Meeus-style solar calculations; sunrise/sunset use a nominal −0.833° horizon convention. Atmospheric colours and the hero landscape are illustrative, not weather or physical sky simulations. |
| Moon and planetary sky positions | Selected computations use [Astronomy Engine](https://github.com/cosinekitty/astronomy) by Donald Cross (MIT license). The lunar photograph is a textured, horizon-aligned simulated phase view; the latest NASA Sun image is a **real observation**, not a historical image selected by simulation time. |
| Stars and constellations | Offline J2000-based catalogue derived from [D3-Celestial](https://github.com/ofrohn/d3-celestial); optional precession to the selected date, star colours and magnitude limits. Positions do not model every high-precision apparent-place correction. |
| Sky overlays | Coordinate grids, ecliptic, named constellations, 107 classified Messier deep-sky objects, and Vieira Milky Way contour fills. Contour shading is an illustrative area treatment, not calibrated surface brightness. |
| Earth | NASA Blue Marble texture and mathematically calculated solar illumination; no real-time clouds, satellite weather data or exact atmospheric radiative transfer. |
| Orrery | Approximate schematic heliocentric orbits and positions; not-to-scale planet sizes and no precision conjunction predictions. |
| Timezones | Civil time and DST follow the browser/device's IANA timezone rules. The observer coordinates alone do not establish the corresponding legal timezone. The annual daylight chart uses local **mean solar** time; sunrise/solar noon/sunset in the hero summary are labelled **UTC**. |

## Data, imagery and acknowledgements

- **NASA Blue Marble:** [NASA/GSFC Scientific Visualization Studio](https://svs.gsfc.nasa.gov/2915/) / NASA Earth Observatory (Reto Stöckli and collaborators).
- **Moon imagery:** NASA Lunar Reconnaissance Orbiter near-side mosaic.
- **Sun imagery:** NASA Solar Dynamics Observatory, HMI continuum imagery. A saved fallback image is bundled when a current observation is unavailable.
- **Sky catalogues, constellation geometry and Messier objects:** [D3-Celestial](https://github.com/ofrohn/d3-celestial), distributed under its BSD licensing terms; original upstream data provenance also applies.
- **Milky Way irregular contours:** Jose R. Vieira's Milky Way Outline Catalog as distributed in D3-Celestial.
- **Astronomy Engine:** Donald Cross, MIT-licensed computational astronomy library.
- **Astronomical information design:** inspired by Darren Enns's MChronos; earlier astronomical graph ideas also draw on the author's SChronos project. This JavaScript app is not a source-code translation of those historical programs.

Upstream scientific datasets and libraries retain their own license and attribution requirements.

## Selected development milestones

| Release | Highlights |
| --- | --- |
| **v53** | Combine available same-day NOAA-20 and NOAA-21 VIIRS cloud observations per map position to reduce unobserved Pacific swath gaps without fabricating clouds. |
| **v52** | Restore cloud imagery after Suomi-NPP's November 2026 retirement, using active NOAA-20 VIIRS with NOAA-21 fallback and explicit satellite identification. |
| **v51** | Replace MODIS daily imagery with wider-swath VIIRS/Suomi-NPP imagery to avoid orbital-scan gaps in the cloud overlay. |\n| **v50** | Optional NASA VIIRS satellite cloud approximation on all Earth map projections; strength control, imagery date, refresh and unavailable status. Daily observed imagery is independent of the simulation clock; not a forecast or measured cloud fraction. |
| **v49** | Fix planetary Kp parsing for NOAA's March 2026 JSON format change while preserving legacy responses. |
| **v48** | Use grayscale NASA city-light emissions instead of the coloured terrain composite to preserve Earth's natural dark-side appearance. |
| **v47** | NOAA OVATION near-real-time auroral forecast overlay and planetary Kp, with night-side NASA Black Marble 2016 city lights. All three Earth projections; timestamps and offline messaging. |
| **v46** | Sky Compass checkbox rows wrap within the standard two-column dashboard. |
| **v45** | Astronomical Information visible by default; dotted Sun when below the hero chart's horizon. |
| **v44** | Generated lakeside twilight panorama integrated into the local/offline PWA. |
| **v41–v43** | Observatory-first landing page, large local clock, live solar altitude journey and responsive landscape experiments. |
| **v40** | Independent, zoom-aware names for all 88 IAU constellations. |
| **v39** | Messier galaxies, nebulae, clusters and optional labels. |
| **v36–v38** | Earth projection refinements, coordinate grids, planets in the sky, mobile fullscreen improvements and polar Milky Way fixes. |
| **v25–v35** | Sun/Moon imaging and zoom, two sky projections, Milky Way contour accuracy, precession/labels, cursor coordinates, and astronomy-focused regression tests. |
| **v17–v24** | Below-horizon celestial chart, almanac, flexible dashboards and early constellation/Milky Way features. |

The Git history and [Actions runs](https://github.com/darethehair/HelioClock-ChatGPT/actions) document individual changes, tests and release commits. The currently running application displays its release number in the page header and time dock, with build commit/date information in its footer.

## Project boundaries and license

This repository and its Cloudflare Pages site are **separate from** [the original AI Studio HelioClock](https://github.com/darethehair/HelioClock). The automated deployment does not write to the original repository, Cloudflare project or personal Apache server.

**Project source license:** no general reuse license has been granted for this experimental application unless one is added explicitly. This does not supersede the licenses of bundled third-party packages, code, scientific datasets or imagery.

---

*Created by Darethehair with assistance from ChatGPT · README refreshed for HelioClock v53 (November 2026).*
