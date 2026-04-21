# P27 PWA Audit

## Existing Assets
- `client/public/manifest.json` — exists, has name/short_name/icons/display/theme_color
- `client/public/sw.js` — exists, has install/activate/fetch handlers, cache-first for static, network-first for API, offline fallback
- `client/public/offline.html` — exists, styled dark theme offline page with retry button
- `client/index.html` — has `<link rel="manifest">`, `<meta name="apple-mobile-web-app-capable">`, `<meta name="apple-mobile-web-app-status-bar-style">`, `<link rel="apple-touch-icon">`, dual theme-color meta tags
- `client/index.html` — has inline SW registration in `<script>` block (basic, no update handling)
- `client/src/main.tsx` — NO SW registration in React code (only in index.html inline script)

## Issues Found
1. **Icons reference local files** — manifest references `/icon-192.png` and `/icon-512.png` which don't exist in client/public/. Need to generate and upload via manus-upload-file or use inline SVG data URIs.
2. **apple-touch-icon references `/apple-touch-icon.png`** — doesn't exist
3. **SW registration is minimal** — no update detection, no toast notification for new version
4. **manifest.json short_name** — "Manus Next" is 10 chars, should be ≤12 but could be shorter ("Manus")
5. **No scope field** in manifest
6. **SW CACHE_NAME** — `manus-next-v1` is static, needs versioning strategy
7. **No SW update notification** — user never knows when a new version is available
8. **manifest icons purpose** — "any maskable" should be split into separate entries per Chrome best practice

## Plan
1. Generate SVG-based icons, upload via manus-upload-file --webdev, use CDN URLs in manifest
2. Fix manifest: add scope, fix short_name, split icon purposes, add id field
3. Enhance SW: version bump mechanism, stale-while-revalidate for fonts
4. Move SW registration to main.tsx with update detection + toast
5. Remove inline SW registration from index.html
