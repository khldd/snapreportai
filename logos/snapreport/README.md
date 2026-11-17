# SnapReport logo pack

Every file here is traced from the site's own source art (`Group.svg` — the same
mark and outlined **SnapReport** wordmark used on `landing.html` and the identity
page `index.html`). The wordmark is real vector outlines, **not live text**, so it
renders identically everywhere with **no font (Satoshi) dependency**.

Open **`preview.html`** in a browser to see all 12 at once.

## Palette (from the official identity standards)
| Token | Hex | Use |
|-------|-----|-----|
| Snap Blue | `#0334EA` | Primary — owns the identity |
| Signal Ink | `#07132F` | On light / mono ground |
| Reverse | `#FFFFFF` | On blue or ink backgrounds |

## Contents
```
symbol/              Mark only (viewBox 350 260 370 280) — favicons, avatars, <120px
wordmark/            "SnapReport" only (viewBox 160 610 720 120) — nav, footers, signatures
lockup-horizontal/   Mark + wordmark side by side — the header lockup
lockup-stacked/      Mark over wordmark — primary, covers, opening frames
```
Each folder has `-blue`, `-ink`, and `-white` variants.

## Notes
- All SVGs are self-contained, flat single-colour, and scale losslessly.
- Recolour by editing the one `fill="…"` on the `<g>`, or swap the hex for
  `currentColor` to inherit CSS `color`.
- Clear space & minimum sizes: below the lockup minimum, switch to the symbol —
  don't let the wordmark disappear (per identity standards). Never stretch,
  rotate, add gradients, or add shadows to the mark.
