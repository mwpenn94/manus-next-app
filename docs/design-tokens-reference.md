# Manus Design Tokens — Working Reference

## Colors (Dark Theme — Primary Target)

### Backgrounds
- App frame/main canvas: `#1a1a1a`
- Sidebar/nav: `#1f1f1f`
- Menus/elevated: `#242424`
- Cards: `#1c1c1c`
- Login page: `#050505`

### Text
- Primary: `#dadada`
- Secondary: `#acacac`
- Tertiary: `#7f7f7f`
- Disabled: `#5f5f5f`
- Blue accent: `#1a93fe`

### Icons (mirror text)
- Primary: `#dadada`
- Secondary: `#acacac`
- Tertiary: `#7f7f7f`

### Borders
- Default divider: `#ffffff0f` (~6% white)
- Subtle: `#ffffff08`
- Stronger: `#ffffff1f`
- Focused input: `#1a93fe47`
- Active input: `#ffffff52`

### Accent
- Brand blue: `#1a93fe`
- Button disabled: `#215d93`
- Button secondary: `#1a93fe1f` (~12% tint)

### Semantic
- Error: `#eb4d4d`
- Success: `#5eb92d`
- Warning: `#ffbf36`

## Typography

### Serif Display (headlines)
```
LibreBaskerville, Georgia, Cambria, ui-serif, "Times New Roman", Times, serif
```
Used for: "What can I do for you?", wordmark, greeting

### System Sans (body/UI)
```
-apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, Arial, sans-serif
```

### Monospace
```
ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace
```

### Body Scale
- body-primary: 14px / 400 / 22px line-height / -0.154px tracking
- body-secondary: 16px / 400 / 24px line-height / -0.304px tracking
- body-tertiary: 18px / 400 / 28px line-height

## Layout
- Base unit: 24px
- Sidebar width: ~240px
- Backdrop blur: 50px (macOS-style)

## Motion
- Thinking shimmer: linear-gradient cycling text-primary → #d9d8d8 → text-primary over 40s
- Progress bar: #0081f2, 2px height, 400ms animation

## Key Patterns
1. Serif headline "What can I do for you?" — editorial tone
2. Three-pane layout: sidebar + chat + canvas
3. Action badges: collapsible tool-call cards in thread
4. Plan rollups with step counters
5. Suggested follow-ups after task completion
6. Quiet voice: no gamification, no emoji, no celebration
7. Single accent color (blue) — no second brand color
8. Warm greys (not pure black/white)
9. Send button = up-arrow (not paper plane)
10. Model badge per-turn in thread
