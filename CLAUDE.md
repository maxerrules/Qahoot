# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A single Tampermonkey userscript (`qahoot.user.js`) that rebrands the live Kahoot.it web app to "Qahoot" — swapping the Kahoot wordmark/logo for `qahoot.png` and replacing "Kahoot" text throughout the DOM. There is no build system, package manager, or test suite — the two files in this repo (`qahoot.user.js`, `qahoot.png`) are the entire deliverable.

`qahoot.png` is referenced by the script itself via its raw GitHub URL (`https://github.com/maxerrules/Qahoot/blob/main/qahoot.png?raw=true`), so the image must stay at that path on `main` for the live script to keep working. It's a white silhouette on a transparent background (verified by pixel-sampling), not a full-color image — it's meant to be recolored per surface, not boxed.

The script itself ships with `@updateURL`/`@downloadURL` pointing at `https://raw.githubusercontent.com/maxerrules/Qahoot/main/qahoot.user.js`, so Tampermonkey auto-checks `main` for updates. Any change meant to reach installed users must be merged to `main` and have its `@version` bumped, or Tampermonkey won't see it as newer.

## Testing changes

There is no automated test suite. Verify changes by installing `qahoot.user.js` in Tampermonkey (or a similar userscript manager) and loading `https://*.kahoot.it/*` — check the control bar, lobby/podium screen, splash/gong screen, and dashboard, since each has its own DOM structure and swap rule (see below).

## Architecture

The script is a single self-invoking function with two independent replacement passes, both re-run on every DOM mutation via a single `MutationObserver` on `document.documentElement`:

1. **Logo replacement (`RULES` array)** — a list of `{ selector, swap }` pairs, one per distinct place the Kahoot logo appears in the app (control bar, lobby/podium `<img>`, splash screen, dashboard top bar). Since `qahoot.png` is a white silhouette, it needs recoloring to Kahoot purple wherever it sits on a light/white background — but which surfaces are light isn't hardcoded per selector (skins/themes vary). Instead it's detected per instance from the fill Kahoot's own original element already had:
   - `isPurpleFill(colorStr)` — resolves a CSS color string to RGB (via a throwaway probe element + `getComputedStyle`, so it handles hex/named/rgb() alike) and checks for a violet signature (blue dominant, red > green). Kahoot paints its own wordmark purple precisely when that instance needs light-background contrast, so "was the original fill purple" is a reliable proxy for "is this a light background" — far more robust than assuming by selector.
   - `paintLogo(x, y, w, h, originalFill, appendMaskTo)` — the shared decision point. If `isPurpleFill(originalFill)`, draws `purpleMaskedRect()` (a purple `<rect>` masked by an SVG `<mask>` containing `<image href="QAHOOT_LOGO">`, so the letters render in Kahoot purple with no background box); otherwise draws a plain `<image href="QAHOOT_LOGO">` (the white silhouette, already correct as-is).
   - `svgSwapAdaptive(node, w, h)` — used for control-bar and splash-screen SVGs. Reads the fill off the original SVG's first `path`/`[fill]` element before clearing it, rewrites `innerHTML` via `paintLogo`, and appends a "GO" text label (color-matched the same way) if `isGoVariant` detects a "Kahoot Go" context.
   - `imgSwap(node)` — used for the lobby/podium `<img>`. A raster `<img>` has no fill to read, so this path always uses the white logo (mutates `src`/`srcset` in place, not a wrapper, so original classes/layout/animation survive); appends a plain white "GO" text badge when detected.
   - The dashboard rule is the most surgical: it never rewrites the whole SVG. The dashboard SVG has two `<path>` elements — `[0]` is the Kahoot wordmark, `[1]` is the separate "GO" mark. The rule reads `paths[0]`'s fill, measures its `getBBox()`, and replaces only that path via `paintLogo`, leaving the GO path completely untouched. `maskCounter` keeps generated mask IDs unique across multiple instances on the page.
   - Each node is marked with `dataset.qahootSwapped = 'true'` after its first swap so the observer doesn't re-process it.
   - When adding a rule for a new SVG logo location, route it through `paintLogo` with the original fill rather than assuming a background color — that's the whole point of the adaptive approach. Only fall back to a fixed white/purple choice where there's genuinely no fill to read (as in `imgSwap`).

2. **Text replacement (`swapText`)** — walks text nodes (skipping `<script>`/`<style>`) and does a case-preserving find/replace of "Kahoot" → "Qahoot" (`KAHOOT`→`QAHOOT`, `Kahoot`→`Qahoot`, `kahoot`→`qahoot`). Runs independently of the logo rules and isn't gated by `dataset.qahootSwapped`, since it re-scans on every mutation (text nodes are cheap to re-check and don't carry state).

When adding a new logo location on kahoot.it, add a new entry to `RULES` rather than extending an existing selector — the four existing swap strategies are tailored to their specific markup and aren't meant to be generalized.
