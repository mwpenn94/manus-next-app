# Navigation Convergence Notes

## Current State vs Manus Target

### Mobile Bottom Nav (MobileBottomNav.tsx)
Current: Home, Tasks, Billing, More — MATCHES MANUS EXACTLY ✓
More menu items order: Search, Projects, Library, Skills, Schedule, Connectors, Memory, GitHub, Discover, Webhooks, Data Controls, Settings, Help — MATCHES MANUS ✓

### Desktop Sidebar (AppLayout.tsx)
Current top nav: New task, Agent, Search (Ctrl+K), Library — MATCHES MANUS ✓
Current bottom bar: Settings, Grid(apps), Plug(connectors), Help, Theme — MATCHES MANUS ✓ (has "from ∞ Meta")
AppsGridMenu items: Projects, Library, Skills, Schedule, Connectors, Memory, GitHub, Billing, Discover, Help, Webhooks, Data Controls — MATCHES MANUS ✓

### Key Differences to Fix:
1. Desktop sidebar "AppsGridMenu" uses emoji icons (📁📚⚡📅🔌🧠🔗💳🧭❓🪝🛡️) — Manus uses colored Lucide-style icons
2. More menu panel styling — Manus has full-screen dark bg list, ours has a card-style panel above the tab bar
3. Help item in Manus More menu has a teal/blue highlight background — ours doesn't
4. Manus More menu is full-height, ours is a compact panel

## Priority Changes:
1. Replace emoji icons in AppsGridMenu with proper Lucide icons (already used in MobileBottomNav)
2. Make More menu full-screen on mobile (match Manus)
3. Add Help highlight in More menu
4. Ensure sidebar items use colored icons like Manus desktop sidebar
