# Drawer Test Findings

The hamburger icon IS visible in the screenshot (top-left ≡ icon). The Playwright selector `button:has(svg.lucide-menu)` failed because Lucide icons don't have a `lucide-menu` class — they use generic SVG elements.

The Home page hamburger button dispatches `open-mobile-drawer` custom event. Need to use a different selector — the button doesn't have an aria-label. Need to add one.

Fix: Add aria-label="Open menu" to the hamburger button in Home.tsx.
