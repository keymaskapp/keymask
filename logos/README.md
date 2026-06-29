# KeyMask — Logo asset pack

Flat-style identity for KeyMask, a secret & key vault. The mark is an
"ark" hull / shield holding a keyhole.

## Brand colors
| Role            | Hex       |
|-----------------|-----------|
| Indigo (primary)| `#4338CA` |
| Indigo deep     | `#312E81` |
| Indigo tile/bg  | `#211D52` |
| Amber (accent)  | `#F59E0B` |
| Amber deep      | `#D97706` |

Wordmark font: Poppins SemiBold (outlined to paths in the SVGs — no font
needed to display them).

## Files

### svg/  (scalable source — preferred everywhere on web)
- `keymask-logo-full.svg`       — horizontal lockup, for light backgrounds
- `keymask-logo-full-dark.svg`  — lockup for dark backgrounds
- `keymask-logo-full-mono.svg`  — single-color lockup (uses `currentColor`)
- `keymask-icon.svg`            — mark only (color)
- `keymask-icon-white.svg`      — mark only, white hull (dark backgrounds)
- `keymask-icon-mono.svg`       — mark only, single color (`currentColor`)
- `keymask-app-icon.svg`        — full-bleed square app icon
- `keymask-favicon.svg`         — rounded favicon master

### favicon/
- `favicon.ico` (16/32/48), `favicon-16/32/48/64.png`

### app/  (mobile / PWA / store)
- `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`,
  `app-icon-1024.png` (App Store / Play Store; already square, no transparency)

### png/  (raster lockups & icon, transparent)
- `keymask-logo-full.png`, `keymask-logo-full-dark.png`,
  `keymask-logo-full-mono.png`, `keymask-icon-512.png`,
  `keymask-icon-white-512.png`

### social/
- `keymask-og-banner.(svg|png)` — 1200×630 link/social preview

## Web setup
Drop `favicon/`, `app/` and `keymask-favicon.svg` at your site root, then paste
`head-snippet.html` into `<head>`. `site.webmanifest` wires up installable PWA
icons. The mono SVGs inherit the surrounding text color via `currentColor`.

## Clear space & sizing
Keep padding of at least the keyhole's height around the lockup. Minimum
on-screen icon size ~16px; minimum lockup width ~120px.
