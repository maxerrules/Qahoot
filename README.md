# Qahoot

<p align="center">
  <img src="https://raw.githubusercontent.com/maxerrules/Qahoot/main/qahoot-purple.png" alt="Qahoot logo" width="480">
</p>

Turns Kahoot into Qahoot. Purely cosmetic, purely for laughs — swaps the logo and renames "Kahoot" to "Qahoot" everywhere on kahoot.it, live, while you play.

## Install (2 minutes, one time)

### Step 1 — Install Tampermonkey

Tampermonkey is a free, safe browser extension that runs small scripts on websites you choose. Pick your browser:

| Browser | Link |
|---|---|
| Chrome | [Install from Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) |
| Edge | [Install from Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Safari | [Install from the App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089) |

Click "Add to Chrome" / "Add" / "Get" and confirm. You'll see a little black-and-white Tampermonkey icon appear in your toolbar.

### Step 2 — Install the Qahoot script

**[Click here to install Qahoot](https://raw.githubusercontent.com/maxerrules/Qahoot/main/qahoot.user.js)**

Tampermonkey will open its install screen automatically. Click **Install** (top right).

> If nothing happens when you click, Tampermonkey probably isn't finished installing yet — reload the link after Step 1.

### Step 3 — Play

Go to [kahoot.it](https://kahoot.it) and join a game as usual. The logo and branding are now Qahoot everywhere: lobby, podium, splash screen, control bar, dashboard.

No further setup needed — the script updates itself automatically whenever it's improved, so you don't need to reinstall.

## Troubleshooting

- **Tampermonkey icon shows a red badge / says "Disabled"** — click the icon → make sure the toggle at the top is on.
- **Nothing changed on the page** — refresh kahoot.it after installing. Also check the Tampermonkey icon → Qahoot should be listed and enabled (toggle on).
- **Script says "obsolete" or won't run** — click the Tampermonkey icon → Dashboard → find Qahoot → the three-dot menu → "Check for updates."
- **I want it gone** — click the Tampermonkey icon → Dashboard → find Qahoot → click the trash icon. Nothing on kahoot.it is actually modified, it only changes what your browser displays.

## What this actually does

It's just a browser-side reskin — a userscript that runs only in your own browser and only rewrites what's on your screen. It doesn't touch Kahoot's servers, doesn't affect what anyone else sees, and doesn't send or store any data. See [`qahoot.user.js`](./qahoot.user.js) if you want to read exactly what it does.
