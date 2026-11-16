# Future features — HelioClock-ChatGPT

This is a planning backlog, not a claim that the features are implemented. Inspired in part by Darren's original MEphemeris (2008–2011); do not port its obsolete Python 2/PyGTK code or change the separate AI Studio HelioClock repository.

## Next: celestial object finder
- Unified search across existing stars, planets, Messier/NGC deep-sky objects and constellations.
- Show selected object's coordinates, local altitude/azimuth, horizon status and selected-date context.
- Highlight or centre the result in the Sky Compass; retain the shared simulation date.
- Expand the same finder to dynamic small bodies when orbital catalogues become available.

## Orbital catalogues
- Import/update Minor Planet Center comet elements (including CometEls.txt), asteroids and near-Earth objects; validate formats, epoch and reference frame.
- Shared orbit propagation for Sky Compass and Orrery, including highly inclined, retrograde and open comet orbits; verify against independent ephemerides and disclose accuracy limits.
- Offline cache, source/freshness metadata, optional user-supplied element files and a safe refresh workflow.
- Search, orbit display and past/future navigation for small bodies.

## Lunar atlas
- Interactive zoomable lunar surface map with named maria, craters and mountain ranges; investigate MEphemeris's Clementine imagery and lunar100.dat as historical design references.
- Feature search, markers and labels; later link lunar illumination/terminator to the selected date and model libration where practical.

## Visibility and observing tools
- Selected-object information panels: apparent magnitude/size, RA/Dec, altitude/azimuth, distance, phase and orbital properties where applicable.
- Rise/transit/set times, visibility charts, observing windows and favourite-object bookmarks.

## Satellite tools
- TLE-based satellite catalogue, pass predictions, sky tracks, ground positions and sunlight/eclipse state; display element age and warn on stale predictions.

## Other MEphemeris-inspired ideas
- Planetary moon views and event geometry.
- Additional solar-angle/seasonal graphs where existing HelioClock charts do not cover the same use case.
- Contextual Messier/NGC images and reference information where attribution and licensing permit.
- Reassess older weather/map integrations only if they add clear value beyond HelioClock's existing modern overlays.

Prioritize incremental, independently testable changes. Preserve the existing features, offline PWA, version/release documentation and Firefox/mobile regression checks.
