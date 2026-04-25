# Manus Share Page Task Execution Patterns

## Header Structure (from share page)
- Left: Manus paw logo SVG + "Manus 1.6" text + dropdown chevron (rotated 90deg)
- Center (desktop): Task title centered
- Right: square-pen icon, link/copy icon, document icon, ellipsis icon, ellipsis icon
- Sticky top with z-10
- Background: var(--background-gray-main) / dark theme: #171717

## Message Rendering Patterns
The markdown extraction was mostly SVG icons (base64 encoded) from the header.
Need to scroll down to see actual conversation content.

## Key Layout Values
- max-w-[800px] for message container
- mx-auto centering
- px-6 horizontal padding
- pt-[24px] top padding
- pb-5 bottom padding

## Bottom Bar
- Sticky bottom-0
- max-w-[800px] mx-auto w-full pb-3
- Contains input-like area with bg-[var(--background-menu-white)] rounded-xl border

## Route Format
- /share/{shareId} (not /shared/)
- noindex meta tag
- OG image for social sharing
