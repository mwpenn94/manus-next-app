# Manus Next — Security Posture Assessment

**Date:** 2026-04-22 | **Version:** 2.0

---

## Authentication and Authorization

### Authentication Flow

The platform uses Manus OAuth with JWT session cookies:

1. Client redirects to `VITE_OAUTH_PORTAL_URL` with encoded state (origin + return path)
2. User authenticates via Manus SSO
3. Callback at `/api/oauth/callback` exchanges code for user profile
4. Server creates JWT session cookie (httpOnly, secure, SameSite=Lax)
5. All subsequent requests carry the cookie; `context.ts` extracts `ctx.user`

**Strengths:** httpOnly cookies prevent XSS token theft. SameSite=Lax prevents CSRF. JWT signing uses a platform-provided secret.

### Authorization Model

| Level | Implementation | Coverage |
|-------|---------------|----------|
| Route-level | `protectedProcedure` middleware | All sensitive tRPC procedures |
| Resource-level | `WHERE userId = ctx.user.id` | All database queries |
| Role-level | `ctx.user.role === 'admin'` | Admin-only procedures |
| Public access | `publicProcedure` | Health, analytics, shared tasks |

---

## Known Vulnerabilities

### V-001: WebSocket Endpoints Lack Session Authentication (High)

**Affected:** `/ws/device`, `/ws/voice`, `/api/analytics/ws`

**Description:** WebSocket connections authenticate via URL parameters rather than session cookies. An attacker who obtains a session ID could hijack a voice or device connection.

**Remediation:** Validate JWT session cookie during WebSocket upgrade handshake.

### V-002: Predictable S3 File Keys (Medium)

**Affected:** `storagePut()` calls for webapp publishing and file uploads

**Description:** S3 keys follow `{userId}-webapp/{buildId}.html` with sequential IDs enabling enumeration.

**Remediation:** Append random UUID suffix to all S3 keys.

### V-003: Custom Domain Input Lacks Format Validation (Medium)

**Affected:** `webappProject.update` procedure, custom domain field

**Remediation:** Add Zod regex validation for valid domain format.

### V-004: GitHub Access Tokens Stored in Plaintext (High)

**Affected:** `github_repos` table, `accessToken` column

**Remediation:** Encrypt tokens at rest using AES-256-GCM.

### V-005: No Content Safety Filter on LLM Output (Medium)

**Affected:** Webapp builder, agent chat, document generation

**Remediation:** Add content safety classifier before publishing.

---

## Security Headers (via Helmet)

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| Strict-Transport-Security | max-age=15552000 | Force HTTPS |
| Referrer-Policy | no-referrer | Prevent referrer leakage |

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/stream` | 20 req | 1 min |
| `/api/upload` | 30 req | 1 min |
| `/api/tts` | 60 req | 1 min |
| `/api/trpc` | 600 req | 1 min |

**Gap:** Analytics collect endpoint has no rate limit.

---

## Recommendations (Priority Order)

| Priority | Item | Effort |
|----------|------|--------|
| Critical | V-004: Encrypt GitHub tokens | 4h |
| High | V-001: Cookie auth on WebSocket | 4h |
| High | Rate limit analytics endpoint | 1h |
| Medium | V-002: Random S3 key suffix | 2h |
| Medium | V-003: Domain format validation | 1h |
| Medium | V-005: Content safety filter | 8h |
| Low | Strict CSP for app shell | 4h |

---

*End of Security Posture Assessment v2.0*
