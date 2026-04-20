# NS19 Screenshot Batch 3 — Key Observations

## IMG_6914 — Browser Authorization Card (Crimson-Hawk)
- Card appears inline in chat stream (not a modal)
- Globe icon (⊕) at top-left
- Text: "Authorize Manus to use a new tab from My Browser to complete your task."
- Three stacked buttons (full-width, rounded):
  1. "No, use default browser" — dark/muted bg
  2. "Check again" — dark/muted bg
  3. "Use My Browser on Crimson-Hawk" — lighter/outlined bg, stands out
- Below the card: green checkmark "Task completed" text
- Then: "Rate this result" with 5 gray star icons (rating widget)
- Then: checkpoint card with thumbnail "Save Pass 10 checkpoint and deliver..."

## IMG_6915/6916 — Webapp Preview Card in Chat
- Card shows: Globe icon, app name "Stewardly", status "Not published · 1 minute ago"
- Below: full-width screenshot/preview of the deployed webapp
- Two buttons at bottom: "Settings" (dark) and "Publish" (light/outlined) with blue dot indicator
- Sidebar visible in preview showing navigation: Chat, Wealth Engine, People, Intelligence, Team, Organizations
- This is an inline card in the conversation, not a separate page

## IMG_6917/6918 — Publish Bottom Sheet
- Title: "Publish" (bold, large)
- "Deployment status" with green dot "Live" badge
- "Website address" section with domain "stewardly.manus.space" and copy icon
- "+ Customize domain" link in blue/gold
- "Visibility" section: Globe icon "Everyone can see this site" with dropdown chevron
- Info banner: "Your latest changes are not yet live. Update to publish them."
- "Publish latest version" button (gold/amber bg, prominent)
- IMG_6918 shows a loading sparkle icon on the publish button

## IMG_6919/6920 — Site Live Confirmation Sheet
- Title: "Your site is now live!" (bold)
- Subtitle: "It's now public and can be accessed by anyone. Copy the link to share it or manage access settings."
- Domain shown in rounded pill: "stewardly.manus.space"
- "Visit" button (full-width, outlined)
- "Customize domain" button (full-width, muted)
- Share row at bottom: Copy link, Share to..., WhatsApp, X, LinkedIn

## IMG_6921 — Native iOS Share Sheet
- Standard iOS share sheet showing the stewardly.manus.space URL
- Contacts row, app row (AirDrop, Messages, Edge, Claude)
- Action row (Copy, Add to New Quick Note, Open in Microsoft Edge, View More)
- Bottom share row: Copy link, Share to..., WhatsApp, X, LinkedIn

## Key New Components Needed:
1. BrowserAuthCard — inline chat card for Crimson-Hawk authorization
2. TaskCompletedCard — green checkmark + "Rate this result" with 5-star rating
3. WebappPreviewCard — inline card showing deployed site preview with Settings/Publish
4. PublishSheet — bottom sheet with deployment status, domain, visibility, publish button
5. SiteLiveSheet — confirmation bottom sheet after publishing with share options
