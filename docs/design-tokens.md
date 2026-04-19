# Design Tokens — manus-next-app

> Canonical design token reference for the Manus Next UI system.

---

## Color Palette

The application uses CSS custom properties defined in `client/src/index.css` with OKLCH color format (Tailwind CSS 4 compatible).

### Semantic Colors (Dark Theme — Default)

| Token | CSS Variable | OKLCH Value | Usage |
|-------|-------------|-------------|-------|
| Background | `--background` | `oklch(0.145 0.015 285)` | Page background |
| Foreground | `--foreground` | `oklch(0.95 0.01 285)` | Primary text |
| Card | `--card` | `oklch(0.18 0.015 285)` | Card surfaces |
| Card Foreground | `--card-foreground` | `oklch(0.95 0.01 285)` | Card text |
| Primary | `--primary` | `oklch(0.65 0.18 260)` | Buttons, links, accents |
| Primary Foreground | `--primary-foreground` | `oklch(0.98 0.005 260)` | Text on primary |
| Secondary | `--secondary` | `oklch(0.25 0.015 285)` | Secondary surfaces |
| Muted | `--muted` | `oklch(0.25 0.01 285)` | Muted backgrounds |
| Muted Foreground | `--muted-foreground` | `oklch(0.65 0.015 285)` | Muted text |
| Accent | `--accent` | `oklch(0.25 0.02 285)` | Hover states |
| Destructive | `--destructive` | `oklch(0.55 0.2 25)` | Error, delete actions |
| Border | `--border` | `oklch(0.3 0.015 285)` | Borders, dividers |
| Ring | `--ring` | `oklch(0.65 0.18 260)` | Focus rings |

### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| Success | `oklch(0.65 0.18 145)` | Success states, green indicators |
| Warning | `oklch(0.75 0.15 80)` | Warning states, yellow indicators |
| Error | `oklch(0.55 0.2 25)` | Error states (same as destructive) |
| Info | `oklch(0.65 0.18 260)` | Info states (same as primary) |

---

## Typography

### Font Stack

| Token | Value | Usage |
|-------|-------|-------|
| `--font-heading` | `"Instrument Serif", Georgia, serif` | Headings, hero text |
| `--font-body` / `font-sans` | `"Inter", system-ui, sans-serif` | Body text, UI elements |
| `--font-mono` | `"JetBrains Mono", "Fira Code", monospace` | Code, terminal, badges |

### Type Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 2.5rem (40px) | 600 | 1.1 | Hero headings |
| H1 | 2rem (32px) | 600 | 1.2 | Page titles |
| H2 | 1.5rem (24px) | 600 | 1.3 | Section headings |
| H3 | 1.25rem (20px) | 500 | 1.4 | Subsection headings |
| Body | 0.9375rem (15px) | 400 | 1.6 | Default body text |
| Small | 0.8125rem (13px) | 400 | 1.5 | Secondary text, captions |
| Tiny | 0.6875rem (11px) | 400 | 1.4 | Badges, labels |

---

## Spacing

Uses Tailwind's default spacing scale (1 unit = 0.25rem = 4px).

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight spacing (icon gaps) |
| `space-2` | 8px | Compact spacing (button padding) |
| `space-3` | 12px | Default gap |
| `space-4` | 16px | Standard padding |
| `space-6` | 24px | Section padding |
| `space-8` | 32px | Large section gaps |
| `space-12` | 48px | Page-level spacing |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 0.625rem (10px) | Default radius (cards, inputs) |
| `radius-sm` | 0.5rem (8px) | Small elements (badges) |
| `radius-lg` | 0.75rem (12px) | Large elements (dialogs) |
| `radius-xl` | 1rem (16px) | Extra large (panels) |
| `radius-full` | 9999px | Circular (avatars, pills) |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| Shadow SM | `0 1px 2px oklch(0 0 0 / 0.05)` | Subtle elevation |
| Shadow MD | `0 4px 6px oklch(0 0 0 / 0.1)` | Cards, dropdowns |
| Shadow LG | `0 10px 15px oklch(0 0 0 / 0.15)` | Dialogs, popovers |
| Shadow Primary | `0 4px 12px oklch(0.65 0.18 260 / 0.2)` | Primary button glow |

---

## Breakpoints

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Wide desktop |
| `2xl` | 1536px | Ultra-wide |

---

## Animation

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| Fast | 150ms | ease-out | Hover states, toggles |
| Normal | 200ms | ease-out | Transitions, fades |
| Slow | 300ms | ease-in-out | Panel slides, modals |
| Spring | 500ms | cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy entrances |

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| Base | 0 | Default content |
| Dropdown | 10 | Dropdowns, tooltips |
| Sticky | 20 | Sticky headers |
| Overlay | 30 | Overlays, backdrops |
| Modal | 40 | Modals, dialogs |
| Toast | 50 | Toast notifications |
