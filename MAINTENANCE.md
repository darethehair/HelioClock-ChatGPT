# Maintenance release checklist (work in progress)

Baseline: v59 main commit `894dbb2772f9572f2a2ce1793092066b3c4940ef`.
Immutable rollback branch: `backup/v59-pre-maintenance-20261113`.

## Invariants
- Never modify `darethehair/HelioClock` (AI Studio original).
- Do not merge this maintenance branch without confirming a successful baseline and successful branch browser test suite.
- No visual, astronomical algorithm, local-storage, version, or PWA asset changes are intended.
- Moon/Sun canvas, photo, and coordinate grid must share pixel-identical viewport bounds and pan/zoom transforms.
- The solar grid must follow the photograph retrieval-time proxy and leave simulation date independent.
- Retain mobile and fullscreen behaviour and saved user settings.
- Keep production Cloudflare deployment gated to main.

## Initial cleanup
- Removed dead Moon canvas-specific height declarations whose values were overridden by stronger final selectors.
- Unified duplicated solar/lunar coordinate geometry setup into one readout/drawing factory.
- Added Firefox geometry assertions in normal, zoomed and fullscreen modes.
- Allowed the maintenance branch to execute the full GitHub Actions build/test pipeline without deploying to Cloudflare.

## Required before merge
- Verify latest baseline build from GitHub Actions and confirm Cloudflare release independently.
- Verify maintenance branch quick-check and Firefox/package jobs pass.
- Test desktop Firefox, mobile Chrome (including pinch gestures), full-screen resizing, and saved preferences.
- Confirm output PWA ZIP and no unintended source changes.
- Review diff, then merge only once the above gates pass.

## Maintenance CI trigger
- GitHub Actions push validation requested on November 13, 2026; this documentation-only commit is deliberately limited to the maintenance branch.
- CI may produce a ZIP artifact, but branch workflow explicitly excludes Cloudflare deployment.
