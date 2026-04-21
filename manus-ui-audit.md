# Manus UI/UX Audit — Side-by-Side Comparison

## Manus Homepage (manus.im)
- **Theme**: Light/cream background (#f8f8f7), NOT dark
- **Layout**: Clean centered layout, no sidebar on landing page
- **Header**: Simple top nav with logo, Features, Solutions, Resources, Events, Business, Pricing, Sign up
- **Hero**: Large "What can I do for you?" heading, centered
- **Input**: Clean text input area with action icons below (upload, slides, website, desktop, laptop)
- **Banner**: "Manus is now part of Meta" announcement bar at top
- **Style**: Minimalist, warm cream tones, very clean typography

## Key Differences from Our App
1. Manus landing is LIGHT theme, our app is dark — this is intentional differentiation (Sovereign brand)
2. Manus has no sidebar on landing — just centered content
3. Our sidebar with task list is more like the logged-in Manus experience
4. Need to check Manus logged-in dashboard for true comparison

## Manus Logged-In Dashboard (app.manus.im)
- **Theme**: Dark theme with warm undertones (dark charcoal/near-black bg)
- **Sidebar**: Left sidebar with:
  - Logo "manus" at top-left, collapse button
  - "+ New session" button with keyboard shortcut indicator
  - Task list with status dots (green running, etc.) and timestamps
  - Bottom: user avatar, settings icon, help icon, referral banner
- **Main area**: Centered "Hello [Name]. What can I do for you?" 
- **Input**: Clean rounded input with placeholder, send button
- **Categories**: Featured, Research, Life, Data Analysis, Education, Productivity, WTF
- **Suggestion cards**: 4-column grid with icon, title, description, preview image
- **Task view**: Three-panel — sidebar | chat | workspace (Preview/Code/etc tabs)
- **Workspace tabs**: Preview, Code (with <> icon), other management icons
- **Top bar in task**: Version indicator (Manus 1.5), share/bookmark/settings icons, Publish button

## Gap Analysis: Our App vs Manus

### Already at parity or better:
1. ✅ Dark theme with warm tones — matches Manus
2. ✅ Sidebar with task list, search, status filters — matches Manus
3. ✅ "Hello" greeting with centered input — matches Manus
4. ✅ Category tabs (Featured, Research, etc.) — matches Manus
5. ✅ Suggestion cards with icons — matches Manus
6. ✅ Three-panel task view (sidebar | chat | workspace) — matches Manus
7. ✅ Workspace tabs (Preview, Code, Terminal) — matches Manus
8. ✅ User avatar + login/logout in sidebar — matches Manus
9. ✅ Credits display — matches Manus
10. ✅ Version badge (v2.0) — matches Manus (1.5)
11. ✅ Keyboard shortcut for new task (⌘K) — matches Manus
12. ✅ Task progress steps display — matches Manus

### Gaps to fix:
1. **Sidebar bottom icons**: Manus has settings gear, lightbulb, help circle at bottom. Our app has theme toggle and logout. Need to add settings shortcut and help icon.
2. **"Share Manus with a friend" referral**: Manus has referral banner at sidebar bottom. We don't need exact copy but should have something similar.
3. **Input action icons**: Manus has +, attachment, slides, code, voice icons below input. We have attachment, mic, camera, terminal — close but slightly different arrangement.
4. **Suggestion card images**: Manus cards have preview screenshots. Our cards don't have images — just icon + text.
5. **Task view top bar**: Manus shows version dropdown, share, bookmark, timer, settings icons. We have similar but arrangement differs.
6. **Publish button**: Manus has prominent "Publish" button in top-right of task view. We have it in WebApp project page but not in main task view.
7. **"Manus's computer" widget**: Manus shows a computer preview widget in chat with task progress. We have task progress but not the computer preview thumbnail.
8. **Suggested follow-ups**: After task completion, Manus shows suggested follow-up prompts. We don't have this.
9. **Star rating**: Manus has "How was this result?" with star rating after task completion. We don't have this.
10. **Sidebar collapse**: Manus has a collapse button for sidebar. We have mobile drawer but no desktop collapse toggle.
