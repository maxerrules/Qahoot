// ==UserScript==
// @name         Qahoot
// @namespace    qahoot-prank
// @version      1.3
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
  // purple surfaces (control bar, splash screen, podium). On white surfaces
  // (dashboard) it's recolored to KAHOOT_PURPLE via an SVG mask, never boxed.
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

  // Used on Kahoot's purple surfaces: the white logo is dropped in directly.
  function svgSwapWhite(node, w, h) {
    const go = isGoVariant(node);
    node.setAttribute('viewBox', `0 0 ${w} ${h}`);
    node.innerHTML = `
      <image href="${QAHOOT_LOGO}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>
      ${go ? `<text x="${w - 4}" y="${h - 6}" text-anchor="end" font-family="Verdana, Arial, sans-serif" font-weight="700" font-size="${h * 0.22}" fill="#FFFFFF">GO</text>` : ''}
    `;
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

  // Used on the dashboard's white surface: recolors the white silhouette to
  // Kahoot purple by using it as an SVG luminance mask over a solid rect,
  // rather than drawing it white-on-white or boxing it.
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
      // Top control bar logo (game) — purple background, inline SVG
      selector: 'svg[data-functional-selector="control-bar-logo"]',
      swap: (node) => svgSwapWhite(node, 440, 150)
    },
    {
      // Lobby + podium logo — purple background, real <img>
      selector: 'img[class*="game-logo__Image"], img[src*="images-cdn.kahoot.it/c6b640b1-ed34-4645-828c-326c42190340"]',
      swap: (node) => imgSwap(node)
    },
    {
      // Splash/gong screen logo — purple background, inline SVG
      selector: 'svg[alt="Kahoot! logo"], svg[class*="splash-screen__SplashLogo"]',
      swap: (node) => svgSwapWhite(node, 440, 150)
    },
    {
      // Dashboard top-bar logo — white background. Two <path> elements:
      // [0]=wordmark (recolored purple via mask), [1]=GO mark (left untouched).
      selector: 'span[data-functional-selector="kahoot-logo"] svg',
      swap: (node) => {
        const paths = node.querySelectorAll('path');
        if (paths.length === 0) return;

        const wordmarkPath = paths[0];
        const bbox = wordmarkPath.getBBox();
        const rect = purpleMaskedRect(bbox.x, bbox.y, bbox.width, bbox.height, node);
        wordmarkPath.replaceWith(rect);
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
