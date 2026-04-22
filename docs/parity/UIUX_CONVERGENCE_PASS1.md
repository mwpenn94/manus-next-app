# UI/UX Convergence Pass 1 — Landscape Assessment

**Date:** 2026-04-21
**Pass Type:** Landscape
**Scope:** Desktop + mobile UI/UX across all primary surfaces (Home, TaskView, AppLayout, MobileBottomNav)

## Signal Assessment

- **Landscape:** PRESENT — Several mobile UX issues and accessibility gaps not yet addressed
- **Depth:** ABSENT — Broad coverage exists, specific areas need targeted fixes
- **Adversarial:** ABSENT — Not yet solid enough for adversarial testing
- **Future-State:** ABSENT — Current-state issues still present
- **Fundamental Redesign:** ABSENT — Core architecture is sound

## Issues Found

### 1. Mobile Bottom Nav Content Overlap (MEDIUM)
- `AppLayout` uses `pb-14 md:pb-0` for mobile bottom padding
- MobileBottomNav height is `h-14` (3.5rem) + safe-area-inset
- On devices with large safe-area (iPhone notch), content may be clipped behind the nav
- **Fix:** Change `pb-14` to `pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]`

### 2. Home Page Input Textarea Min-Height on Mobile (LOW)
- Textarea `min-h-[48px]` is fine but the pill shape `rounded-full` creates visual clipping on multi-line input
- When files are attached, shape changes to `rounded-2xl` which is correct
- **Fix:** No code change needed — behavior is correct

### 3. Horizontal Scroll Containers Missing Touch Momentum (LOW)
- Quick actions and suggestion cards use `overflow-x-auto scrollbar-none`
- Missing `-webkit-overflow-scrolling: touch` for iOS momentum scrolling
- Modern iOS handles this natively, but adding it improves older device support
- **Fix:** Add `touch-action: pan-x` to horizontal scroll containers

### 4. Settings Page Low Contrast Text (LOW)
- `text-muted-foreground/40` and `text-muted-foreground/60` in SettingsPage may fail WCAG AA
- **Fix:** Increase opacity to minimum `/60` for decorative, `/70` for informational

### 5. Mobile Drawer Z-Index Stacking (OK)
- AppLayout mobile drawer: z-50 (content), z-40 (overlay)
- MobileBottomNav: z-50 (nav bar), z-50 (more panel), z-40 (overlay)
- Both use same z-levels — potential conflict if both open simultaneously
- **Fix:** MobileBottomNav closes on navigation, so conflict is unlikely. No change needed.

### 6. TaskView Chat Input Safe Area (OK)
- Already uses `paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))"`
- Correct implementation

### 7. Accessibility — All Buttons Have aria-labels (OK)
- Grep confirms all interactive buttons have aria-labels
- Good coverage

### 8. Dark Theme Scrollbar Contrast (LOW)
- Dark scrollbar uses `oklch(0.2 0 0)` which is very close to dark background `oklch(0.14 0.007 300)`
- **Fix:** Increase scrollbar thumb lightness to `oklch(0.3 0 0)` for better visibility

## Fixes to Apply

1. Mobile bottom nav safe-area padding
2. Settings page contrast
3. Dark scrollbar contrast
