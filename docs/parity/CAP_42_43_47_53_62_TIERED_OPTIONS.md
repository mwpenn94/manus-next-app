# CAP_42/43/47/53/62 TIERED_OPTIONS — Deep Dive

**Spec version:** v9 | **Audit date:** April 20, 2026

> Per v9 §4: detailed tiered options for the 5 capabilities that were recently RED or required special attention.

---

## #42 App Publishing (Mobile)

### Current Implementation
AppPublishPage.tsx with PWA/Capacitor/Expo build pipeline, GitHub Actions CI/CD workflow generator, build status tracking, platform-specific checklists.

### Tiered Options

| Tier | Provider | Cost | What You Get | Limitations |
|------|----------|------|-------------|-------------|
| **Free (current)** | Config generation + GitHub Actions | $0 | PWA manifest, Capacitor config, Expo config, CI/CD YAML, platform checklists | No actual binary compilation; user must run builds locally or via free CI |
| **Low-cost** | Expo EAS Build | $0-29/mo | 30 free builds/mo, iOS + Android, OTA updates, app signing | 30 build limit; queue times on free tier |
| **Optimal** | Codemagic + Fastlane | $0-299/mo | 500 min free, M1 Mac builds, automated store submission | Cost scales with build frequency |

### Upgrade Triggers
- **Free → Low-cost:** User needs actual compiled .apk/.ipa binaries (not just configs)
- **Low-cost → Optimal:** >30 builds/month or need automated App Store/Play Store submission

### Migration Path
1. Free → EAS: `npx eas-cli build --platform all` (2-3 agent-hours)
2. EAS → Codemagic: Add codemagic.yaml, configure signing (3-5 agent-hours)

---

## #43 Mobile Development

### Current Implementation
MobileProjectsPage.tsx with PWA service worker generator, Capacitor config, Expo config, framework comparison matrix, project CRUD.

### Tiered Options

| Tier | Provider | Cost | What You Get | Limitations |
|------|----------|------|-------------|-------------|
| **Free (current)** | PWA + config scaffolding | $0 | Service worker, manifest.json, Capacitor/Expo project configs, framework comparison | No native module compilation; configs only |
| **Low-cost** | Capacitor + Ionic | $0 (OSS) | Native bridge, 100+ plugins, web-to-native | Need Xcode/Android Studio for builds |
| **Optimal** | React Native + Expo | $0-29/mo | Full native UI, EAS Build, OTA updates | Larger bundle size, steeper learning curve |

### Upgrade Triggers
- **Free → Low-cost:** User needs native device APIs (camera, GPS, push notifications)
- **Low-cost → Optimal:** Need native UI performance or complex animations

### Migration Path
1. Free → Capacitor: `npx cap init`, add platforms (3-4 agent-hours)
2. Capacitor → React Native: Full rewrite of UI layer (20-40 agent-hours)

---

## #47 My Computer (BYOD)

### Current Implementation
ConnectDevicePage.tsx with device pairing via CDP (Chrome DevTools Protocol), ADB (Android Debug Bridge), WDA (WebDriverAgent for iOS), Cloudflare Tunnel, and Electron bridge. Device session management, multi-platform support.

### Tiered Options

| Tier | Provider | Cost | What You Get | Limitations |
|------|----------|------|-------------|-------------|
| **Free (current)** | WebSocket relay + protocol adapters | $0 | CDP, ADB, WDA pairing; session management; pairing codes | Requires same network or manual tunnel setup |
| **Low-cost** | Cloudflare Tunnel (free tier) | $0 | NAT traversal, secure tunnels, no port forwarding | 50 concurrent connections on free tier |
| **Optimal** | Tailscale + custom relay | $0-6/user/mo | Mesh VPN, 100 devices free, WireGuard-based | Need Tailscale account per user |

### Upgrade Triggers
- **Free → Low-cost:** User's device is behind NAT and cannot establish direct connection
- **Low-cost → Optimal:** >50 concurrent device connections or need enterprise network policy

### Migration Path
1. Free → Cloudflare Tunnel: Add `cloudflared` binary, configure tunnel (2-3 agent-hours)
2. Tunnel → Tailscale: Install Tailscale, configure ACLs (3-4 agent-hours)

---

## #53 Microsoft Agent365

### Current Implementation
Azure AD OAuth scaffold in connectorOAuth.ts (authorize URL, token exchange, refresh, user info extraction). Microsoft 365 connector entry in ConnectorsPage. Env vars MICROSOFT_365_OAUTH_CLIENT_ID/SECRET in env.ts.

### Tiered Options

| Tier | Provider | Cost | What You Get | Limitations |
|------|----------|------|-------------|-------------|
| **Free (current)** | Azure AD OAuth scaffold | $0 | OAuth flow ready, user authentication, basic profile | No Graph API calls; scaffold only |
| **Low-cost** | Microsoft Graph API (free tier) | $0 | Mail, Calendar, Files, Contacts read/write; 10K req/10min | Rate-limited; basic scopes only |
| **Optimal** | Microsoft 365 E3 + Graph API | $36/user/mo | Full Graph API, compliance, eDiscovery, advanced scopes | Enterprise licensing required |

### Upgrade Triggers
- **Free → Low-cost:** User registers Azure AD app and provides client ID/secret
- **Low-cost → Optimal:** Need advanced scopes (compliance, eDiscovery) or >10K API calls/10min

### Migration Path
1. Free → Graph API: Register Azure AD app, add `@microsoft/microsoft-graph-client` (4-6 agent-hours)
2. Graph API → E3: Enterprise licensing decision (1-2 agent-hours for code, business decision for licensing)

### §L.25 Degraded-Delivery Status
Currently operating in degraded mode: OAuth scaffold is functional but no Graph API calls are made. The connector shows as "connected" after OAuth but cannot execute Microsoft 365 operations until Graph SDK is integrated. This is documented and the user sees a "Setup Required" badge.

---

## #62 Veo3 Video Generation

### Current Implementation
VideoGeneratorPage.tsx with prompt input, project grid, preview dialog. video_projects DB table with schema for multi-provider support. tRPC router with generate/list/get/delete procedures. Provider field supports "ffmpeg-slideshow", "replicate-svd", and "veo3".

### Tiered Options

| Tier | Provider | Cost | What You Get | Limitations |
|------|----------|------|-------------|-------------|
| **Free (current)** | FFmpeg slideshow | $0 | Image sequence → video conversion, unlimited | No AI-generated motion; static transitions only |
| **Low-cost** | Replicate (Stable Video Diffusion) | $0.05-0.50/video | AI image-to-video, 4-second clips, multiple models | 4s max duration; requires Replicate API key |
| **Optimal** | Google Veo3 / Runway Gen-3 Alpha | $0.50-5.00/video | Text-to-video, 10-60s clips, highest quality | Requires API access (waitlist for Veo3) |

### Upgrade Triggers
- **Free → Low-cost:** User needs AI-generated motion (not just slideshows)
- **Low-cost → Optimal:** Need >4s clips, text-to-video, or production quality

### Migration Path
1. Free → Replicate: Add `replicate` npm package, configure API key, update video router provider selection (2-3 agent-hours)
2. Replicate → Veo3: Add Google AI SDK, configure API key, update provider adapter (2-3 agent-hours)

### §L.25 Degraded-Delivery Status
Currently operating in degraded mode: projects are created with "pending" status. The free-tier FFmpeg slideshow provider is documented but not yet wired to a background worker. The UI shows provider badges (Free/Freemium/Premium) and the project status. Full video generation activates when a provider API key is configured.

---

## Cross-Capability Summary

| # | Capability | Current Tier | Monthly Cost | Next Tier Trigger |
|---|-----------|-------------|-------------|-------------------|
| 42 | App Publishing | Free (config gen) | $0 | Need compiled binaries |
| 43 | Mobile Dev | Free (config gen) | $0 | Need native APIs |
| 47 | My Computer | Free (WebSocket) | $0 | NAT traversal needed |
| 53 | Microsoft 365 | Free (OAuth scaffold) | $0 | Azure AD app registered |
| 62 | Video Gen | Free (FFmpeg) | $0 | Need AI motion |

**All 5 capabilities operate at $0/mo with documented upgrade paths.**
