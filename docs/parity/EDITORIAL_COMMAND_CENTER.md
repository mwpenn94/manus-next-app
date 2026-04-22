# Editorial Command Center — Canonical Design System (§L.37)

**Created:** 2026-04-22T10:45:00Z
**Purpose:** Canonical design system spec for manus-next-app: color palette, typography, layout, motifs, interaction, animation.

## Color Palette (OKLCH — Tailwind 4 Native)

### Dark Theme (Default)

| Token | OKLCH Value | Hex Approx | Usage |
|-------|-------------|-----------|-------|
| `--background` | oklch(0.10 0.01 260) | #09090c | Page background |
| `--foreground` | oklch(0.93 0.01 260) | #e8e8ec | Primary text |
| `--card` | oklch(0.14 0.01 260) | #1a1a1e | Card surfaces |
| `--card-foreground` | oklch(0.93 0.01 260) | #e8e8ec | Card text |
| `--primary` | oklch(0.55 0.20 260) | #4f6bff | Primary actions, links |
| `--primary-foreground` | oklch(0.98 0.00 0) | #fafafa | Text on primary |
| `--secondary` | oklch(0.19 0.01 260) | #1c1c20 | Secondary surfaces |
| `--muted` | oklch(0.22 0.01 260) | #222226 | Muted backgrounds |
| `--muted-foreground` | oklch(0.55 0.01 260) | #71717a | Muted text, placeholders |
| `--accent` | oklch(0.22 0.01 260) | #222226 | Hover states |
| `--destructive` | oklch(0.55 0.22 25) | #dc2626 | Error states, delete actions |
| `--border` | oklch(0.22 0.01 260) | #222226 | Borders, dividers |
| `--ring` | oklch(0.55 0.20 260) | #4f6bff | Focus rings |

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 0.625rem | Border radius (cards, buttons, inputs) |
| `--font-sans` | Inter, system-ui, sans-serif | Body text |
| `--font-heading` | Inter, system-ui, sans-serif | Headings (weight 600-700) |
| `--font-mono` | JetBrains Mono, monospace | Code, technical content |

## Typography Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 2.5rem (40px) | 700 | 1.1 | Hero headings |
| H1 | 2rem (32px) | 700 | 1.2 | Page titles |
| H2 | 1.5rem (24px) | 600 | 1.3 | Section headings |
| H3 | 1.25rem (20px) | 600 | 1.4 | Subsection headings |
| Body | 0.9375rem (15px) | 400 | 1.6 | Primary content |
| Small | 0.8125rem (13px) | 400 | 1.5 | Secondary content, captions |
| Micro | 0.6875rem (11px) | 400 | 1.4 | Labels, badges, timestamps |

## Spacing System

8px base grid. All spacing is a multiple of 8px:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps (icon-to-text) |
| sm | 8px | Compact spacing |
| md | 16px | Default padding |
| lg | 24px | Section gaps |
| xl | 32px | Major section spacing |
| 2xl | 48px | Page-level margins |
| 3xl | 64px | Hero spacing |

## Shadow Hierarchy

| Level | Value | Usage |
|-------|-------|-------|
| sm | `0 1px 2px oklch(0 0 0 / 0.05)` | Subtle elevation (buttons) |
| md | `0 4px 6px oklch(0 0 0 / 0.1)` | Cards, dropdowns |
| lg | `0 10px 15px oklch(0 0 0 / 0.15)` | Modals, popovers |
| glow | `0 0 20px oklch(0.55 0.20 260 / 0.15)` | Primary action emphasis |

## Interaction Patterns

| Pattern | Behavior | Duration |
|---------|----------|----------|
| Hover | Scale 1.02 + border-color lighten | 150ms ease |
| Press | Scale 0.98 | 100ms ease |
| Focus | Ring 2px primary + offset 2px | Instant |
| Transition | All property changes | 200ms ease-out |
| Page enter | translateY(8px → 0) | 300ms ease-out |
| Skeleton pulse | Opacity 0.5 → 1.0 cycle | 1.5s ease-in-out infinite |

## Animation Curves

| Name | Value | Usage |
|------|-------|-------|
| ease-out | cubic-bezier(0, 0, 0.2, 1) | Entrances, reveals |
| ease-in | cubic-bezier(0.4, 0, 1, 1) | Exits, dismissals |
| ease-in-out | cubic-bezier(0.4, 0, 0.2, 1) | Continuous motion |
| spring | spring(1, 80, 10) | Playful interactions |

## Layout Motifs

| Motif | Description | Where Used |
|-------|-------------|-----------|
| Warm Void | Dark background with subtle gradient overlay, centered content with breathing room | Home page |
| Sidebar + Content | Fixed sidebar (240px) with scrollable content area | Dashboard, Settings, Task pages |
| Card Grid | 2-column responsive grid with consistent card styling | Suggestion cards, Skills, Projects |
| Split Panel | 50/50 or 60/40 horizontal split for detail views | Task view (chat + preview) |
| Floating Input | Bottom-anchored input with toolbar, glass-morphism effect | Chat input, Task creation |
