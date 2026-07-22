# AgroBot motion system port — design

**Date:** 2026-07-22
**Target repo:** `snapreportai.com`
**Source:** Open Design project `agrobot-premium-identity` — `agrobot-third-direction.html`, `DESIGN.md`, `MOTION.md`

---

## 1. What this replaces

The app's current AgroBot mark is a different piece of geometry: 6 petals plus a hexagonal
seed, `viewBox="217 751 2048 2048"`, seven hardcoded green hex fills, and **one SVG file per
state**. States are selected by swapping `background-image` URLs on a `.agent-mark` element.

The new mark is two layers of the same 4-lobed petal — inner, plus outer rotated 45° — over a
core. `viewBox="0 0 64 64"`, centre `(32,32)`, all fills driven by CSS custom properties, and
**one symbol carrying a `data-state` attribute** instead of one file per state.

### The structural blocker

`background: url("../assets/agrobot.svg")` cannot carry CSS custom properties into the
referenced document. `--mk-outer`, `--d-reach`, and every other hook is inert in that form.
The port is therefore not a file swap: every motion-bearing instance must become an inline
`<svg><use href="#mark-master-shapes"></svg>`. This is the bulk of the consumer work.

---

## 2. Decisions taken

| Question | Decision |
|---|---|
| Safety net | `git init` + baseline commit of the untouched tree. Done: `3e38a38`. |
| `alert` vs `new-regulation` | **Keep `alert`** in the app. The design's `new-regulation` maps onto it. |
| `trace` / `lot` / `disposition` marks | **Leave all three untouched.** |
| Motion scope | **Only state-driven instances.** Logos and favicons stay static. |
| Verified confirm ring | Enlarge to radius 28, `scale(3.33)` — see §7. |
| Verified dot start radius | Move `34` → `38` — see §7. |

### Why `trace`, `lot` and `disposition` are out of scope

They are not states of this mark. They are rival identity directions:

- `agrobot-trace.svg` / `agrobot-trace-micro.svg` — the "Evidence Trace" direction
  (Identity proposal 03): a route path with checkpoints and a proof ring. Entirely different
  geometry, served by its own `agrobot-trace.html`, `css/agrobot-trace.css` and
  `js/agrobot-trace.js`. None of MOTION.md's geometry constants apply to it.
- `agrobot-lot.svg` / `agrobot-lot-micro.svg` — grain kernels over a lot code. Referenced
  nowhere in the codebase.
- `agrobot-disposition.svg` — **already contains the new petal and core paths**, identical `d`
  attributes. It is the static export of the direction being adopted. Referenced nowhere.

The original brief listed `agrobot-disposition.svg` for replacement. Because it already holds
the target geometry, replacing it would be a near no-op, and it is left alone under the
decision above. Recorded here so the divergence from the brief is deliberate, not forgotten.

### Consumers that need no change

- `agrobot-trace.html`, `js/agrobot-trace.js` — reference only `agrobot-trace*.svg` and belong
  to the separate Evidence Trace direction. **No edits.**
- `index.html` — the brief listed it as a consumer. It contains **zero** `agrobot.svg`
  references (verified: `grep -c` returns 0); it is the SnapReport identity-standards page, not
  a myQA.team product page. **No edits.**

---

## 3. Load-bearing invariants

These are not style preferences. Each one has a recorded failure behind it.

**a. Animations are driven by inherited CSS custom properties on inline styles.**
Descendant selectors do not cross the `<use>` shadow tree boundary. `svg[data-state="x"]` sets
custom properties; elements inside the symbol consume them via inline
`style="animation:var(--d-reach,none)"`. Custom properties set on the `<svg>` or any ancestor
*do* inherit inward — that is the whole mechanism. Refactoring these into ordinary CSS rules
that target elements inside the symbol will silently break every state.

**b. Every flower rotation is a multiple of 90°.**
The petal is 4-fold symmetric — lobe apexes measured at 0.17 / 90.14 / 180.00 / 271.48°, radii
within 1%. Multiples of 90° land visually identical, which is the only reason these turns loop
without snapping. A non-multiple leaves the mark visibly rotated at rest.

**c. viewBox and sizing.**
Motion instances use `viewBox="-12 -12 88 88"`; static instances keep `0 0 64 64`. Centre is
`(32,32)` in both. Motion instances need **1.375×** the CSS width/height to render the mark at
the same visual size. Omitting this shrinks the mark to 73% with no other symptom.

**d. Geometry constants (64-unit space).**
Outer petal reaches **r=31.5**; the widest individually measured tip is **31.61**. Dot ring
**r=38**, dot radius **2.2**, launch **31.2**, retract **27**. Dots at 45/135/225/315°, written
as `rotate(135|225|315|45, 32, 32)`.

Any **held, full-scale** dot radius R must satisfy `R − 2.2 > 31.5`, or the dot is swallowed by
the petal and disappears. This bug shipped once already. Two positions are exempt *by design*
and must be excluded from the check rather than silently tripping it:

- `dot-research-reach` starts at r=31.2 with `scale(0)` — it emerges *from* the mark. Its inner
  edge is `31.2 + 4.6t`, crossing 31.5 at t≈0.07, while its scale is still ~0.07. Transient.
- Verified's reduced-motion frame sits at r=12 because the dots have **merged into the core**.
  It is not an orbit position.

**e. Colour hooks.** `--mk-outer`, `--mk-inner`, `--mk-dot`, `--mk-sat`.
Dots resolve `var(--mk-sat, var(--mk-dot, var(--green)))`. On dark or ink grounds `--mk-sat`
must be set to a light value, or the dots are green-on-green and invisible.

**f. Reduced motion** needs five distinguishable static frames. Listening's frozen frame must be
`rotate(45deg)` — **not** 90°, which under 4-fold symmetry renders identically to Researching.

**g. Ready's breathing is a documented exception** to the "no decorative breathing" ban in
`DESIGN.md`. Its four conditions are binding: the periods must not divide into each other
(5.2s / 6.8s = 13:17, realigning only every 88.4s), amplitude stays small, the core stays
**outside** both breathing groups as a fixed anchor, and reduced motion renders it completely
still.

---

## 4. Architecture

### 4.1 Symbol delivery — inline `<defs>` in `agrolex.html`

Three options were considered:

| Option | Verdict |
|---|---|
| **A. Inline `<defs>` once in `agrolex.html`** | **Chosen.** Every motion consumer lives in that one file. Same-document `<use>` is the only form where custom-property inheritance into the shadow tree is reliable across browsers — which is exactly what invariant (a) rests on. |
| B. External sprite + `<use href="assets/agrobot-mark.svg#...">` | Rejected. External `<use>` has inconsistent custom-property inheritance across browsers and fails under `file://` CORS. It attacks the single most fragile invariant. |
| C. JS-injected defs | Rejected. The mark is blank until JS runs, and the static state grid stops rendering without it. |

The `<defs>` block is inserted once immediately after `<body>` in `agrolex.html`, containing
`#mark-petal-shape`, `#mark-core-shape`, and `#mark-master-shapes`.

`#mark-master-shapes` composition, in paint order:

1. outer petal group — `--outer-transform`, `--outer-animation`, rotated 45° via matrix
2. inner petal group — `--inner-transform`, `--inner-animation`
3. core — fixed, **outside both breathing groups** per invariant (g)
4. `.ring-pulse` circle, `r=5.8` — New Regulation
5. `.confirm-ring` circle, `r=8.4` — Verified
6. `.src-dots` — four dots, each three nested transforms (base rotation → sweep → reach+scale)

Rings paint **after** the petals, so they overlay rather than hide behind them. MOTION.md's
phrase "pulsed entirely behind the petals" is loose: the old r=15 ring was not occluded, it was
small and lost in the mark's centre where the core already sits.

### 4.2 State plumbing

`data-state` currently lives on `.agent-stage`, and `activateState()` sets
`agentStage.dataset.state`. The ported selectors key off `svg[data-state]`.

`activateState()` mirrors the state onto each mark `<svg>` inside the stage, using MOTION.md
§5.0's **remove `data-state` → force reflow → re-apply** sequence so switching mid-gesture never
strands dots at an arbitrary position. The stage keeps its own `data-state` for the existing
source-node and status-dot rules. State-grid svgs carry `data-state` authored directly in HTML.
`stateOrder` is unchanged: `["ready","listening","researching","verified","alert"]`.

### 4.3 Colour per ground

| Instance | Ground | Hooks |
|---|---|---|
| `.agent-mark--hero` | `var(--white)` | defaults: outer ink, inner mist, dot green |
| `.state-icon .agent-mark` ×5 | `#0b493b` dark | `--mk-outer:var(--mist); --mk-inner:var(--white); --mk-sat:var(--mist)` |
| `.chat-agent .agent-mark` | `var(--white)` | defaults |

The dark state-grid ground **requires** `--mk-sat` per invariant (e). The existing
`filter:brightness(0) invert(1)` hack at `css/agrolex.css:187-190` is dropped for these three
instances, since colour now comes from variables rather than filtering a raster-like background.

---

## 5. File-by-file changes

### Assets

| File | Change |
|---|---|
| `assets/agrobot.svg` | Rewritten to the new geometry, `viewBox="0 0 64 64"`. **Self-contained with baked fills** (ink `#073C30` outer, mist `#E2F4EC` inner, green `#009966` core) — it is consumed via `<img>` and as a favicon, where page CSS variables cannot reach. |
| `deploy/assets/agrobot.svg` | Same file, copied. |
| `assets/agrobot-ready.svg` | Deleted — superseded by `data-state`. |
| `assets/agrobot-listening.svg` | Deleted. |
| `assets/agrobot-researching.svg` | Deleted. |
| `assets/agrobot-alert.svg` | Deleted. |
| `assets/agrobot-disposition.svg`, `agrobot-lot*.svg`, `agrobot-trace*.svg` | Untouched. |

Deletions happen **after** the CSS rules referencing them are removed, so the tree is never in a
state with live references to missing files.

### `css/agrobot-mark.css` — new

Holds, in this order, with the invariant rationale in comments:

1. The state-name mapping note: design `new-regulation` → app `alert`.
2. Five `svg[data-state="…"]` custom-property blocks.
3. `svg[data-sources="2"|"3"]` dot-count rules (clamp 2–5, default 4).
4. Fourteen `@keyframes`.
5. The `@media (prefers-reduced-motion: reduce)` block.

Linked from `agrolex.html` after `css/agrolex.css`.

### `css/agrolex.css` — edits

- Line 49: `.agent-mark` — drop the `background: url(...)` so inline-SVG instances are not
  painted over. Non-motion instances that still rely on the background get it via their own
  selectors.
- Lines 98, 99, 100, 105: remove the four `[data-state="…"] .agent-mark` background-swap rules.
  These are also currently **mis-mapped** — `listening` loads `agrobot-ready.svg` and `verified`
  loads `agrobot-listening.svg`. The port fixes this by construction.
- Line 97 `[data-state="ready"] .agent-mark { animation: awn-resolve … }` and its `@keyframes
  awn-resolve` at line 108: **both removed.** `awn-resolve` scales the whole mark 0.9 → 1.06 → 1
  with a saturation shift on entering Ready. That is a whole-logo bounce, which `DESIGN.md`
  §Motion bans outright, and Ready's only sanctioned motion is the breathing exception in
  invariant (g). Removing the rule alone would orphan the keyframe, so both go.
- Line 267: remove `.product-demo.is-running .chat-agent .agent-mark` background swap.
- Lines 187–190: drop the `filter` hack for state-grid marks.
- Add 1.375× sizing for the three motion instances (§5.1 below).

#### 5.1 Sizing compensation

| Instance | Static width | Motion width | Note |
|---|---|---|---|
| `.agent-mark--hero` | `min(42%, 230px)` | `min(57.75%, 316px)` | also `39%` → `53.6%` at the 403 breakpoint |
| `.state-icon .agent-mark` | `110px` | `151.25px` | |
| `.chat-agent .agent-mark` | `37px` | `50.9px` | `margin:-7px` absorbs the overflow so rail layout is unchanged |

### `agrolex.html` — edits

- Insert the `<defs>` block after `<body>`.
- Add `<link rel="stylesheet" href="css/agrobot-mark.css">`.
- Hero: `.agent-mark--hero` → inline motion `<svg>`.
- State grid: the five `<article data-state>` cards currently hold inline `<svg class="agent-mark">`
  carrying legacy `agent-thread` paths from an older direction. Replace each with a motion `<svg>`
  carrying its own `data-state` and `<use href="#mark-master-shapes">`.
- Chat agent mark → inline motion `<svg>`.
- Favicon stays `assets/agrobot.svg`.

### `js/agrolex.js` — edits

- `activateState()`: mirror state onto mark svgs with the reflow reset (§4.2).
- `stateOrder` and `stateCopy` unchanged.

### `landing.html`, `deploy/index.html`

Three `<img src="assets/agrobot.svg?v=20260714-1">` each, at lines 119, 133 and 138. No
structural change — bump the cache-bust query so the new file is picked up. `deploy/` is a
separate git repository with a GitHub remote (`khldd/snapreportai`) and is the live site:
**edit only, do not commit or push.**

---

## 6. State specifications

All timings verified in the source artifact. Not to be re-tuned without cause.

### Ready
`--outer-animation: flower-breathe-outer 5.2s ease-in-out infinite`
`--inner-animation: flower-breathe-inner 6.8s ease-in-out infinite`
Outer scales to 1.06 (6%), inner to 1.045 (4.5%), core fixed. Periods 5.2 / 6.8 = 13:17.

### Listening — 3.4s cycle, repeating
| Phase | Time | % of cycle | Behaviour |
|---|---|---|---|
| Emerge | 0 → 0.32s | 0 → 9.41% | dots scale 0→1 at r=31.2 |
| Sweep | 0.32 → 1.28s | 9.41 → 37.65% | glide to r=38, travel 180° together |
| Retract | 1.28 → 1.60s | 37.65 → 47.06% | inward to r=27, scale 1→0 |
| Hold | 1.60 → 3.4s | 47.06 → 100% | **completely still, 1.8s** |

Outer flower turns +90° on the same clock at half the angular rate. The full stop is what keeps
this an acknowledgement rather than a spinner.

### Researching — 6s cycle
Reach 1s, stagger 0.11s, sweep delay 0.35s. Four steps of (1.07s hold + 0.43s turn) = 360°.
Flower steps −90° against the dots on the same clock and delay. Holds are 71% of the cycle;
that ratio is what stops it reading as a spinner.

### Verified
Dots converge 0.6s, flower +90° over 0.75s, confirm ring 1.15s, then everything stops
completely. No perpetual verified animation.

### Alert *(design: New Regulation Detected)*
One dot only — dot 4, base `rotate(45)`, rendering top-right — travels r=70 → 38 over 0.95s and
**stays**; a pending regulation is pending until acknowledged. The ring fires at 0.85s,
overlapping the landing by 0.1s so the two read as cause and effect. The flower turns +90°
starting at 0.95s (`flower-attend`, 56% of 1.7s).

### Reduced motion — five frames

| State | Frame | Distinguisher |
|---|---|---|
| Ready | bare mark, no dots | 0 dots |
| Listening | 4 dots, r=38, `rotate(45deg)` | on the **cardinals** |
| Researching | 4 dots, r=38, no sweep | on the **diagonals** |
| Verified | 4 dots at r=12, scale .6, opacity .5 + confirm ring | merged at core |
| Alert | 1 dot, r=38, top-right + pulse ring | 1 dot |

Ready renders completely still, per invariant (g).

---

## 7. Deviations from the source artifact

Three, all deliberate.

**1. State name.** `svg[data-state="new-regulation"]` → `svg[data-state="alert"]`, to match the
app's existing vocabulary. Recorded at the top of `css/agrobot-mark.css`.

**2. `dot-verify` start radius 34 → 38.** At r=34 the inner edge is 31.8 against the widest
measured tip of 31.61 — clearance of 0.19 units, so the dots visibly graze the mark. This is the
same grazing that drove Listening's orbit from 34 → 38 in MOTION.md §8; the fix was never
applied to Verified. Moving to 38 also puts Verified on the same ring every other state uses.

**3. `confirm-pulse` end scale 1.8 → 3.33.** At `scale(1.8)` the r=8.4 ring reaches radius 15.1
— small and lost in the mark's centre. `scale(3.33)` carries it to **radius 28**: nearly double,
so it clearly registers, while staying **inside** the 31.5 silhouette.

The containment is the point. Verified resolves *within* the mark's own footprint; New
Regulation's ring (radius 36) breaks *past* it. The two rings stay legible as different events,
and the dots-in / ring-out counterpoint survives in both.

---

## 8. Verification

### 8.1 Programmatic

A Node script asserting, against the built CSS and SVG:

1. Every flower rotation angle is a multiple of 90.
2. No **held, full-scale** dot radius R exists where `R − 2.2 ≤ 31.5`. The two exemptions in
   invariant (d) are excluded **explicitly and by name**, not by tolerance.
3. Every animation name referenced by a custom property has a matching `@keyframes`, and no
   `@keyframes` is orphaned. Expected: 14 each side. **Scoped to `css/agrobot-mark.css`** —
   `agrolex.css` has its own unrelated keyframes (`status-pulse`, `source-read`, `orbit-turn`),
   which would otherwise read as orphans.
4. The five reduced-motion frames are mutually distinct, compared on **dot count and position**.
   Under 4-fold symmetry angles are only meaningful mod 90, so the comparison normalises them.
5. Ready's two periods do not divide into each other.

### 8.2 Visual

Structural checks pass happily on animations that are invisible, off-centre, or clipped. Each of
the five states is rendered in a browser and confirmed by eye before the work is reported
complete. Specifically checked:

- the mark is centred and unclipped in the 88-unit viewBox at all three motion sizes;
- dots are visible against the dark state-grid ground (invariant e);
- Verified's ring at radius 28 reads as a single clean ring over the rosette, not as fragments;
- Listening's 1.8s hold is a genuine full stop;
- no state leaves the mark rotated at rest.

---

## 9. Out of scope

- The Evidence Trace direction (`agrobot-trace.*`) and its motion system.
- `agrobot-lot*.svg`, `agrobot-disposition.svg`.
- Any change to marketing copy in `landing.html`, `index.html` or `deploy/index.html`.
- Pushing `deploy/` to its remote.
