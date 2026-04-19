# Platform-Wide Assessment — Landscape Pass

## Signal Assessment (Recursive Optimization Framework)

- **Fundamental Redesign**: Absent — core architecture (React 19 + Express + tRPC + SSE agent loop) is sound
- **Landscape**: **PRESENT** — several gaps not yet challenged, alternatives unexplored
- **Depth**: Present — some areas are shallow (rate limiting, CSRF, upload auth)
- **Adversarial**: Absent — work hasn't been through adversarial scrutiny yet
- **Future-State**: Absent — not ready for future-proofing yet

**Executing: Landscape Pass**

---

## Infrastructure Findings

### INFRA-001: No Rate Limiting on API Endpoints [HIGH]
- No rate limiting middleware on any route
- `/api/stream` (LLM calls) is especially vulnerable — each call costs real money
- `/api/upload` has no rate limit — could be abused for storage exhaustion
- **Fix**: Add express-rate-limit with tiered limits (strict for /api/stream, moderate for /api/upload, lenient for /api/trpc)

### INFRA-002: File Upload Has No Authentication [HIGH]
- `/api/upload` endpoint accepts any request without auth check
- Anyone can upload files to S3 via this endpoint
- **Fix**: Add auth middleware or check session cookie before accepting uploads

### INFRA-003: SSE Stream Has No Auth Guard [MEDIUM]
- `/api/stream` does attempt auth but continues even if auth fails (line 183: `.catch(() => null)`)
- Unauthenticated users can trigger LLM calls (costs money)
- **Fix**: Return 401 if auth fails before starting the agent loop

### INFRA-004: No Request Size Limit on Stream Body [LOW]
- Stream endpoint accepts full message history without size validation
- Could be used to send extremely large payloads
- **Fix**: Add content-length check or truncate messages array

---

## Security Findings

### SEC-001: No CSRF Protection [MEDIUM]
- No CSRF tokens on any mutation endpoint
- Cookie-based auth with SameSite=none makes this exploitable
- **Fix**: Add CSRF token validation or switch to SameSite=strict

### SEC-002: XSS via dangerouslySetInnerHTML in chart.tsx [LOW]
- chart.tsx uses dangerouslySetInnerHTML — but only for chart CSS, not user input
- Low risk but should be documented

### SEC-003: Open Redirect in OAuth Flow [MEDIUM]
- `server/_core/sdk.ts:42` decodes state as redirect URI via `atob(state)`
- If state is user-controlled, this could redirect to malicious sites
- **Fix**: Validate redirect URI against allowlist

### SEC-004: No Security Headers [MEDIUM]
- No helmet middleware — missing CSP, X-Frame-Options, X-Content-Type-Options
- **Fix**: Add helmet with appropriate CSP policy

### SEC-005: Cookie SameSite=none [LOW]
- Cookies use SameSite=none which is required for cross-origin OAuth but increases CSRF risk
- Mitigated by httpOnly=true and secure=true

---

## Performance Findings

### PERF-001: Good Lazy Loading ✓
- 10+ pages use React.lazy() with Suspense
- This is well-implemented

### PERF-002: Images Use CDN/WebP ✓
- Hero images use CloudFront CDN with WebP format
- Good practice

### PERF-003: No Server-Side Caching [MEDIUM]
- Only Cache-Control: no-cache on SSE stream (correct)
- No caching on static API responses (products, system info)
- **Fix**: Add Cache-Control headers for static/semi-static responses

### PERF-004: Large node_modules (724MB) [LOW]
- Expected for a full-stack app with Stripe, Drizzle, tRPC, etc.
- Not actionable without removing features

### PERF-005: 35,797 Lines of Code [INFO]
- Substantial codebase with 106 React components
- Well-organized with lazy loading

---

## Items to Fix (Priority Order)

1. **INFRA-002**: Add auth to file upload endpoint
2. **INFRA-003**: Add auth guard to SSE stream endpoint
3. **INFRA-001**: Add rate limiting
4. **SEC-004**: Add security headers (helmet)
5. **SEC-001**: Address CSRF concerns
6. **SEC-003**: Validate OAuth redirect URIs
7. **PERF-003**: Add caching headers for static responses

---

## UX Findings

### UX-001: Strong Foundation ✓
The platform has 49 responsive breakpoint usages, 124 accessibility attributes, 194 loading state references, 344 error handling references, 38 empty state references, 88 focus management references, and 161 toast notifications. This is a well-built UI.

### UX-002: Responsive Design Could Be Deeper [LOW]
49 breakpoint usages across 106 components means some pages may not be fully responsive. The home page and task view are the most critical.

---

## Business Logic Findings

### BIZ-001: Comprehensive Feature Set ✓
126 tRPC procedures covering: tasks, memory, scheduling, sharing, teams, connectors, artifacts, projects, payments, notifications. This is a mature platform.

### BIZ-002: Task Lifecycle Well-Defined ✓
Four states: idle → running → completed/error. Clean state machine.

### BIZ-003: 67 Eval Capabilities with 74 Results ✓
Comprehensive evaluation framework for testing agent capabilities.

---

## DX Findings

### DX-001: Strong Test Suite ✓
14 test files with 247 test cases. All passing.

### DX-002: TypeScript Strict Mode ✓
strict: true in tsconfig.json. Good practice.

### DX-003: Prettier Configured ✓
.prettierrc and .prettierignore present.

### DX-004: Missing ESLint [LOW]
No .eslintrc file found. Prettier handles formatting but not code quality rules.

---

## Priority Fix List (Updated)

1. **INFRA-002**: Add auth to file upload endpoint [HIGH]
2. **INFRA-003**: Add auth guard to SSE stream endpoint [HIGH]
3. **INFRA-001**: Add rate limiting [HIGH]
4. **SEC-004**: Add security headers (helmet) [MEDIUM]
5. **SEC-001**: Address CSRF concerns [MEDIUM]
6. **SEC-003**: Validate OAuth redirect URIs [MEDIUM]
7. **PERF-003**: Add caching headers [LOW]
