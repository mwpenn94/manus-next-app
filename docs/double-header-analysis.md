# Double Header Analysis

## Current Behavior
Line 1058 in AppLayout.tsx: `location === "/" ? "hidden md:flex" : ""`

This means on the Home route (/):
- Mobile: AppLayout header is hidden (Home has its own header with hamburger + ModelSelector + Credits)
- Desktop: AppLayout header is shown (with sidebar toggle + logo + theme + notifications)

Home.tsx line 199: The Home page's own header is always rendered (no md:hidden class).

## Result on Desktop
Both headers appear:
1. AppLayout header: sidebar toggle + "manus next" logo + theme + notifications
2. Home header: ModelSelector + Credits

## Fix
The Home page header should be hidden on desktop since AppLayout already provides the header there. The ModelSelector and Credits should either:
- Option A: Only show on mobile (add md:hidden to Home header)
- Option B: Be integrated into the AppLayout header when on Home route

Option A is simpler and matches the user's screenshot (which was mobile-only). The desktop AppLayout header already has the sidebar toggle and theme controls, so the ModelSelector can be mobile-only.
