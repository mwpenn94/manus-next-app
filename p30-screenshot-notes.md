# P30 Screenshot Observations

## Home Page (actual text)
- Greeting: "Hello." (with period) — h1 text
- Subtitle: "What can I do for you?"
- Input placeholder: "Give Manus Next a task to work on..."
- Category tabs: Featured, Research, Life, Data Analysis, Education, Productivity
- Suggestion cards visible: "Research AI Agent Architectures", "Analyze Market Trends", etc.
- Referral banner: "Share with a friend" / "Get 500 credits each"
- Bottom icons visible: theme toggle, settings gear, sparkle, arrow

## Failures to fix:
1. Test expects "Hello" but h1 has "Hello." — fix test to match "Hello."
2. Referral text is "Share with a friend" not "Share with a friend" — test expects "500 credits" which shows as "500 credits each" — need .first()
3. Task submit: page navigates to /task/... but test waits 1000ms which may not be enough
4. Mobile sidebar: strict mode violation — 2 "Usage & Billing" elements (desktop + mobile sidebar) — use .first()
5. Color contrast: real accessibility issues — these are axe-like warnings from the browser, need to fix CSS colors
