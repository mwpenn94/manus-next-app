# Virtual User Validation Notes

**Date:** 2026-04-22
**Purpose:** Document findings from comprehensive virtual user journey validation

## Screenshot Observations (Home Page)

1. **Header:** "manus next" branding top-left, "Manus Next Max" tier selector center, "Credits" button top-right
2. **Credits display:** "5,500 credits" with "v2.0" badge
3. **Search:** "Search tasks and messages..." with filter icon
4. **Task tabs:** All | Running 14 | Done 32 | Error
5. **Task list:** Shows 3 tasks with "In progress" status badges
6. **Greeting:** "Hello, Michael." with "What can I do for you?"
7. **Input:** "Give Manus Next a task to work on..." with attachment, mic, and submit buttons
8. **Quick actions:** Build a website, Create slides, Write a document, Generate images, Wide Research
9. **Suggestion cards:** Research AI Agent Architectures, Analyze Market Trends, Build a Product Landing Page
10. **Sidebar nav:** Analytics, Memory, Projects, Library, Share with a friend
11. **Bottom bar:** User avatar, theme toggle, settings, keyboard, logout icons
12. **Package badges:** browser, computer, document, deck, billing, share, replay, scheduled, webapp-builder, client-inference, desktop, sync, bridge

## Validation Status
- App loads and renders correctly
- User is authenticated (shows "Hello, Michael.")
- All navigation elements present
- Task management functional (Running 14, Done 32)
# Last validated: 2026-04-22T18:54:51Z

## Webapp Builder Route Investigation

The /webapp-builder route loaded the home page. Need to check routing.
