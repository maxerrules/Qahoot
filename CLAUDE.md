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

1. **Logo replacement (`RULES` array)** — a list of `{ selector, swap }` pairs, one per distinct place the Kahoot logo appears in the app (control bar, lobby/podium `<img>`, splash screen, dashboard top bar). The swap strategy per rule depends on what's behind the logo, since `qahoot.png` is a white silhouette that must be recolored per background rather than boxed:
   - `svgSwapWhite(node, w, h)` — used on Kahoot's purple surfaces (control bar, splash screen), where the white logo is already correct as-is. Rewrites the SVG's `innerHTML` with an `<image>` pointing at `QAHOOT_LOGO` and, if `isGoVariant` detects a "Kahoot Go" context, an appended white "GO" text label.
   - `imgSwap(node)` — used for the purple-background lobby/podium `<img>`. Mutates `src`/`srcset` on the existing node in place (not a wrapper) so original classes/layout/animation survive; appends a plain "GO" text badge after it when detected.
   - The dashboard rule sits on a **white** surface, so the white silhouette would be invisible there. It does **not** rewrite the whole SVG or box the logo: the dashboard SVG has two `<path>` elements — `[0]` is the Kahoot wordmark, `[1]` is the separate "GO" mark. The rule measures `paths[0].getBBox()` and replaces only that path with `purpleMaskedRect()` — a purple `<rect>` masked by an SVG `<mask>` containing `<image href="QAHOOT_LOGO">`, so the letters render in Kahoot purple with no background box. The GO path is left completely untouched. `maskCounter` keeps generated mask IDs unique across multiple instances on the page.
   - Each node is marked with `dataset.qahootSwapped = 'true'` after its first swap so the observer doesn't re-process it.
   - If a new logo location has a different background color, follow the same principle: white logo on colored/dark backgrounds via `svgSwapWhite`/`imgSwap`, purple-masked via `purpleMaskedRect` on white/light backgrounds — never a background box.

2. **Text replacement (`swapText`)** — walks text nodes (skipping `<script>`/`<style>`) and does a case-preserving find/replace of "Kahoot" → "Qahoot" (`KAHOOT`→`QAHOOT`, `Kahoot`→`Qahoot`, `kahoot`→`qahoot`). Runs independently of the logo rules and isn't gated by `dataset.qahootSwapped`, since it re-scans on every mutation (text nodes are cheap to re-check and don't carry state).

When adding a new logo location on kahoot.it, add a new entry to `RULES` rather than extending an existing selector — the four existing swap strategies are tailored to their specific markup and aren't meant to be generalized.
