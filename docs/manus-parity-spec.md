# Manus Mobile App — Parity Reference Spec

Captured from real Manus v26.3.5 iOS app screenshots (2026-04-30).

## Home Screen (IMG_7449, IMG_7450)

- **Header**: Hamburger (≡) left, "Manus Max ∨" center dropdown, "Credits" button right (sparkle icon)
- **Greeting**: Large serif font "Hello, Michael." — warm, personal
- **Subtitle**: "What can I do for you?" — muted gray, smaller
- **Input bar**: Rounded pill, dark card bg, "What would you like to do?" placeholder
  - Left: "+" button (opens bottom sheet)
  - Right: microphone icon, send arrow (circular, white bg when active)
- **Quick-action chips**: Horizontal scroll row below input
  - "<> Build a website" | "□ Create slides" | "📄 Write a..." (truncated)
  - Outline style, rounded-full, icon + text
- **Suggestion cards**: Horizontal carousel, 2 visible at a time
  - Card: dark bg, rounded-xl, border
  - Left icon in circle (globe, chart), title bold, description muted smaller
  - Example: "Research AI Agent Architectures" / "Analyze and compare leading AI agent frameworks."
- **Pagination dots**: 7 dots below carousel, first filled white, rest gray/smaller
- **Bottom tab bar**: 4 tabs — Home (house, active=blue), Tasks (list), Billing (card), More (•••)

## + Button Bottom Sheet (IMG_7447, IMG_7448)

Two distinct states observed:

### State 1 (IMG_7447 — media-focused):
- **MEDIA** section header (caps, muted)
  - Add files (upload icon)
  - Share screen (monitor icon)
  - Record video (camera icon)
  - Upload video (video icon)
- **CREATE** section header (caps, muted)
  - Build website (globe icon)
  - Create slides (presentation icon) — "Pro" badge
  - Create image (image icon)

### State 2 (IMG_7448 — full list):
- Wide Research (target/search icon)
- Scheduled tasks (calendar icon)
- Add Skills (puzzle icon)
- Playbook (book icon)
- Connect My Computer (monitor icon)
- GitHub Repos (branch icon)
- Hands-free mode (headphones icon)
- **CONNECTORS** section header
  - mwpenn94 — "Connected" green badge

### State 3 (IMG_7446 — desktop/expanded):
- Add files (pen/clip icon)
- Connect My Computer
- Add Skills
- Build website (folder icon)
- Create slides (briefcase icon)
- Create image — "Images 2.0" badge (OpenAI logo)
- Edit image (wand icon)
- Wide Research (target icon)
- Scheduled tasks (calendar icon)
- Create spreadsheet (grid icon)
- Create video (video icon)
- Generate audio (waveform icon)
- Playbook (copy icon)

## More Menu — Mobile (IMG_7444)

Full-screen list, dark bg:
- Search
- Projects
- Library
- Skills
- Schedule
- Connectors
- Memory
- GitHub
- Discover
- Webhooks
- Data Controls
- Settings
- **Help** (highlighted with teal/blue bg, bottom)

## Desktop Sidebar (IMG_7442, IMG_7443)

Slide-over panel with "manus" logo + X close button:
- New task (pen icon)
- Agent (globe icon)
- Search (magnifier) — "Ctrl+K" shortcut badge
- Library (book icon)
- [Task list items visible behind]
- Skills (lightning bolt, colored yellow)
- Schedule (calendar, colored red/orange)
- Connectors (plug, colored dark)
- Memory (brain, colored pink)
- GitHub (link, colored gray)
- Billing (card, colored yellow)
- Discover (compass, colored red)
- Help (question mark, colored red)
- Webhooks (hook icon)
- Data Controls (shield icon)

**Footer**: Settings gear | Grid | Plug | Question | Monitor — "from ∞ Meta"

## Settings / Account (IMG_7452, IMG_7453, IMG_7454)

### Account page (IMG_7452):
- Back arrow, notification bell (red dot)
- Avatar circle (purple, "M"), "Michael Penn >" with email below
- Subscription card: "Manus Pro", renewal date, credits count (868574), "Add credits" button
- "Explore what's in Manus Pro >"
- **Manus** section:
  - Share with a friend
  - Scheduled tasks
  - Knowledge
  - Mail Manus
  - Data controls
  - Cloud Browser
  - [continues below]

### Settings page (IMG_7453):
- Data controls (top, partially visible)
- Cloud Browser
- Skills
- Connectors
- Integrations
- **General** section header:
  - Account
  - Language — "English" value
  - Appearance — "Follow system" dropdown
  - Clear cache — "1.72 GB" value
- **Other** section header:
  - Rate this app
  - Get help
- Footer: "Manus v26.3.5" / "from ∞ Meta"

## Typography & Colors

- **Heading font**: Serif (likely a custom serif like Recoleta or similar warm serif)
- **Body font**: System sans-serif
- **Background**: Pure black (#000000 or very close #0a0a0a)
- **Card bg**: Dark gray (#1a1a1a-ish), subtle border
- **Text primary**: White/near-white
- **Text muted**: Medium gray (#888-#999)
- **Accent**: Blue/teal for active states (bottom tab, Help highlight)
- **Connected badge**: Green outline with green text
- **Pro badge**: Blue circle

## Key Interaction Patterns

1. Bottom sheet slides up with spring animation, has drag handle (pill) at top
2. Cards have subtle press state (scale down slightly)
3. Tab bar icons change fill/color on active
4. Sidebar slides from left with overlay dimming background
5. Suggestion carousel is swipeable with momentum
6. Input bar has subtle focus state (border brightens)
