# Navigation Audit: Manus vs Manus Next

## Manus Sidebar (from screenshots)
Section "MANUS":
- Analytics
- Memory
- Projects
- Library
- Schedules

Section "More" page:
- Share with a friend
- Scheduled tasks
- Knowledge
- Mail Manus
- Data controls
- Cloud Browser

Bottom bar: Home, Tasks, Billing, More

## Manus Next Sidebar (current)
Section "Manus":
- Analytics ✅ (in Manus)
- Memory ✅ (in Manus)
- Projects ✅ (in Manus)
- Library ✅ (in Manus)
- Schedule ✅ (in Manus)
- Replay ❌ (NOT in Manus sidebar — could be a task-level feature)
- Skills ❌ (NOT in Manus sidebar)
- Slides ❌ (NOT in Manus sidebar — capability, not page)
- Design ❌ (NOT in Manus sidebar — capability, not page)
- Meetings ❌ (NOT in Manus sidebar)
- Connectors ❌ (NOT in Manus sidebar)
- GitHub ❌ (NOT in Manus sidebar)
- WebApp Builder ❌ (NOT in Manus sidebar — happens in chat)
- Team ❌ (NOT in Manus sidebar)
- Computer ❌ (NOT in Manus sidebar — it's "Cloud Browser" in More)
- Figma Import ❌ (NOT in Manus sidebar)
- Desktop App ❌ (NOT in Manus sidebar)

Section "Other":
- Messaging ❌ (NOT in Manus)
- Mail ⚠️ (in Manus "More" as "Mail Manus")
- Deployments ❌ (NOT in Manus — subsumed by Projects)
- Data Controls ⚠️ (in Manus "More")
- Video ❌ (NOT in Manus sidebar)

Section "General":
- Discover ❌ (NOT in Manus)
- Webhooks ❌ (NOT in Manus)
- Billing ✅ (in Manus bottom bar)
- Settings ⚠️ (not a separate page in Manus — it's profile/account)

## Routes to REMOVE (not in Manus, stub pages):
- /webapp-builder → app building happens through chat
- /deployed-websites → subsumed by /projects
- /webhooks → not in Manus
- /slides → capability, not a page
- /design → capability, not a page
- /meetings → not in Manus
- /connectors → not in Manus
- /team → not in Manus
- /figma-import → not in Manus
- /desktop-app → not in Manus
- /messaging → not in Manus
- /video → not in Manus
- /discover → not in Manus
- /mobile-projects → not in Manus
- /app-publish → not in Manus
- /client-inference → not in Manus
- /connect-device → not in Manus

## Routes to KEEP:
- / (Home)
- /task/:id (Task view)
- /billing
- /analytics
- /settings → rename to /profile or keep as settings
- /memory
- /schedule
- /replay/:taskId and /replay (task replay — keep as feature)
- /projects and /project/:id
- /library
- /github and /github/:repoId (keep — useful integration)
- /projects/webapp/:projectId (keep — webapp project management)
- /shared/:token (keep — sharing feature)
- /data-controls (keep — in Manus "More")
- /mail (keep — in Manus "More")
- /skills (keep — useful feature even if not in sidebar)
- /computer (keep — "Cloud Browser" in Manus "More")
- /profile (keep — user profile)
- /deployments (keep but merge into projects)
- /404

## Sidebar items to KEEP (aligned with Manus):
Section "Manus":
- Analytics
- Memory
- Projects
- Library
- Schedules

Keep Skills and GitHub as they're useful features, just don't put them in the main sidebar section.
