#!/usr/bin/env node
/**
 * Structural verification for the AgroBot mark's motion system.
 *
 *   node scripts/verify-mark.mjs
 *
 * Checks the invariants recorded in
 * docs/superpowers/specs/2026-07-22-agrobot-motion-port-design.md §3.
 * These are geometry and reference-integrity checks only — they pass happily on an
 * animation that is invisible, off-centre or clipped, so they do not replace looking
 * at the thing. See §8.2 for the visual checklist.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'css/agrobot-mark.css'), 'utf8');
const html = readFileSync(join(ROOT, 'agrolex.html'), 'utf8');

const OUTER_PETAL_R = 31.5; // widest individually measured tip is 31.61
const DOT_R = 2.2;

let failures = 0;
const pass = (m) => console.log(`  ok    ${m}`);
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const check = (cond, m) => (cond ? pass(m) : fail(m));
const head = (n, t) => console.log(`\n${n}. ${t}`);

/* Strip comments so commentary never counts as code. */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const cssCode = code(css);

/* Parse @keyframes NAME { ... } into a map of name -> body. Brace-counted rather than
   regex-matched, because keyframe bodies contain nested braces. */
const keyframes = new Map();
for (const m of cssCode.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
  let depth = 1, i = m.index + m[0].length;
  while (i < cssCode.length && depth > 0) {
    if (cssCode[i] === '{') depth++;
    else if (cssCode[i] === '}') depth--;
    i++;
  }
  keyframes.set(m[1], cssCode.slice(m.index + m[0].length, i - 1));
}

/* ------------------------------------------------------------------ 1 */
head(1, 'Every flower rotation is a multiple of 90deg');
{
  let found = 0;
  for (const [name, body] of keyframes) {
    if (!name.startsWith('flower-')) continue;
    for (const r of body.matchAll(/rotate\((-?[\d.]+)deg\)/g)) {
      found++;
      const deg = parseFloat(r[1]);
      if (deg % 90 !== 0) fail(`${name}: rotate(${deg}deg) is not a multiple of 90`);
    }
  }
  check(found > 0, `${found} flower rotation values found`);
  if (!failures) pass('all are multiples of 90');
}

/* ------------------------------------------------------------------ 2 */
head(2, `No held, full-scale dot sits at radius R where R - ${DOT_R} <= ${OUTER_PETAL_R}`);
{
  // Every dot position in the file, from keyframes and from the reduced-motion frames.
  const positions = [];
  const collect = (src, where) => {
    for (const m of src.matchAll(/translateY\((-?[\d.]+)px\)(?:\s*scale\(([\d.]+)\))?/g)) {
      positions.push({ where, r: Math.abs(parseFloat(m[1])), s: m[2] === undefined ? 1 : parseFloat(m[2]) });
    }
  };
  for (const [name, body] of keyframes) if (name.startsWith('dot-')) collect(body, name);
  for (const m of cssCode.matchAll(/svg\[data-state="([\w-]+)"\]\s*\{([^}]*--d-reach-t[^}]*)\}/g)) {
    collect(m[2], `reduced-motion:${m[1]}`);
  }

  // Classify rather than filter, so every exemption is named and visible.
  const held = positions.filter((p) => p.s === 1);
  const exempt = positions.filter((p) => p.s !== 1);
  for (const p of held) {
    const edge = +(p.r - DOT_R).toFixed(3);
    if (edge <= OUTER_PETAL_R) fail(`${p.where}: r=${p.r} -> inner edge ${edge} <= ${OUTER_PETAL_R}, dot is swallowed`);
  }
  check(held.length > 0, `${held.length} held full-scale positions checked, all clear the petal`);
  console.log(`        exempt (not held at full scale, so not orbit positions):`);
  for (const p of exempt) {
    const why = p.s === 0 ? 'scale(0) — invisible, emerges from / vanishes into the mark'
      : p.r < 20 ? `scale(${p.s}) — converged into the core, not an orbit position`
      : `scale(${p.s}) — mid-transition`;
    console.log(`          - ${p.where} r=${p.r} ${why}`);
  }
}

/* ------------------------------------------------------------------ 3 */
head(3, 'Animation references and @keyframes agree, with no orphans');
{
  // Referenced = first identifier of any custom-property animation shorthand.
  const referenced = new Set();
  for (const m of cssCode.matchAll(/--[\w-]+\s*:\s*([a-zA-Z][\w-]*)\s+[\d.]+m?s/g)) referenced.add(m[1]);
  const defined = new Set(keyframes.keys());

  const missing = [...referenced].filter((n) => !defined.has(n));
  const orphans = [...defined].filter((n) => !referenced.has(n));
  check(missing.length === 0, `every referenced animation has a @keyframes${missing.length ? ': missing ' + missing.join(', ') : ''}`);
  check(orphans.length === 0, `no orphaned @keyframes${orphans.length ? ': ' + orphans.join(', ') : ''}`);
  check(defined.size === 14 && referenced.size === 14, `14 defined / 14 referenced (got ${defined.size} / ${referenced.size})`);
}

/* ------------------------------------------------------------------ 4 */
head(4, 'The five reduced-motion frames are mutually distinct');
{
  const reduced = cssCode.slice(cssCode.indexOf('@media (prefers-reduced-motion'));
  const BASE = { 1: 135, 2: 225, 3: 315, 4: 45 }; // base rotations, markup order
  const STATES = ['ready', 'listening', 'researching', 'verified', 'alert'];

  const frames = STATES.map((state) => {
    const block = reduced.match(new RegExp(`svg\\[data-state="${state}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
    const op = parseFloat(block.match(/--d-op:\s*([\d.]+)/)?.[1] ?? '0');
    const hidden = [...block.matchAll(/--d(\d)-display:\s*none/g)].map((m) => +m[1]);
    const visible = [1, 2, 3, 4].filter((i) => !hidden.includes(i));
    const r = parseFloat(block.match(/--d-reach-t:\s*translateY\((-?[\d.]+)px\)/)?.[1] ?? '0');
    const sweep = parseFloat(block.match(/--d-sweep-t:\s*rotate\((-?[\d.]+)deg\)/)?.[1] ?? '0');
    // Under 4-fold symmetry an angle is only meaningful mod 90.
    const angles = op > 0 ? [...new Set(visible.map((i) => (((BASE[i] + sweep) % 90) + 90) % 90))].sort((a, b) => a - b) : [];
    return { state, key: `dots=${op > 0 ? visible.length : 0} r=${op > 0 ? Math.abs(r) : '-'} angles(mod90)=[${angles}]` };
  });

  for (const f of frames) console.log(`        ${f.state.padEnd(12)} ${f.key}`);
  const keys = frames.map((f) => f.key);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  check(dupes.length === 0, dupes.length ? `frames collide: ${[...new Set(dupes)].join(' | ')}` : 'all five frames are distinguishable');
}

/* ------------------------------------------------------------------ 5 */
head(5, "Ready's two breathing periods do not divide into each other");
{
  const block = cssCode.match(/svg\[data-state="ready"\]\s*\{([^}]*)\}/)?.[1] ?? '';
  const periods = [...block.matchAll(/[\w-]+\s+([\d.]+)s/g)].map((m) => parseFloat(m[1]));
  check(periods.length === 2, `two periods found: ${periods.join('s / ')}s`);
  if (periods.length === 2) {
    // Compare as exact integers (tenths) to avoid float modulo noise.
    const [a, b] = periods.map((p) => Math.round(p * 10));
    const gcd = (x, y) => (y ? gcd(y, x % y) : x);
    const g = gcd(Math.max(a, b), Math.min(a, b));
    const ratio = [Math.min(a, b) / g, Math.max(a, b) / g];
    check(ratio[0] > 1 && ratio[1] > 1, `ratio is ${ratio[0]}:${ratio[1]} — neither divides the other`);
    const realign = (a * b) / g / 10; // lcm, in tenths of a second
    pass(`layers realign only every ${realign.toFixed(1)}s`);
  }
}

/* ------------------------------------------------------------------ 6 */
head(6, 'Transform pivot is pinned to the mark centre (invariant h)');
{
  const symbol = html.slice(html.indexOf('id="mark-master-shapes"'), html.indexOf('id="mark-mono-shapes"') + 1 || undefined);
  const origins = [...symbol.matchAll(/transform-origin:\s*([^;"]+)/g)].map((m) => m[1].trim());
  const boxes = [...symbol.matchAll(/transform-box:\s*([^;"]+)/g)].map((m) => m[1].trim());
  check(origins.length > 0, `${origins.length} animated groups carry a transform-origin`);
  check(origins.every((o) => o === '32px 32px'),
    `every transform-origin is "32px 32px"${origins.every((o) => o === '32px 32px') ? '' : ' — found ' + [...new Set(origins)].join(', ')}`);
  check(!symbol.includes('transform-origin:50%') && !symbol.includes('transform-origin: 50%'),
    'no percentage transform-origin (would resolve to (44,44) under the 88-unit viewBox)');
  check(boxes.length === origins.length && boxes.every((b) => b === 'view-box'),
    `every one is paired with transform-box:view-box (${boxes.length}/${origins.length})`);
}

/* ------------------------------------------------------------------ 7 */
head(7, 'assets/agrobot.svg is well-formed XML');
{
  /* SVG served through <img> or background-image is parsed as strict XML. A malformed file
     renders as NOTHING, with no console error and no failing structural check — the static
     size row simply goes blank. This shipped once: an explanatory comment mentioning the
     custom properties by name put a double hyphen inside a comment, which XML forbids. */
  const svg = readFileSync(join(ROOT, 'assets/agrobot.svg'), 'utf8');
  const comments = [...svg.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]);
  const badComment = comments.find((c) => c.includes('--'));
  check(!badComment, badComment ? `a comment contains a double hyphen: "...${badComment.match(/.{0,40}--.{0,20}/)?.[0]}..."` : 'no comment contains a double hyphen');

  // Cheap well-formedness pass: tags balance and every attribute value is quoted.
  const stack = [];
  let balanced = true;
  for (const m of svg.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([\w:-]+)([^>]*?)(\/?)>/g)) {
    const [, close, tag, , self] = m;
    if (close) { if (stack.pop() !== tag) balanced = false; }
    else if (!self) stack.push(tag);
  }
  check(balanced && stack.length === 0, `tags balance (${stack.length} unclosed)`);
  check(/^<svg[^>]*\bviewBox="0 0 64 64"/m.test(svg), 'static mark keeps viewBox="0 0 64 64"');
}

console.log(`\n${failures === 0 ? 'PASS — all structural checks green.' : `FAIL — ${failures} problem(s).`}`);
console.log('Structural only. Confirm the five states visually before calling this done.');
process.exit(failures === 0 ? 0 : 1);
