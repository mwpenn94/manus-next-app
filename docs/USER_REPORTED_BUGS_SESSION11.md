# User-Reported Bugs — Session 11

## Bug 1: Limitless Mode Selector
- **Symptom**: Clicking "Manus Limitless" in dropdown reverts to "Manus Max"
- **Root Cause**: TaskView ModelSelector missing `selectedModelId` prop — defaults to "manus-next-max" every render
- **Fix**: Pass selectedModelId state to ModelSelector in both TaskView and Home

## Bug 2: Mobile Button Overlap
- **Symptom**: Floating chat FAB button overlaps with input area buttons (+, mic, headphones) on mobile
- **Screenshot**: Bottom-right corner, FAB sits on top of the input toolbar
- **Fix**: Add bottom margin/padding to FAB or reposition it above the input area on mobile

## Bug 3: App Dev Self-Edit
- **Symptom**: When asked "Create an app deeply aligned with wealthbridgefg.com", agent tried to edit the running Manus Next app instead of creating a new one
- **Root Cause**: The webapp_builder tool's system prompt doesn't distinguish between "edit this app" and "create a new app"
- **Fix**: Update webapp_builder tool system prompt to always create new projects unless explicitly asked to edit the current one

## Bug 4: localhost URLs
- **Symptom**: App card shows http://localhost:4200 which can't be accessed from user's phone
- **Root Cause**: The webapp_builder tool uses localhost URLs for the dev server, but these are sandbox-local
- **Fix**: Use the exposed public URL (from expose tool) instead of localhost in webapp cards

## Bug 5: robots.txt Fallback
- **Symptom**: Agent got 403 on wealthbridgefg.com and gave up, didn't try browser automation
- **Root Cause**: web_search tool respects robots.txt but has no fallback to browser-based scraping
- **Fix**: Add cloud_browser tool as fallback when web_search hits 403/robots.txt blocks

## Bug 6: Blank Webapp Preview
- **Symptom**: Webapp card shows blank white area with "Not published" instead of working preview
- **Root Cause**: The webapp card iframe points to localhost:4200 which isn't accessible
- **Fix**: Use exposed public URL for preview, or capture a screenshot as preview image
