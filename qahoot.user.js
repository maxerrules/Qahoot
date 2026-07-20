// ==UserScript==
// @name         Qahoot
// @namespace    qahoot-prank
// @version      1.2
// @description  Replace Kahoot logo with Qahoot logo
// @match        https://*.kahoot.it/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const QAHOOT_LOGO = "https://github.com/maxerrules/Qahoot/blob/main/qahoot.png?raw=true";
  const KAHOOT_PURPLE = "#46178F";

  function isGoVariant(node) {
    const text = [node.alt, node.getAttribute?.('aria-label'), node.className]
      .filter(Boolean).join(' ');
    return /\bgo\b/i.test(text);
  }

  function svgSwap(node, w, h) {
    const go = isGoVariant(node);
    node.setAttribute('viewBox', `0 0 ${w} ${h}`);
    node.innerHTML = `
      <rect x="0" y="0" width="${w}" height="${h}" fill="${KAHOOT_PURPLE}"/>
      <image href="${QAHOOT_LOGO}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>
      ${go ? `<text x="${w - 4}" y="${h - 6}" text-anchor="end" font-family="Verdana, Arial, sans-serif" font-weight="700" font-size="${h * 0.22}" fill="#FFFFFF">GO</text>` : ''}
    `;
  }

  function imgSwap(node) {
    const go = isGoVariant(node);
    const wrapper = document.createElement('span');
    wrapper.style.cssText = `display:inline-flex;align-items:center;gap:4px;background:${KAHOOT_PURPLE};padding:4px 8px;border-radius:4px;`;
    wrapper.style.height = getComputedStyle(node).height;

    const img = document.createElement('img');
    img.src = QAHOOT_LOGO;
    img.alt = node.alt || 'Logo';
    img.style.cssText = 'height:100%;width:auto;display:block;';

    wrapper.appendChild(img);
    if (go) {
      const badge = document.createElement('span');
      badge.textContent = 'GO';
      badge.style.cssText = 'color:#FFFFFF;font-weight:700;font-family:Verdana,Arial,sans-serif;font-size:0.9em;';
      wrapper.appendChild(badge);
    }
    node.replaceWith(wrapper);
  }

  const RULES = [
    {
      // Top control bar logo (game) — inline SVG, keep node for animation
      selector: 'svg[data-functional-selector="control-bar-logo"]',
      swap: (node) => svgSwap(node, 440, 150)
    },
    {
      // Lobby + podium logo — real <img>, matched by CDN asset ID
      selector: 'img[class*="game-logo__Image"], img[src*="images-cdn.kahoot.it/c6b640b1-ed34-4645-828c-326c42190340"]',
      swap: (node) => imgSwap(node)
    },
    {
      // Splash/gong screen logo — inline SVG, keep node for animation
      selector: 'svg[alt="Kahoot! logo"], svg[class*="splash-screen__SplashLogo"]',
      swap: (node) => svgSwap(node, 440, 150)
    },
    {
      // Dashboard top-bar logo — two <path> elements: [0]=wordmark, [1]=GO mark (if present)
      selector: 'span[data-functional-selector="kahoot-logo"] svg',
      swap: (node) => {
        const paths = node.querySelectorAll('path');
        if (paths.length === 0) return;

        const wordmarkPath = paths[0];
        const bbox = wordmarkPath.getBBox();

        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', QAHOOT_LOGO);
        image.setAttribute('x', bbox.x);
        image.setAttribute('y', bbox.y);
        image.setAttribute('width', bbox.width);
        image.setAttribute('height', bbox.height);
        image.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', bbox.x);
        rect.setAttribute('y', bbox.y);
        rect.setAttribute('width', bbox.width);
        rect.setAttribute('height', bbox.height);
        rect.setAttribute('fill', KAHOOT_PURPLE);

        wordmarkPath.replaceWith(rect, image);
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
