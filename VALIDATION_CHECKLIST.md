# Virtual User Validation Checklist — Parity v8.0

## Features to validate end-to-end (live server + UI):

### Already Implemented — Must Validate Live
1. [x] Chat Mode — conversational interaction (existing)
2. [x] Agent Mode long-running — multi-step task execution (existing)
3. [ ] Speed/Quality Mode toggle — verify mode switch affects LLM params
4. [ ] Cross-session memory — add/list/search/delete memories
5. [ ] Task sharing via signed URL — create share, view shared, password protection
6. [ ] Notifications — auto-created on task complete/error, list, mark read
7. [ ] Document generation tool — agent creates downloadable documents
8. [ ] Memory page UI — accessible from sidebar, CRUD operations work
9. [ ] Share dialog UI — accessible from task view, creates share links
10. [ ] Mode toggle UI — visible in task view, persists selection
11. [ ] Notification center UI — bell icon, unread count, dropdown
12. [ ] SharedTaskView page — /shared/:token renders task content
13. [ ] SEO basics — meta tags, robots.txt, OG tags

### Capability Honesty — Settings page must accurately describe what works
14. [ ] SettingsPage capabilities match actual implemented features
15. [ ] No false claims about unimplemented features

### Stability
16. [ ] All 128 tests pass
17. [ ] No TypeScript compilation errors
18. [ ] Server starts without errors
19. [ ] No console errors in browser
