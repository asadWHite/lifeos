# LifeOS Design System

## Color Palette

| Token | Value | Usage |
|---|---|---|
| `#202833` | Midnight navy | Primary dark surface, headings |
| `#151B23` | Deep navy-black | Deep backgrounds, lamp scene |
| `#2B3440` | Blue-charcoal | Secondary dark surface |
| `#ADA996` | Warm greige | Secondary text, labels |
| `#F2F2F2` | Soft white | Text on dark surfaces |
| `#F4F1EA` | Ivory | Light mode background |
| `#E6E3DA` | Warm stone | Light mode secondary surface |
| `#FF633C` | Lamp orange | Lamp accent, primary CTA |
| `#FFB16A` | Soft amber | Lamp glow, beam center |
| `#3F8065` | Success green | Sleep status good, completed |
| `#C8943E` | Warning amber | Sleep slightly late, snoozed |
| `#C65B55` | Error red | Sleep under 2h, overdue, delete |

## CSS Custom Properties

All surfaces use CSS variables `--c-bg`, `--c-surface`, `--c-ink`, etc.
Switching `data-theme="dark"` on `<html>` swaps the palette.

## Typography Scale

- `.text-display` — 2–3.5rem, weight 800, tracking -0.03em
- `.text-h1` — 1.5–2.25rem, weight 700
- `.text-h2` — 1.25rem, weight 700
- `.text-h3` — 1rem, weight 600
- `.text-body` — 0.9375rem, line-height 1.6
- `.text-small` — 0.8125rem
- `.text-label` — 0.6875rem, uppercase, tracking 0.08em

## Animation classes

- `.animate-fade-up` — entrance from bottom
- `.animate-beam` — lamp beam expansion
- `.animate-glow` — pulsing glow
- `.animate-text-reveal` — blur+opacity goal text reveal

## Component library

All shared components live in `src/components/ui/index.tsx`:
- `Modal` — bottom sheet on mobile, centered on desktop
- `EmptyState` — icon + title + body + action
- `Field` / `FieldError` — form field wrapper
- `Toggle` — accessible switch
- `Chip` — pill selection
- `ProgressRing` — SVG circle progress
- `Spinner` — loading indicator

## Spacing

8px base grid. Common values: 4, 8, 12, 16, 20, 24, 32, 48px.

## Radii

- Cards: `20px`
- Buttons: `14px`
- Pills: `999px`
- Avatars: `999px`
- Inner elements: `10–12px`
