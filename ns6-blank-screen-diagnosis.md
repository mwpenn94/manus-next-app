# Blank Screen Diagnosis

## Findings So Far
- Dev server renders correctly (screenshot shows full UI)
- Published site HTML loads correctly (200)
- Published site JS bundles load correctly (200 for index-BB8UNd75.js, vendor-react-E6EHHgtz.js)
- Published site CSS loads correctly (200 for both CSS files)
- Published site API works (auth.me returns 200)
- The `<div id="root"></div>` is present in the HTML

## Hypothesis
Since all assets load with 200 and the HTML is correct, the issue is likely:
1. A runtime JS error that prevents React from mounting
2. The dark theme CSS variables not being applied in production (bg-background resolves to black, but no content renders)
3. A framer-motion or other dependency issue in production build
4. An auth redirect loop that clears the page

Need to check: browser console errors on the published site
