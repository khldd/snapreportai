// Builds the SnapReport social & content standards PDF.
// Inlines the official logo vectors from logos/snapreport as a sprite, expands the
// <x-logo>/<x-fc> shorthands in guide.html, then prints with headless Edge/Chrome.
//
//   node guidelines/social-media/build.mjs          -> guidelines/SnapReport-Social-Content-Standards-v1.0.pdf
//   node guidelines/social-media/build.mjs --keep   -> also keeps _build.html for screen preview
//   BROWSER="C:/path/to/chrome.exe" node ...        -> use another Chromium browser

import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const keep = process.argv.includes('--keep');

const logos = {
  symbol: 'logos/snapreport/symbol/snapreport-symbol-blue.svg',
  wordmark: 'logos/snapreport/wordmark/snapreport-wordmark-blue.svg',
  horizontal: 'logos/snapreport/lockup-horizontal/snapreport-horizontal-blue.svg',
  stacked: 'logos/snapreport/lockup-stacked/snapreport-stacked-blue.svg',
};

const viewBoxes = {};
const defs = Object.entries(logos).map(([key, rel]) => {
  const svg = readFileSync(path.join(root, rel), 'utf8');
  viewBoxes[key] = svg.match(/viewBox="([^"]+)"/)[1];
  // Keep the artwork, drop the hard-coded fill so CSS `color` decides the variant.
  const open = svg.match(/<g\b[^>]*>/);
  const inner = svg.slice(open.index + open[0].length, svg.lastIndexOf('</g>'));
  return `<g id="sr-${key}" fill-rule="evenodd" clip-rule="evenodd">${inner}</g>`;
}).join('\n');

const sprite = `<svg class="sprite" aria-hidden="true"><defs>
${defs}
<linearGradient id="bad-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5A36"/><stop offset="1" stop-color="#8FA6FF"/></linearGradient>
</defs></svg>`;

const html = readFileSync(path.join(here, 'guide.html'), 'utf8')
  .replace('<!-- @sprite -->', sprite)
  .replace(/<x-logo k="(\w+)"(?: c="([^"]*)")?(?: s="([^"]*)")?><\/x-logo>/g, (_, k, c = '', s = '') => {
    if (!viewBoxes[k]) throw new Error(`Unknown logo form: ${k}`);
    return `<svg class="logo ${c}" viewBox="${viewBoxes[k]}"${s ? ` style="${s}"` : ''} aria-hidden="true"><use href="#sr-${k}"/></svg>`;
  })
  .replace(/<x-fc><\/x-fc>/g, '<i class="fc tl"></i><i class="fc tr"></i><i class="fc bl"></i><i class="fc br"></i>');

if (/<x-/.test(html)) throw new Error('Unexpanded <x-…> shorthand left in guide.html');

const built = path.join(here, '_build.html');
writeFileSync(built, html);

const browser = process.env.BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const out = path.join(root, 'guidelines', 'SnapReport-Social-Content-Standards-v1.0.pdf');
const profile = mkdtempSync(path.join(os.tmpdir(), 'sr-pdf-'));

try {
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=20000',
    `--user-data-dir=${profile}`,
    `--print-to-pdf=${out}`,
    pathToFileURL(built).href,
  ], { stdio: 'inherit' });
} finally {
  rmSync(profile, { recursive: true, force: true });
  if (!keep) rmSync(built, { force: true });
}

console.log(`PDF written: ${path.relative(root, out)}`);
