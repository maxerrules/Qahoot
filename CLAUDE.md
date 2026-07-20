# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A single Tampermonkey userscript (`qahoot.user.js`) that rebrands the live Kahoot.it web app to "Qahoot" — swapping the Kahoot wordmark/logo for `qahoot.png` and replacing "Kahoot" text throughout the DOM. There is no build system, package manager, or test suite — the two files in this repo (`qahoot.user.js`, `qahoot.png`) are the entire deliverable.

`qahoot.png` is referenced by the script itself via its raw GitHub URL (`https://github.com/maxerrules/Qahoot/blob/main/qahoot.png?raw=true`), so the image must stay at that path on `main` for the live script to keep working.

## Testing changes

There is no automated test suite. Verify changes by installing `qahoot.user.js` in Tampermonkey (or a similar userscript manager) and loading `https://*.kahoot.it/*` — check the control bar, lobby/podium screen, splash/gong screen, and dashboard, since each has its own DOM structure and swap rule (see below).

## Architecture

The script is a single self-invoking function with two independent replacement passes, both re-run on every DOM mutation via a single `MutationObserver` on `document.documentElement`:

1. **Logo replacement (`RULES` array)** — a list of `{ selector, swap }` pairs, one per distinct place the Kahoot logo appears in the app (control bar, lobby/podium `<img>`, splash screen, dashboard top bar). Each surface renders the logo differently (inline animated SVG vs. plain `<img>`), so each rule has its own swap strategy:
   - `svgSwap(node, w, h)` — used for animated inline SVG logos. Rewrites the SVG's `innerHTML` entirely: a purple (`#46178F`) background `<rect>`, an `<image>` pointing at `QAHOOT_LOGO`, and (if `isGoVariant` detects a "Kahoot Go" context) an appended "GO" text label.
   - `imgSwap(node)` — used for plain `<img>` logos. Wraps a new `<img>` in a purple `<span>` badge, preserving a "GO" label the same way.
   - The dashboard rule is more surgical: it does **not** rewrite the whole SVG. The dashboard logo SVG has two `<path>` elements — `[0]` is the Kahoot wordmark, `[1]` is the separate "GO" mark. The rule measures `paths[0].getBBox()` and replaces only that first path with a purple `<rect>` + `<image>` sized to match, leaving the GO path completely untouched. This is deliberately different from the other three rules — don't collapse it into `svgSwap`.
   - Each node is marked with `dataset.qahootSwapped = 'true'` after its first swap so the observer doesn't re-process it.

2. **Text replacement (`swapText`)** — walks text nodes (skipping `<script>`/`<style>`) and does a case-preserving find/replace of "Kahoot" → "Qahoot" (`KAHOOT`→`QAHOOT`, `Kahoot`→`Qahoot`, `kahoot`→`qahoot`). Runs independently of the logo rules and isn't gated by `dataset.qahootSwapped`, since it re-scans on every mutation (text nodes are cheap to re-check and don't carry state).

When adding a new logo location on kahoot.it, add a new entry to `RULES` rather than extending an existing selector — the four existing swap strategies are tailored to their specific markup and aren't meant to be generalized.
