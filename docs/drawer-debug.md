# Drawer Debug

## Issue
Playwright reports `Hamburger visible: false` even though the screenshot shows the hamburger icon.

## Analysis
There are TWO buttons with `aria-label="Open sidebar"`:
1. Home.tsx line 207: Has `md:hidden` class — should be visible on mobile
2. AppLayout.tsx line 1070: Has `hidden md:flex` on Home route — should be hidden on mobile

The `page.$('button[aria-label="Open sidebar"]')` selector returns the FIRST match, which might be the AppLayout one (hidden on Home route mobile).

## Fix
Give the Home.tsx hamburger a unique aria-label like "Open menu" to distinguish it.
