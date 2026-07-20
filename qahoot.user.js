// ==UserScript==
// @name         Qahoot
// @namespace    qahoot-prank
// @version      1.4
// @description  Replace Kahoot logo with Qahoot logo
// @match        https://*.kahoot.it/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/maxerrules/Qahoot/main/qahoot.user.js
// @downloadURL  https://raw.githubusercontent.com/maxerrules/Qahoot/main/qahoot.user.js
// ==/UserScript==

(function () {
  'use strict';

  // White silhouette on a transparent background — correct as-is on Kahoot's
  // colored surfaces. On light/white surfaces it's recolored to KAHOOT_PURPLE
  // via an SVG mask, never boxed. Which case applies is NOT assumed per
  // selector (backgrounds vary by theme/skin) — it's read off the fill Kahoot
  // itself already painted the original logo with: if their wordmark is
  // purple, that instance sits on a light background and needs recoloring;
  // if it's already white (or anything else), it's on a colored/dark
  // background and the white silhouette drops in unchanged.
  const QAHOOT_LOGO = "https://github.com/maxerrules/Qahoot/blob/main/qahoot.png?raw=true";
  const KAHOOT_PURPLE = "#46178F";
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';

  let maskCounter = 0;

  function isGoVariant(node) {
    const text = [node.alt, node.getAttribute?.('aria-label'), node.className]
      .filter(Boolean).join(' ');
    return /\bgo\b/i.test(text);
  }

  function parseColorToRgb(colorStr) {
    if (!colorStr || colorStr === 'none') return null;
    const probe = document.createElement('span');
    probe.style.color = colorStr;
    document.documentElement.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    const m = resolved.match(/\d+/g);
    return m ? m.slice(0, 3).map(Number) : null;
  }

  // Kahoot's purple family (e.g. #46178F) reads as a violet hue: blue is the
  // dominant channel and red outweighs green. That signature is distinct
  // from white, and from Kahoot's other brand colors (blue/red/teal/yellow),
  // so it's a reliable "this instance needs recoloring" signal.
  function isPurpleFill(colorStr) {
    const rgb = parseColorToRgb(colorStr);
    if (!rgb) return false;
    const [r, g, b] = rgb;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max > 235 && min > 235) return false; // near-white
    if (max < 20) return false; // near-black / fully transparent probe
    return b > g + 15 && r > g;
  }

  // Draws the recolored-or-not logo into an x/y/w/h box, based on whatever
  // fill Kahoot's own original element had at that spot.
  function paintLogo(x, y, w, h, originalFill, appendMaskTo) {
    if (isPurpleFill(originalFill)) {
      return purpleMaskedRect(x, y, w, h, appendMaskTo);
    }
    const image = document.createElementNS(SVG_NS, 'image');
    image.setAttributeNS(XLINK_NS, 'href', QAHOOT_LOGO);
    image.setAttribute('x', x);
    image.setAttribute('y', y);
    image.setAttribute('width', w);
    image.setAttribute('height', h);
    image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return image;
  }

  function svgSwapAdaptive(node, w, h) {
    const originalPath = node.querySelector('path, [fill]');
    const fill = originalPath ? (originalPath.getAttribute('fill') || getComputedStyle(originalPath).fill) : null;
    const go = isGoVariant(node);
    node.setAttribute('viewBox', `0 0 ${w} ${h}`);
    node.innerHTML = '';
    node.appendChild(paintLogo(0, 0, w, h, fill, node));
    if (go) {
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', w - 4);
      text.setAttribute('y', h - 6);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-family', 'Verdana, Arial, sans-serif');
      text.setAttribute('font-weight', '700');
      text.setAttribute('font-size', h * 0.22);
      text.setAttribute('fill', isPurpleFill(fill) ? KAHOOT_PURPLE : '#FFFFFF');
      text.textContent = 'GO';
      node.appendChild(text);
    }
  }

  function imgSwap(node) {
    const go = isGoVariant(node);
    node.removeAttribute('srcset');
    node.src = QAHOOT_LOGO;
    if (go) {
      const badge = document.createElement('span');
      badge.textContent = 'GO';
      badge.style.cssText = 'color:#FFFFFF;font-weight:700;font-family:Verdana,Arial,sans-serif;font-size:0.9em;margin-left:4px;';
      node.insertAdjacentElement('afterend', badge);
    }
  }

  // Recolors the white silhouette to Kahoot purple by using it as an SVG
  // luminance mask over a solid rect, rather than drawing it white-on-white
  // or boxing it.
  function purpleMaskedRect(x, y, w, h, appendMaskTo) {
    const uid = `qahoot-mask-${maskCounter++}`;

    const mask = document.createElementNS(SVG_NS, 'mask');
    mask.setAttribute('id', uid);
    mask.setAttribute('maskUnits', 'userSpaceOnUse');

    const image = document.createElementNS(SVG_NS, 'image');
    image.setAttributeNS(XLINK_NS, 'href', QAHOOT_LOGO);
    image.setAttribute('x', x);
    image.setAttribute('y', y);
    image.setAttribute('width', w);
    image.setAttribute('height', h);
    image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    mask.appendChild(image);
    appendMaskTo.appendChild(mask);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', KAHOOT_PURPLE);
    rect.setAttribute('mask', `url(#${uid})`);
    return rect;
  }

  const RULES = [
    {
      // Top control bar logo (game) — usually a colored background, inline SVG
      selector: 'svg[data-functional-selector="control-bar-logo"]',
      swap: (node) => svgSwapAdaptive(node, 440, 150)
    },
    {
      // Lobby + podium logo — colored background, real <img> (no fill to read,
      // so no purple-adaptive path here; always white)
      selector: 'img[class*="game-logo__Image"], img[src*="images-cdn.kahoot.it/c6b640b1-ed34-4645-828c-326c42190340"]',
      swap: (node) => imgSwap(node)
    },
    {
      // Splash/gong screen logo — usually a colored background, inline SVG
      selector: 'svg[alt="Kahoot! logo"], svg[class*="splash-screen__SplashLogo"]',
      swap: (node) => svgSwapAdaptive(node, 440, 150)
    },
    {
      // Dashboard top-bar logo — two <path> elements: [0]=wordmark
      // (recolored to match its original fill), [1]=GO mark (left untouched).
      selector: 'span[data-functional-selector="kahoot-logo"] svg',
      swap: (node) => {
        const paths = node.querySelectorAll('path');
        if (paths.length === 0) return;

        const wordmarkPath = paths[0];
        const fill = wordmarkPath.getAttribute('fill') || getComputedStyle(wordmarkPath).fill;
        const bbox = wordmarkPath.getBBox();
        const el = paintLogo(bbox.x, bbox.y, bbox.width, bbox.height, fill, node);
        wordmarkPath.replaceWith(el);
      }
    },
  ];

  function swapText(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parentTag = node.parentElement?.tagName;
        if (parentTag === 'SCRIPT' || parentTag === 'STYLE') return NodeFilter.FILTER_REJECT;
        return /kahoot/i.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(node => {
      node.nodeValue = node.nodeValue
        .replace(/KAHOOT/g, 'QAHOOT')
        .replace(/Kahoot/g, 'Qahoot')
        .replace(/kahoot/g, 'qahoot');
    });
  }

  function markDone(node) {
    node.dataset.qahootSwapped = 'true';
  }

  function alreadyDone(node) {
    return node.dataset && node.dataset.qahootSwapped === 'true';
  }

  function applyRules(root = document) {
    RULES.forEach(rule => {
      root.querySelectorAll(rule.selector).forEach(node => {
        if (alreadyDone(node)) return;
        markDone(node);
        rule.swap(node);
      });
    });
  }

  applyRules();
  swapText();

  new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        applyRules(node.parentElement || document);
        swapText(node.parentElement || document.body);
      });
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
