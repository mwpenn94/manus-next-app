# Manus Next — Architecture Reference

**Date:** 2026-04-22 | **Version:** 2.0

---

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      Client (React 19)                        │
│  36 pages, lazy-loaded via wouter                             │
│  Tailwind 4 + shadcn/ui + Radix UI + Framer Motion           │
│  16 hooks, 3 contexts, tRPC React Query bindings              │
│  ~25,000 lines of frontend code                               │
└─────────────────────┬────────────────────┬───────────────────┘
                      │ HTTP/tRPC          │ WebSocket (×3)
┌─────────────────────┴────────────────────┴───────────────────┐
│                Server (Express 4 + tRPC 11)                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Middleware Stack (execution order):                      │ │
│  │  1. helmet() — security headers                          │ │
│  │  2. Rate limiters — stream/upload/tts/api                │ │
│  │  3. express.raw() — Stripe webhook body                  │ │
│  │  4. express.json() — JSON body parser (50MB)             │ │
│  │  5. express.urlencoded() — form body parser              │ │
│  │  6. Custom routes — health, analytics, OAuth, upload,    │ │
│  │     TTS, stream, gate (lines 202-817)                    │ │
│  │  7. tRPC middleware — /api/trpc → router + auth context  │ │
│  │  8. Vite middleware — dev HMR / prod static serving      │ │
│  └─────────────────────────────────────────────────────────┘ │
│  routers.ts (2,794 lines) → 177 tRPC procedures              │
│  db.ts (1,576 lines) → Drizzle ORM query helpers              │
│  27 server modules → 12,000+ lines                            │
└─────────────────────┬────────────────────┬───────────────────┘
                      │ SQL (Drizzle)      │ AWS SDK / HTTP
┌─────────────────────┴──────┐  ┌──────────┴───────────────────┐
│  MySQL/TiDB                │  │  External Services            │
│  20+ tables, 33 exports    │  │  S3, CloudFront, ACM          │
│  Drizzle ORM + migrations  │  │  Forge API (LLM, Image, STT)  │
└────────────────────────────┘  │  Stripe, GitHub API            │
                                │  ip-api.com, Edge TTS          │
                                └──────────────────────────────┘
```

## HTTP Endpoints (Non-tRPC)

| Method | Path | Purpose | Auth | Rate Limit |
|--------|------|---------|------|------------|
| GET | `/api/health` | Health check | None | None |
| GET | `/_validate` | Deployment validation | None | None |
| POST | `/_validate/artifact` | Artifact validation | None | None |
| POST | `/api/analytics/collect` | Page view collection | None | None |
| GET | `/api/analytics/pixel.js` | Analytics pixel script | None | None |
| GET | `/api/connector/oauth/callback` | Connector OAuth callback | None | None |
| POST | `/api/upload` | File upload to S3 | Session | 20/min |
| POST | `/api/tts` | Text-to-speech synthesis | Session | 30/min |
| POST | `/api/tts/stream` | Streaming TTS | Session | 30/min |
| GET | `/api/tts/voices` | Available TTS voices | Session | None |
| GET | `/api/tts/languages` | Supported TTS languages | Session | None |
| POST | `/api/gate-response` | Confirmation gate response | Session | None |
| POST | `/api/stream` | Agent chat streaming (SSE) | Session | 10/min |
| POST | `/api/stripe/webhook` | Stripe webhook handler | Stripe sig | None |
| POST | `/api/test-login` | Dev-only test login | Dev only | None |

## WebSocket Endpoints

| Path | Module | Lines | Purpose | Auth |
|------|--------|-------|---------|------|
| `/ws/device` | `deviceRelay.ts` | 214 | Desktop companion device relay | Session ID |
| `/ws/voice` | `voiceStream.ts` | 626 | Real-time STT → LLM → TTS pipeline | Session ID |
| `/api/analytics/ws` | `analyticsRelay.ts` | 303 | Live visitor count push | Project ID |

## File Structure (Key Files with Line Counts)

```
manus-next-app/                          (77,119 lines total)
├── client/src/
│   ├── App.tsx                    291    routing + layout
│   ├── main.tsx                          providers + tRPC client
│   ├── index.css                         theme variables + global
│   ├── const.ts                          login URL, app constants
│   ├── pages/                            (36 page components)
│   │   ├── TaskView.tsx         2,896    agent workspace (LARGEST)
│   │   ├── WebAppProjectPage.tsx 1,430   project dashboard
│   │   ├── SettingsPage.tsx     1,179    settings (8 sections)
│   │   ├── Library.tsx          1,150    document library
│   │   ├── GitHubPage.tsx         926    GitHub integration
│   │   ├── ClientInferencePage    704    local model loading
│   │   ├── ReplayPage.tsx         613    task replay
│   │   ├── ConnectorsPage.tsx     606    connector hub
│   │   ├── MemoryPage.tsx         594    memory management
│   │   ├── WebAppBuilderPage.tsx  571    code generator
│   │   ├── ConnectDevicePage.tsx   532    device pairing
│   │   ├── MobileProjectsPage    530    mobile projects
│   │   ├── DesignView.tsx         523    design canvas
│   │   ├── Home.tsx               469    landing page
│   │   └── ... (22 more pages, 100-420 lines each)
│   ├── components/
│   │   ├── AppLayout.tsx        1,102    main shell + sidebar
│   │   ├── ManusNextChat.tsx      501    chat interface
│   │   ├── WebappPreviewCard.tsx  437    webapp preview card
│   │   ├── AIChatBox.tsx          335    AI chat component
│   │   ├── DashboardLayout.tsx    264    sidebar layout
│   │   ├── Map.tsx                155    Google Maps
│   │   ├── ManusDialog.tsx         93    dialog component
│   │   └── ui/                          shadcn/ui (30+ components)
│   ├── hooks/                           (16 custom hooks)
│   │   ├── useVoiceSession.ts     452    voice input
│   │   ├── useHandsFreeMode.ts    417    hands-free loop
│   │   ├── useKokoroTTS.ts        305    neural TTS (WASM)
│   │   ├── useCrimsonHawk.ts      279    feature flags
│   │   ├── useScreenShare.ts      277    screen sharing
│   │   ├── useEdgeTTS.ts          244    Edge TTS fallback
│   │   ├── useKeyboardShortcuts   213    keyboard shortcuts
│   │   ├── useVideoCapture.ts     213    video capture
│   │   ├── audioFeedback.ts       159    audio level viz
│   │   ├── useTTS.ts              149    TTS orchestrator
│   │   ├── useFileUpload.ts       126    file upload
│   │   ├── useRealtimeAnalytics   123    WebSocket analytics
│   │   └── ... (4 more, 20-81 lines each)
│   └── contexts/
│       ├── TaskContext.tsx         665    task state management
│       ├── ThemeContext.tsx               theme management
│       └── BridgeContext.tsx              external bridge
├── server/
│   ├── _core/
│   │   ├── index.ts               871    server bootstrap + routes
│   │   ├── llm.ts                 431    LLM integration
│   │   ├── context.ts                    tRPC context + auth
│   │   ├── oauth.ts                      Manus OAuth flow
│   │   ├── env.ts                        environment variables
│   │   ├── notification.ts               owner notifications
│   │   ├── imageGeneration.ts            Forge image API
│   │   ├── voiceTranscription.ts         Whisper API
│   │   ├── map.ts                        Google Maps proxy
│   │   └── sdk.ts                        Forge SDK client
│   ├── routers.ts               2,794    ALL tRPC procedures
│   ├── db.ts                    1,576    ALL query helpers
│   ├── agentTools.ts            2,543    14 agent tools
│   ├── agentStream.ts           1,361    SSE streaming engine
│   ├── voiceStream.ts             626    voice WebSocket
│   ├── runtimeValidator.ts        384    runtime validation
│   ├── connectorOAuth.ts          370    connector OAuth
│   ├── sslProvisioning.ts        365    ACM certificates
│   ├── geoip.ts                   356    IP geolocation + cache
│   ├── mediaContext.ts            358    media processing
│   ├── analyticsRelay.ts         303    WebSocket analytics
│   ├── scheduler.ts               289    task scheduler
│   ├── githubApi.ts               285    GitHub REST API
│   ├── tts.ts                     252    TTS server
│   ├── stripe.ts                  245    Stripe integration
│   ├── automationContext.ts       243    automation context
│   ├── promptCache.ts             214    prompt LRU cache
│   ├── deviceRelay.ts             214    device WebSocket
│   ├── cloudfront.ts              206    CDN management
│   ├── confirmationGate.ts        162    user confirmation
│   ├── memoryExtractor.ts         155    memory extraction
│   ├── authAdapter.ts             120    auth adapter
│   ├── pdfExtraction.ts            84    PDF text extraction
│   ├── products.ts                 56    Stripe products
│   ├── documentGeneration.ts      447    doc generation
│   └── storage.ts                        S3 helpers
├── drizzle/
│   ├── schema.ts                  848    33 schema exports
│   ├── relations.ts                      table relationships
│   └── migrations/                       SQL migration files
├── packages/                             14 thin stub packages (type re-exports)
├── shared/
│   ├── const.ts                          shared constants
│   └── types.ts                          shared types
├── docs/                                 326 markdown files
└── server/*.test.ts                      62 test files (1,540 tests)
```

## Data Flow Diagrams

### Agent Task Execution
```
User Message → TaskContext.createTask()
  → POST /api/stream (SSE)
  → agentStream.ts → _core/llm.ts → Forge API
  → Response with tool calls?
    → Yes: agentTools.ts executes tool → Feed result → Loop
    → No: Stream final response → TaskView renders
  → Save to task_messages table
```

### Webapp Build-to-Deploy
```
User Prompt → WebAppBuilderPage textarea
  → POST /api/stream → LLM generates HTML
  → Extract from code fences → webapp.create → DB
  → Preview in sandboxed iframe
  → webapp.publish → storagePut() → S3 URL
  → webappProject.create → DB
  → webappProject.deploy → CloudFront + S3
  → Analytics pixel → page_views → Dashboard
```

### Voice Interaction
```
User speaks → MediaRecorder → Upload to S3
  → Whisper API → Transcription text
  → Inject into chat → Agent processes
  → Response → TTS pipeline:
    Kokoro WASM → Edge TTS → Browser TTS
  → Audio output → (Hands-free: auto-listen)
```

### Payment Flow
```
Subscribe → server creates Checkout Session
  → Redirect to Stripe (new tab)
  → User completes payment
  → Stripe webhook → /api/stripe/webhook
  → Verify signature → Process event
  → Update user.subscriptionStatus
```

### Real-Time Analytics
```
Visitor loads published webapp
  → Analytics pixel fires → POST /api/analytics/collect
  → GeoIP lookup (CDN headers → ip-api.com → cache)
  → INSERT page_views
  → analyticsRelay.notifyPageView()
  → WebSocket push to dashboard clients
  → LiveVisitorBadge updates count
```

## Error Handling Strategy

| Layer | Strategy | Implementation |
|-------|----------|---------------|
| tRPC procedures | `TRPCError` with typed codes | UNAUTHORIZED, NOT_FOUND, BAD_REQUEST, INTERNAL_SERVER_ERROR |
| Database queries | Try/catch with logging | Errors logged, generic message to client |
| External APIs | Try/catch with fallback | CloudFront → S3-direct, GeoIP → cache → null |
| WebSocket | Connection error + reconnect | Client auto-reconnects with exponential backoff |
| Streaming (SSE) | Error event + close | Client shows error toast, allows retry |
| File upload | Size/type validation | 50MB limit, MIME type whitelist |

## Environment Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `DATABASE_URL` | MySQL connection string | Platform |
| `JWT_SECRET` | Session cookie signing | Platform |
| `VITE_APP_ID` | OAuth application ID | Platform |
| `OAUTH_SERVER_URL` | OAuth backend URL | Platform |
| `VITE_OAUTH_PORTAL_URL` | OAuth login portal | Platform |
| `OWNER_OPEN_ID` | Owner's OpenID | Platform |
| `OWNER_NAME` | Owner's display name | Platform |
| `BUILT_IN_FORGE_API_URL` | Forge API endpoint | Platform |
| `BUILT_IN_FORGE_API_KEY` | Forge API key (server) | Platform |
| `VITE_FRONTEND_FORGE_API_KEY` | Forge API key (client) | Platform |
| `VITE_FRONTEND_FORGE_API_URL` | Forge API URL (client) | Platform |
| `STRIPE_SECRET_KEY` | Stripe server key | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing | Stripe |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe client key | Stripe |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | GitHub |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | GitHub |

---

*End of Architecture Reference v2.0*
