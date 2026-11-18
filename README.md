# HelioClock — ChatGPT Independent Edition

**A personal astronomical observatory for the Sun, Moon, Earth, stars, and planets — in your browser.**

[**Launch HelioClock**](https://helioclock-chatgpt.pages.dev/) · [**Download the standalone PWA**](https://github.com/darethehair/HelioClock-ChatGPT/actions/workflows/build-pwa.yml) · [**Source repository**](https://github.com/darethehair/HelioClock-ChatGPT)

HelioClock combines live astronomical information with interactive, time-traveling views of the sky and solar system. Explore the current sky, move to another date, change your observing location, and examine how sunlight, the Moon, planets, and stars change.

This is the **independent ChatGPT edition**, created by **Darethehair with assistance from ChatGPT**. It is a separate implementation inspired by the original Google AI Studio HelioClock project. **The original [`darethehair/HelioClock`](https://github.com/darethehair/HelioClock) repository and its deployment are never modified by this project's workflow.**

## At a glance

- **Live observatory banner:** prominent local date and time, current solar altitude, a time-versus-altitude plot of the Sun's journey, sunrise/noon/sunset, daylight duration, Moon phase, and an illustrated landscape. The Sun is shown as a dotted marker below the horizon.
- **Annual daylight chart:** a year of sunrise, sunset, civil/nautical/astronomical twilight and darkness, plotted in local mean solar time, with interactive date selection.
- **Illuminated Earth:** NASA Blue Marble imagery, calculated day/night and twilight, solar zenith/nadir markers, three zoomable and pannable projections (Equal Earth, Mercator, interactive globe), and optional NASA Black Marble 2016 city lights, live NOAA OVATION aurora, and daily VIIRS cloud approximations (network required; not historical). Choose **Physical**, **Hybrid**, or **Political** map styles with offline country and selected state/province boundaries and progressively denser world-city labels. Simulated solar eclipses show the central track, penumbral darkening, the central-shadow footprint, and local total/partial/annular status; these are exploratory geometric estimates, not precision eclipse predictions.
- **Celestial object finder:** offline search of named stars, Messier objects and constellation centres, with coordinates and horizon status at the selected date and observer location. Search highlighting and orbital-object catalogues are planned.
- **Sky Compass:** north-polar (including a zoomed-out below-horizon extension) and full rectangular horizon projections, with stars, solar/lunar paths, planets, constellation lines and names, the ecliptic, celestial grids, and an interactive RA/Dec/Az/Alt pointer readout. The Moon marker shows its illuminated phase with its bright limb oriented toward the Sun in the displayed sky.
- **Milky Way and deep sky:** shaded irregular Milky Way contour regions and outlines, galactic-centre marker, Messier galaxies, nebulae and clusters, with independently controlled labels and zoom-aware decluttering.
- **Sun and Moon:** simulated lunar phase and orientation displayed on a NASA LRO surface mosaic; optional recent NASA SDO/HMI solar imagery, including an offline fallback. Each image supports zoom and pan.
- **Solar system orrery:** Astronomy Engine heliocentric ecliptic positions of Mercury through Neptune, inner/outer viewing modes, AU rings and zoom. Optional 3D perspective supports tilt and rotation using sliders or drag gestures, including touch devices; orbital guide paths sample the planets' inclined heliocentric trajectories. **Planetary event navigator** finds previous/next opposition, conjunction, quadrature, or inner-planet greatest elongation relative to the simulated date, updates the global date/time, and shows the selected event geometry and Earth distance.
- **Astronomical Information:** a detailed text almanac with Julian dates, sidereal time, Sun/Moon coordinates, rise/set and twilight events, major lunar phases, and upcoming events. Visible in the default dashboard, or usable as a stand-alone text-only view.

### Explore time and space

The **fixed bottom time dock** remains visible while using the graphical displays, including fullscreen views. It provides local date/time controls, a time scrubber, ±minute, ±hour and ±day steps, a live-clock return, and local sidereal time. The Sky Compass also offers ±**sidereal day** steps (approximately 23h 56m 4.091s). You can choose observing latitude and longitude independently of the device's timezone.

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

The workflow runs a separate quick-check job, compiles the app, prepares the imagery/catalogues, exercises Firefox browser and Chromium mobile-emulation regression suites, and uploads the artifact. During packaging, the service-worker cache identity is generated automatically from the release number and compiled JavaScript hash, preventing a forgotten manual cache bump. With the required repository secrets configured, the final step deploys to the separate `helioclock-chatgpt` Cloudflare Pages project. The deployment step checks that the run still represents the latest `main` commit before publishing.

**Cloudflare secrets** (repository administrators only): `CLOUDFLARE_API_TOKEN` with suitable Pages permissions, and `CLOUDFLARE_ACCOUNT_ID`. Do not commit either value to source.

> A Markdown-only documentation change runs only the lightweight change-scope check; application source, asset, configuration and workflow changes still trigger the full PWA build and browser regression tests. A README-only change does not publish a new PWA artifact or redeploy the site. Previously, a README-only change also triggered the full workflow. A spinning GitHub page can occasionally remain stale after the run has already completed; refreshing the Actions page retrieves the current recorded status.

## Astronomical methods and important limitations

HelioClock is an **educational and exploratory** application, **not** a navigation, eclipse-prediction, telescope-control or observatory-grade ephemeris system.

| Area | Implementation and caveat |
| --- | --- |
| Sun/daylight | Approximate NOAA/Meeus-style solar calculations; sunrise/sunset use a nominal −0.833° horizon convention. Atmospheric colours and the hero landscape are illustrative, not weather or physical sky simulations. |
| Moon and planetary sky positions | Selected computations use [Astronomy Engine](https://github.com/cosinekitty/astronomy) by Donald Cross (MIT license). The lunar photograph is a textured, horizon-aligned simulated phase view; the latest NASA Sun image is a **real observation**, not a historical image selected by simulation time. |
| Stars and constellations | Offline J2000-based catalogue derived from [D3-Celestial](https://github.com/ofrohn/d3-celestial); optional precession to the selected date, star colours and magnitude limits. Positions do not model every high-precision apparent-place correction. |
| Sky overlays | Coordinate grids, ecliptic, named constellations, 107 classified Messier deep-sky objects, and Vieira Milky Way contour fills. Contour shading is an illustrative area treatment, not calibrated surface brightness. |
| Earth | NASA Blue Marble texture and calculated solar illumination, qualitative live satellite-cloud overlay and NOAA space weather when connected. Simulated eclipse shadows and tracks are approximate: historical central paths and totality boundaries are not calibrated to high-precision NASA Besselian elements. Political boundaries and place names are bundled, simplified geographic references rather than current authoritative jurisdictional records. |
| Orrery | Planet positions and alignment dates use Astronomy Engine. Planet sizes are schematic; 3D orbital guides sample heliocentric positions over approximate orbital periods rather than using precision osculating-orbit plots. Calculated geometric heliocentric conjunction/opposition dates may differ slightly from apparent alignments as seen on Earth. |
| Timezones | Civil time and DST follow the browser/device's IANA timezone rules. The observer coordinates alone do not establish the corresponding legal timezone. The annual daylight chart uses local **mean solar** time; sunrise/solar noon/sunset in the hero summary are labelled **UTC**. |

## Data, imagery and acknowledgements

- **NASA Blue Marble:** [NASA/GSFC Scientific Visualization Studio](https://svs.gsfc.nasa.gov/2915/) / NASA Earth Observatory (Reto Stöckli and collaborators).
- **Moon imagery:** NASA Lunar Reconnaissance Orbiter near-side mosaic.
- **Sun imagery:** NASA Solar Dynamics Observatory, HMI continuum imagery. A saved fallback image is bundled when a current observation is unavailable.
- **Sky catalogues, constellation geometry and Messier objects:** [D3-Celestial](https://github.com/ofrohn/d3-celestial), distributed under its BSD licensing terms; original upstream data provenance also applies.
- **Milky Way irregular contours:** Jose R. Vieira's Milky Way Outline Catalog as distributed in D3-Celestial.
- **Astronomy Engine:** Donald Cross, MIT-licensed computational astronomy library.
- **Political geographic data:** [Natural Earth](https://www.naturalearthdata.com/) public-domain 1:50m populated places and selected state/province boundaries; additional offline city positions and all 50 U.S. state capitals are included for geographic coverage. Labels are selectively suppressed when crowded, so catalog coverage does not imply every city is visible simultaneously.
- **Astronomical information design:** inspired by Darren Enns's MChronos; earlier astronomical graph ideas also draw on the author's SChronos project. This JavaScript app is not a source-code translation of those historical programs.

Upstream scientific datasets and libraries retain their own license and attribution requirements.

## Selected development milestones

Release highlights are curated in [`release-notes.json`](release-notes.json). When increasing the major version in `package.json`, add its release note first, then run `npm run docs:sync` to regenerate the table. Full CI verifies the version and generated table with `npm run docs:check`, preventing undocumented releases from passing. This keeps the README synchronized without inventing release descriptions.


| Release | Highlights |
| --- | --- |
| **v117** | Add International Space Station tracking to Earth Map with CelesTrak OMM snapshots, satellite.js SGP4 ground-track propagation, projection-aware current marker and ±45-minute track, altitude/speed/epoch readouts, offline cache, refresh control and stale-element safeguards. |
| **v116** | Add named playback rates from 1 simulated second to 1 fixed 365-day year per real second, bidirectional Play/Reverse, elapsed-time stepping and compact fullscreen speed selection. |
| **v115** | Add Mercury–Neptune motion trails to Sky Compass with computed 400-day ephemeris paths, accumulated time-step breadcrumbs, star-relative or horizon frames, dots/line controls and clear; Earth Map remains Sun-only. |
| **v114** | Add Sun motion trails to Sky Compass and all Earth projections: fixed-UTC annual analemma, manual time-step breadcrumbs, independent dots/line styling, synchronized panel controls and clear trail. |
| **v113** | Show substantially more lunar names at low magnification by relaxing zoom eligibility and scaling collision-limited label density to the viewport, while preserving the 500-feature searchable atlas. |
| **v112** | Expand the lunar atlas to 500 searchable named features: retain 115 curated landmarks, add 385 prominent near-side craters from USGS-derived nomenclature data, and maintain zoom-dependent uncluttered labels. |
| **v111** | Curated 115-feature near-side lunar atlas with zoom-aware collision-limited labels, maria/crater/other filters, searchable names, centering and selection; fixed mosaic coordinates are explicitly approximate, with libration deferred. |
| **v110** | Replace 100 minor-planet diamond markers with small hollow circles (selected body enlarged), and extend optional ecliptic height risers to visible planets, with numeric planet height in inspection. |
| **v109** | 100 searchable diameter-ranked numbered minor planets from NASA/JPL; low-cost markers, selective orbit paths, labels for the primary four and the selected body. |
| **v108** | Inspect selected comet/asteroid inclination, eccentricity, perihelion and aphelion, ascending node, and signed ecliptic height; optionally show a 3D drop line to the ecliptic plane. |
| **v107** | Click or tap Orrery planet, asteroid, or selected-comet markers for a synchronized object selection, highlighting, heliocentric distance and date readout; gestures still rotate without selecting. |
| **v106** | Synchronize numeric Orrery camera angles with mouse/touch dragging and reset, while allowing direct gestures across the full ±180° tilt range. |
| **v105** | Label all four minor bodies in the Orrery, extend 3D tilt through ±180°, show editable tilt/rotation degrees, and optionally draw a faint ecliptic reference mesh. |
| **v104** | Add independent Orrery minor-body controls to toggle all four JPL asteroids, choose one directly, search for any bundled MPC comet, show/hide comet orbit guides, and clear selections without leaving the Orrery. |
| **v103** | Add JPL SBDB-backed Ceres, Pallas, Juno and Vesta search and approximate positions, optional purple asteroid markers and orbits in the Sky Compass and Orrery. |
| **v102** | Add Clear selection to restore an unselected Sky Compass and Orrery; generate an offline, explicitly caveated JPL Horizons XYZ comparison for Halley at 1986, 2026, and 2061 in each packaged build. |
| **v101** | Plot the selected comet's approximate heliocentric orbit and position in the Orrery with a Fit selected comet control, and keep Sky Compass grid lines thin and subtle under zoom. |
| **v100** | Always draw the comet glyph for an explicitly selected object such as Halley, regardless of the automatic comet layer's age/range limits or visibility toggle; keep automatic markers filtered. |
| **v99** | Add optional pale-cyan nucleus-and-tail comet icons to Sky Compass maps, with a persistent Show comets toggle and date-filtered MPC positions. |
| **v98** | Show source filenames, data dates and download timestamps for MPC comets, NASA solar images and cloud imagery, and NOAA space-weather feeds; distinguish observations from retrieval times. |
| **v97** | Fix Earth map observer and zoom controls overflowing narrow tablet dashboard cards; wrap by available panel width and verify button-label bounds in Firefox. |
| **v96** | Make MPC comets searchable in Sky Compass, with approximate two-body heliocentric propagation, topocentric RA/Dec and Alt/Az, selection marker, Center and Follow, and orbital-accuracy warnings. |
| **v95** | Add the official MPC CometEls.txt import foundation, validated offline orbital-element snapshots with source/freshness metadata, and a catalogue status in Sky Compass; comet positions are not yet calculated. |
| **v94** | Add Locate me beside Set observer on map, reusing the existing permission-aware browser geolocation to restore current observer coordinates. |
| **v93** | Add an explicit Set observer on map crosshair mode; click or tap any visible Earth point to update observer coordinates without changing normal globe rotation behavior. |
| **v92** | Show selected-object rise, upper-transit and set times for the simulation UTC date, including circumpolar visibility status and geometric-horizon cautions. |
| **v91** | Extend the celestial object finder to all seven visible planets using the same topocentric Astronomy Engine ephemerides as Sky Compass, with date-aware positioning and regression tests. |
| **v90** | Move celestial object search into a compact collapsible section within Sky Compass, retaining search, Center and Follow controls and mobile fullscreen access. |
| **v89** | Add optional Follow through time tracking for the selected celestial object, with continuous Sky Compass recentering and manual pan/rotation/zoom to exit tracking. |
| **v88** | Add a Center in Sky Compass action for selected finder results, repositioning either projection and revealing below-horizon targets in the rectangular view. |
| **v87** | Highlight the selected celestial search result in both Sky Compass projections with a date-aware position marker, including zoom-aware sizing. |
| **v86** | Introduce an offline celestial object finder for named stars, Messier objects and constellations, with date- and observer-aware RA/Dec, azimuth, altitude and horizon status. |
| **v85** | Make below-horizon polar zoom transition smoothly from 1× to 0.5×, progressively revealing the hidden sky while keeping the disc centred and fitting the viewport. |
| **v84** | Fit the full below-horizon polar sky to the available canvas in regular and fullscreen layouts, preserving the largest possible view and keeping cursor mapping aligned. |
| **v83** | Shift the sub-1× polar sky downward to avoid clipping at the top while preserving its angular scale; keep grids, Milky Way, ecliptic, objects and cursor mapping aligned without altering the normal 1× view. |
| **v82** | Extend the polar Sky Compass zoom to 0.5× to reveal the below-horizon hemisphere; distinguish it with a shaded annulus and prominent horizon ring, while retaining the normal 1× view and extending celestial overlays. |
| **v81** | Render the Moon in the Sky Compass as a phase-correct illuminated disc, with the bright limb directed toward the Sun in the active sky projection. |
| **v80** | Reconcile Earth map projection/style, sky display choices, Orrery settings, sliders and other preference-backed controls with internal state on startup and browser page restoration; add reload regression coverage. |
| **v79** | Persist the Orrery 3D checkbox and synchronize its displayed state with the actual camera setting after loading preferences and restoring pages. |
| **v78** | Extend Orrery tilt to −90° through +90°, add native touch handling and inclined sampled planetary orbit guides; automatically stamp release-specific service-worker cache identities during packaging. |
| **v77** | Reduce Orrery canvas redraw overhead and add mouse-drag regression coverage. |
| **v76** | Add drag-to-rotate/tilt Orrery interaction, synchronized camera sliders and a reset-view control; correct the displayed version metadata. |
| **v75** | Update Orrery controls to redraw the Orrery directly rather than refreshing the entire dashboard. |
| **v74** | Introduce optional 3D Orrery perspective with tilt and rotation sliders. |
| **v73** | Group optional Sky Compass layers into collapsible sections and move Milky Way developer diagnostics behind an expandable disclosure. The default sky visualization and controls remain available. |
| **v72** | Remove inconsistent state/province text labels while preserving their boundary lines; country names remain for broad orientation and city names for local detail. |
| **v71** | Display the nearest catalogued city or town at the selected observer marker with an approximate great-circle distance; the label is prioritised over ordinary map names on all three Earth projections. The worldwide catalog is incomplete, so this is not guaranteed to be the actual nearest settlement. |
| **v70** | Expand the offline city catalog to approximately 1,283 world locations using Natural Earth 1:50m populated places, all 50 U.S. state capitals and retained curated entries. City-label eligibility increases with zoom while overlap avoidance limits visible density. The catalog-based observer settlement label arrived in v71. |
| **v69** | Remove duplicate Ontario label, prevent duplicate on-screen place labels, and refine font sizes/weights plus eclipse track and center-marker styling. |
| **v68** | Introduce Physical, Hybrid and Political Earth styles, offline country and selected state/province boundaries, and zoom-sensitive city labels for all three projections. |
| **v67** | Draw the geographic central-shadow footprint for solar eclipses, distinguishing totality from annularity and reporting observer eclipse status. |
| **v66** | Improve eclipse track/center visibility and geographic readouts; add Firefox checks for shadow rendering in three Earth projections. |
| **v65** | Introduce a simulated solar-eclipse penumbra and central ground track on the Earth map and ±1-minute time stepping. |
| **v64** | Eclipse searches now expand over a selected 100–5,000-year horizon instead of fixed 30-year/200-event caps; progressive feedback and cancellation keep the browser usable. Extreme dates are ephemeris-dependent. |
| **v63** | Eclipse Explorer with location-aware past/future solar and lunar events, partial/total/penumbral renderings, UTC contacts and event navigator. Solar eclipse images are simulated independently of latest NASA photos; Earth-map paths were added later in v65. |
| **v62** | Interactive daylight-year explorer: dated equinox/solstice markers, hover/touch day inspection and daylight gained/lost per day. |
| **v61** | Fullscreen keyboard focus fix and 24-hour time displays. |
| **v60** | Fullscreen panel browsing with Left/Right keyboard keys and on-screen previous/next buttons; no swipe conflicts. |
| **v59** | Solar disc latitude-of-view B₀ projection and P-angle readout; grid anchored to approximate photo retrieval epoch, independent of simulation time. Assumes solar-north-up SDO imagery pending registration. |
| **v58** | Keep coordinate overlay physically locked to Sun/Moon images during pan, zoom and reset; remove CSS transform override and add dual-disc Firefox tests. |
| **v57** | Align lunar canvas and solar grid with actual visible discs; thinner dark solar lines, adaptive 15-degree grids and denser coordinate labels. |
| **v56** | Introduce optional projected reference coordinate grids and pointer/touch readouts for the Sun and Moon. These are educational reference coordinates: exact lunar libration and solar image registration are not yet supported. |
| **v55** | Add previous/next planetary opposition, conjunction, quadrature, and Mercury/Venus greatest-elongation navigation; date/time jumps, event details and dashed geometry, with Astronomy Engine orbital coordinates. |
| **v54** | Repair final build metadata showing v51, prefer network for PWA navigation/version checks and update existing tabs. Fill genuine black satellite swath gaps with the previous day's NOAA-20/21 observations, labelled as multi-day imagery. |
| **v53** | Combine available same-day NOAA-20 and NOAA-21 VIIRS cloud observations per map position to reduce unobserved Pacific swath gaps without fabricating clouds. |
| **v52** | Restore cloud imagery after Suomi-NPP's November 2026 retirement, using active NOAA-20 VIIRS with NOAA-21 fallback and explicit satellite identification. |
| **v51** | Replace MODIS daily imagery with wider-swath VIIRS/Suomi-NPP imagery to avoid orbital-scan gaps in the cloud overlay. |
| **v50** | Optional NASA VIIRS satellite cloud approximation on all Earth map projections; strength control, imagery date, refresh and unavailable status. Daily observed imagery is independent of the simulation clock; not a forecast or measured cloud fraction. |
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

*Created by Darethehair with assistance from ChatGPT · Release milestones maintained from `release-notes.json`.*
