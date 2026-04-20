# TIERED_OPTIONS — Manus Next v9

**Spec version:** v9 | **Audit date:** April 20, 2026 | **Auditor:** Agent (v9 §L.21 compliance)

> Per §L.21 freemium-first protocol: every external dependency must have 3 documented tiers (free, low-cost, optimal-scalable), concrete upgrade triggers, and migration effort estimates.

---

## 1. Authentication

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus OAuth (current) | $0 | Unlimited users within Manus platform | Platform lock-in unacceptable |
| Low-cost | Lucia Auth (OSS self-hosted) | $0-5/mo (server cost) | Unlimited; requires own server | Need custom OAuth providers beyond Manus |
| Optimal | Clerk | $25/mo (10K MAU) | 10K MAU, enterprise SSO, MFA | >10K users or enterprise SSO requirement |

**Migration effort:** 4-8 agent-hours (swap auth middleware, update session handling)

## 2. Database

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus TiDB (current) | $0 | Managed MySQL-compatible, shared resources | Need dedicated IOPS or >10GB |
| Low-cost | Turso (LibSQL) | $0-9/mo | 9GB free, 500M reads/mo; $9/mo for 24GB | >9GB data or edge replication needed |
| Optimal | PlanetScale | $39/mo+ | Dedicated resources, branching, insights | >100K queries/day or team collaboration on schema |

**Migration effort:** 6-10 agent-hours (Drizzle adapter swap, schema migration, data export/import)

## 3. Hosting / Deployment

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus hosting (current) | $0 | CDN, SSL, custom domains included | Need multi-region or >50K RPM |
| Low-cost | Fly.io | $0-5/mo | 3 shared VMs free, 160GB bandwidth | Need persistent volumes or GPU |
| Optimal | Cloudflare Pages + Workers | $20/mo+ | Unlimited requests, 100K Worker invocations/day free | Global edge compute, >1M requests/day |

**Migration effort:** 2-4 agent-hours (Dockerfile or buildpack, env var migration)

## 4. File Storage (S3)

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus S3 (current) | $0 | Managed S3 via storagePut/storageGet | Need direct S3 API or >50GB |
| Low-cost | Cloudflare R2 | $0-0.015/GB/mo | 10GB free, no egress fees | >10GB storage or high egress |
| Optimal | AWS S3 | $0.023/GB/mo + egress | Unlimited, lifecycle policies, versioning | Enterprise compliance, cross-region replication |

**Migration effort:** 2-3 agent-hours (swap S3 client config, update bucket references)

## 5. LLM / AI Inference

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus invokeLLM (current) | $0 | Platform-managed model selection | Need specific model (GPT-4o, Claude 3.5) or fine-tuning |
| Low-cost | OpenRouter | $0.001-0.01/1K tokens | Pay-per-use, 200+ models, free tier models available | Need model diversity or cost optimization |
| Optimal | OpenAI API direct | $0.005-0.06/1K tokens | Highest quality, function calling, vision | Production SLA, guaranteed throughput |

**Migration effort:** 1-2 agent-hours (swap invokeLLM implementation, add API key)

## 6. Image Generation

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus generateImage (current) | $0 | Platform-managed | Need specific model or higher resolution |
| Low-cost | Replicate (Flux) | $0.003-0.05/image | Pay-per-use, many models | Need SDXL, ControlNet, or inpainting |
| Optimal | OpenAI DALL-E 3 / Midjourney API | $0.04-0.12/image | Highest quality, commercial license | Production quality requirements |

**Migration effort:** 1-2 agent-hours (swap generateImage implementation)

## 7. Video Generation

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | FFmpeg slideshow (current) | $0 | Image-to-video via ffmpeg, unlimited | Need AI-generated motion |
| Low-cost | Replicate (Stable Video Diffusion) | $0.05-0.50/video | Pay-per-use, 4s clips | Need longer clips or higher quality |
| Optimal | Google Veo3 / Runway Gen-3 | $0.50-5.00/video | Highest quality, text-to-video | Production video content |

**Migration effort:** 2-4 agent-hours (add provider adapter, update video router)

## 8. Voice Transcription (STT)

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus transcribeAudio (current) | $0 | Whisper via platform | Need real-time streaming STT |
| Low-cost | Deepgram | $0.0043/min (pay-as-you-go) | Real-time + batch, 45+ languages | Need <200ms latency or diarization |
| Optimal | OpenAI Whisper API | $0.006/min | Highest accuracy, 57 languages | Production SLA, guaranteed uptime |

**Migration effort:** 1-2 agent-hours (swap transcription endpoint)

## 9. Voice Synthesis (TTS)

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Browser SpeechSynthesis (current) | $0 | Built-in, no API calls | Need custom voices or higher quality |
| Low-cost | ElevenLabs | $5/mo (30K chars) | 29 languages, voice cloning | Need natural-sounding voices |
| Optimal | OpenAI TTS | $0.015/1K chars | 6 HD voices, streaming | Production quality, low latency |

**Migration effort:** 2-3 agent-hours (add TTS endpoint, update frontend player)

## 10. Email Sending

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus notifyOwner (current) | $0 | Owner notifications only | Need user-facing transactional email |
| Low-cost | Resend | $0 (100 emails/day free) | 3K/mo free, then $20/mo for 50K | >100 emails/day |
| Optimal | SendGrid | $19.95/mo (50K emails) | Dedicated IP, analytics, templates | >50K emails/mo or deliverability SLA |

**Migration effort:** 2-3 agent-hours (add email service, create templates)

## 11. Web Search

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | DuckDuckGo HTML scraping (current) | $0 | Rate-limited, no API key needed | Need structured results or >100 queries/day |
| Low-cost | SerpAPI | $50/mo (5K searches) | Structured Google results, 100 free/mo | Need Google-quality results at scale |
| Optimal | Google Custom Search API | $5/1K queries | Official API, 100 free/day | >5K queries/day, enterprise SLA |

**Migration effort:** 1-2 agent-hours (swap search function in agentTools.ts)

## 12. Payments

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | No payments (current freemium) | $0 | N/A | Need to accept payments |
| Low-cost | Stripe (current, activated) | 2.9% + $0.30/txn | Full-featured, test sandbox active | Default choice when payments needed |
| Optimal | Stripe + LemonSqueezy (MoR) | 5-8% (includes tax) | Merchant of record handles global tax | International sales, tax compliance |

**Migration effort:** Already integrated (Stripe). LemonSqueezy: 4-6 agent-hours

## 13. Analytics

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus Analytics (current) | $0 | UV/PV tracking via VITE_ANALYTICS_ENDPOINT | Need funnels, cohorts, or A/B testing |
| Low-cost | Umami (self-hosted) | $0-5/mo (server) | Unlimited events, GDPR compliant | Need custom events or retention analysis |
| Optimal | PostHog | $0-450/mo | 1M events free, feature flags, session replay | >1M events/mo or product analytics |

**Migration effort:** 1-2 agent-hours (add tracking script, configure events)

## 14. Error Tracking

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Console logging (current) | $0 | Server-side only, no aggregation | Need error aggregation or alerting |
| Low-cost | GlitchTip (self-hosted) | $0-5/mo (server) | Sentry-compatible API, unlimited events | Need stack traces, release tracking |
| Optimal | Sentry | $26/mo (50K events) | Full stack traces, performance monitoring | >50K errors/mo or team collaboration |

**Migration effort:** 1-2 agent-hours (add Sentry SDK, configure DSN)

## 15. Monitoring / Uptime

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manual checks | $0 | No automated monitoring | Need automated uptime checks |
| Low-cost | Uptime Kuma (self-hosted) | $0-5/mo (server) | Unlimited monitors, notifications | Need 24/7 monitoring without self-hosting |
| Optimal | UptimeRobot | $7/mo (50 monitors) | 5-min intervals, status pages | >50 endpoints or 1-min intervals |

**Migration effort:** 1-2 agent-hours (deploy Uptime Kuma or configure UptimeRobot)

## 16. Caching

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | In-memory Map (current) | $0 | Single-instance, lost on restart | Need persistence or multi-instance |
| Low-cost | Upstash Redis | $0 (10K commands/day free) | 256MB free, serverless | >10K cache ops/day |
| Optimal | Redis Cloud | $7/mo+ (250MB) | Dedicated instance, persistence | >256MB cache or HA requirement |

**Migration effort:** 2-3 agent-hours (add Redis client, swap cache implementation)

## 17. CDN

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus CDN (current) | $0 | Built into Manus hosting | Need custom cache rules or WAF |
| Low-cost | Cloudflare (free plan) | $0 | Unlimited bandwidth, basic WAF | Need advanced WAF or Workers |
| Optimal | Cloudflare Pro | $20/mo | Advanced WAF, image optimization, analytics | >100K unique visitors/mo |

**Migration effort:** 1-2 agent-hours (DNS change, configure cache rules)

## 18. CI/CD

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus checkpoints (current) | $0 | Built-in version control and deploy | Need automated test pipelines |
| Low-cost | GitHub Actions | $0 (2K min/mo free) | 2K minutes free for public repos | Need private repo CI or >2K min/mo |
| Optimal | GitHub Actions (Team) | $4/user/mo | 3K minutes, larger runners | Need GPU runners or parallel jobs |

**Migration effort:** 2-3 agent-hours (write workflow YAML, configure secrets)

## 19. Maps

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus Google Maps proxy (current) | $0 | Full Google Maps API via proxy | Need direct API key or billing control |
| Low-cost | Mapbox | $0 (50K loads/mo free) | 50K map loads free, then $0.50/1K | >50K loads/mo or custom map styles |
| Optimal | Google Maps Platform direct | $200 credit/mo | All APIs, $200 free credit | Need Street View, advanced Places |

**Migration effort:** 1-2 agent-hours (swap API key, update Map.tsx)

## 20. OAuth Providers (Connectors)

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | GitHub OAuth (current) | $0 | Unlimited OAuth apps | Need enterprise SAML/SSO |
| Low-cost | Google OAuth + Slack OAuth | $0 | Free OAuth apps, rate-limited | Need Microsoft 365 or custom OIDC |
| Optimal | Azure AD (Microsoft 365) | $0-6/user/mo | Enterprise SSO, conditional access | Enterprise Microsoft integration |

**Migration effort:** 2-4 agent-hours per provider (register app, add env vars, test flow)

## 21. Real-time Communication

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Server-Sent Events (current) | $0 | Unidirectional, unlimited | Need bidirectional real-time |
| Low-cost | WebSocket (native) | $0 | Bidirectional, requires sticky sessions | Need >10K concurrent connections |
| Optimal | Pusher / Ably | $0-49/mo | 200K messages free (Pusher), managed | >200K messages/day or global distribution |

**Migration effort:** 3-5 agent-hours (add WebSocket server, update client)

## 22. Task Scheduling

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Server-side polling (current) | $0 | 60s interval, in-process | Need sub-second scheduling or persistence across restarts |
| Low-cost | BullMQ + Redis | $0-5/mo (Redis cost) | Reliable queues, retries, cron | Need job persistence or >100 scheduled tasks |
| Optimal | Trigger.dev | $0-29/mo | 500 runs free, dashboard, retries | >500 runs/mo or complex workflows |

**Migration effort:** 3-5 agent-hours (add queue library, migrate scheduled tasks)

## 23. PDF Generation

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Server-side HTML-to-PDF (current) | $0 | Via generate_document tool | Need complex layouts or high volume |
| Low-cost | Puppeteer/Playwright | $0 | Chrome-based rendering, unlimited | Need headless Chrome in production |
| Optimal | DocRaptor | $15/mo (125 docs) | High-fidelity PDF, Prince XML engine | >125 docs/mo or pixel-perfect output |

**Migration effort:** 2-3 agent-hours (add PDF library, update document tool)

## 24. Slide Generation

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | LLM-generated HTML slides (current) | $0 | Via slides.generate tRPC | Need PPTX export or templates |
| Low-cost | PptxGenJS | $0 (MIT) | Native PPTX generation, unlimited | Need PowerPoint-compatible output |
| Optimal | Google Slides API | $0 (with Google Workspace) | Native Slides, collaboration | Need real-time collaboration |

**Migration effort:** 2-4 agent-hours (add PPTX library, update slides router)

## 25. Code Execution Sandbox

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Server-side eval (current) | $0 | Limited to Node.js, security concerns | Need multi-language or isolation |
| Low-cost | E2B | $0 (100 hours free) | Sandboxed environments, multi-language | >100 hours/mo or need Python/Rust |
| Optimal | Fly Machines | $0.01/hr | On-demand VMs, any language, full isolation | Need persistent environments or GPU |

**Migration effort:** 3-5 agent-hours (add sandbox client, update execute_code tool)

## 26. Design / Canvas

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Canvas API + AI gen (current) | $0 | DesignView.tsx with layer management | Need vector editing or collaboration |
| Low-cost | Fabric.js (OSS) | $0 (MIT) | Full canvas library, SVG support | Need advanced vector operations |
| Optimal | Figma API | $0-15/editor/mo | Professional design tools, plugins | Need team design collaboration |

**Migration effort:** 4-8 agent-hours (integrate canvas library, update DesignView)

## 27. Mobile Build Pipeline

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | PWA + config generation (current) | $0 | Service worker, manifest, Capacitor/Expo configs | Need actual native builds |
| Low-cost | EAS Build (Expo) | $0 (30 builds/mo free) | iOS + Android builds, OTA updates | >30 builds/mo |
| Optimal | Codemagic | $0-299/mo | 500 min free, M1 Mac builds | Need CI/CD for native apps |

**Migration effort:** 3-5 agent-hours (configure build service, add signing keys)

## 28. Desktop Build Pipeline

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Tauri config generation (current) | $0 | Config + build script generation | Need actual compiled binaries |
| Low-cost | GitHub Actions + Tauri | $0 (2K min free) | Cross-platform builds via CI | >2K build minutes/mo |
| Optimal | Electron Forge + code signing | $99/yr (Apple) + $0 (Windows) | Signed binaries, auto-update | Need app store distribution |

**Migration effort:** 4-6 agent-hours (configure build pipeline, add signing)

## 29. Device Pairing (BYOD)

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | WebSocket relay (current) | $0 | Direct pairing via CDP/ADB/WDA protocols | Need NAT traversal or >10 devices |
| Low-cost | Cloudflare Tunnel | $0 (free tier) | Secure tunnels, no port forwarding | Need reliable NAT traversal |
| Optimal | Tailscale | $0-6/user/mo | Mesh VPN, 100 devices free | >100 devices or enterprise network |

**Migration effort:** 2-3 agent-hours (add tunnel client, update pairing flow)

## 30. Messaging / Webhooks

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Custom webhook endpoints (current) | $0 | Inbound webhooks for WhatsApp/Telegram/Slack | Need official API access |
| Low-cost | Twilio (WhatsApp) | $0.005/msg | Official WhatsApp Business API | Need verified sender or >1K msgs/day |
| Optimal | MessageBird | $0.004/msg | Multi-channel (SMS, WhatsApp, Voice) | Need omnichannel messaging |

**Migration effort:** 3-5 agent-hours (add messaging SDK, update MessagingAgentPage)

## 31. Meeting Transcription

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Manus Whisper (current) | $0 | Via transcribeAudio, upload-based | Need real-time meeting transcription |
| Low-cost | AssemblyAI | $0.01/min | Real-time, speaker diarization | Need live meeting integration |
| Optimal | Otter.ai API | $16.99/mo | Automated meeting notes, integrations | Need Zoom/Teams/Meet integration |

**Migration effort:** 2-4 agent-hours (add transcription service, update MeetingsPage)

## 32. Team Collaboration

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | DB-backed teams (current) | $0 | Team CRUD, invite codes, shared sessions | Need real-time presence or RBAC |
| Low-cost | Liveblocks | $0 (250 MAU free) | Real-time presence, conflict resolution | >250 MAU or need CRDT |
| Optimal | Yjs + Hocuspocus | $0-49/mo | CRDT-based, self-hosted or managed | Need collaborative editing |

**Migration effort:** 4-8 agent-hours (add real-time library, update team features)

## 33. Figma Integration

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | URL parsing + agent extraction (current) | $0 | Extracts file key, generates code via LLM | Need direct Figma API access |
| Low-cost | Figma REST API | $0 (free for personal) | Read-only access, 30 req/min | Need write access or >30 req/min |
| Optimal | Figma Enterprise API | $75/editor/mo | Full API, branching, analytics | Need enterprise design workflow |

**Migration effort:** 2-4 agent-hours (add Figma API client, update FigmaImportPage)

## 34. Microsoft 365 Integration

| Tier | Provider | Cost | Quota / Limits | Upgrade Trigger |
|------|----------|------|----------------|-----------------|
| Free | Azure AD OAuth scaffold (current) | $0 | OAuth flow ready, no Graph API calls yet | Need actual M365 data access |
| Low-cost | Microsoft Graph API (free tier) | $0 | 10K req/10min, basic scopes | >10K requests or advanced scopes |
| Optimal | Microsoft 365 E3 | $36/user/mo | Full Graph API, compliance, eDiscovery | Enterprise M365 integration |

**Migration effort:** 4-8 agent-hours (add Graph SDK, implement mail/calendar/files)

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total services documented | 34 |
| Services with free tier active | 34/34 (100%) |
| Services with 3 tiers documented | 34/34 (100%) |
| Current monthly cost | $0.00 |
| Migration effort documented | 34/34 (100%) |

## Upgrade Decision Framework

1. **Stay free** until a concrete threshold is hit (documented per service above)
2. **Move to low-cost** when free tier limits are reached or quality is insufficient
3. **Move to optimal** only when business revenue justifies the cost
4. **Never lock in** — every tier has a documented migration path
