# Adversarial Testing Audit — Session 9

## Methodology

This audit applies adversarial thinking across 18 attack vectors: SQL injection, XSS, race conditions, rate limiting abuse, CSRF, prototype pollution, unhandled rejections, path traversal, CORS misconfiguration, SSRF, information leakage, missing auth, file name injection, pagination abuse, webhook forgery, error amplification, concurrent mutation conflicts, and broken network scenarios.

---

## Findings

### ADV-01: File Name Injection in Upload Endpoint (MEDIUM)

**Location**: `server/_core/index.ts:513-515`
**Issue**: The `x-file-name` header is used directly in the S3 key without sanitization. A malicious user could inject path separators (`../`) or special characters into the file name.
**Current Code**:
```ts
const fileName = (req.headers["x-file-name"] as string) || `upload-${Date.now()}`;
const fileKey = `task-files/${taskId}/${Date.now()}-${fileName}`;
```
**Risk**: While S3 treats `/` as a literal character in keys (not a directory separator), the unsanitized file name could cause issues in downstream processing or URL generation.
**Fix**: Sanitize the file name by stripping path separators and limiting length.

### ADV-02: Tunnel URL SSRF Risk in Device Execute (MEDIUM)

**Location**: `server/routers.ts` — `device.execute` procedure
**Issue**: The `tunnelUrl` field accepts any string with `z.string().min(1)`. When the server makes a `fetch()` call to `${device.tunnelUrl}/api/execute`, a malicious user could set `tunnelUrl` to an internal IP (e.g., `http://169.254.169.254/latest/meta-data/`) to perform SSRF.
**Mitigation**: The tunnel URL is only set by the device owner (auth-gated), reducing the attack surface. However, URL validation should be added.
**Fix**: Add URL format validation to `tunnelUrl` input schema.

### ADV-03: No Database Transactions for Multi-Table Operations (LOW)

**Location**: `server/routers.ts` — GDPR `deleteAllData`, `exportData`
**Issue**: The GDPR deletion cascades across 35 tables without a database transaction. If the server crashes mid-deletion, the user's data could be partially deleted, leaving orphaned records.
**Mitigation**: This is a rare edge case and the deletion order is designed to handle dependencies correctly. However, wrapping in a transaction would be more robust.
**Note**: Drizzle ORM supports transactions via `db.transaction()`. This is a LOW priority improvement.

### ADV-04: Missing try/catch in Some tRPC Procedures (LOW)

**Location**: `server/routers.ts` — 192 procedures, only 32 try/catch blocks
**Issue**: Many procedures rely on tRPC's built-in error handling (which catches and returns 500 for unhandled errors). While this works, explicit try/catch with meaningful error messages would improve debugging.
**Mitigation**: tRPC's error middleware catches all unhandled errors and returns appropriate HTTP status codes. The risk is poor error messages, not crashes.

### ADV-05: Analytics CORS Allows Any Origin (LOW)

**Location**: `server/_core/index.ts:374`
**Issue**: The analytics endpoint sets `Access-Control-Allow-Origin: *`, allowing any website to send analytics data. This could be abused to pollute analytics with fake page views.
**Mitigation**: Rate limiting (60/min/IP) is in place. The analytics endpoint is designed for cross-origin use (embedded widgets). The risk is data pollution, not security breach.

---

## Verified Secure Patterns

| Vector | Status | Evidence |
|--------|--------|----------|
| **SQL Injection** | SECURE | Drizzle ORM uses parameterized queries exclusively. No raw SQL with user input. |
| **XSS** | SECURE | Only 1 `dangerouslySetInnerHTML` in chart.tsx (static CSS, no user input). React auto-escapes all other output. |
| **Rate Limiting** | SECURE | 5 rate limiters covering stream (20/min), upload (30/min), API (600/min), TTS (60/min), analytics (60/min). |
| **CSRF** | SECURE | Cookie uses `sameSite: "none"` with `secure: true`. tRPC mutations require auth cookie. Stripe webhook uses signature verification. |
| **Auth on Sensitive Endpoints** | SECURE | Only 4 public procedures (auth.me, auth.logout, share.view, billing.products). All data-modifying procedures use `protectedProcedure`. |
| **Pagination** | SECURE | All list queries have `.limit()` clauses (50-1000 range). No unbounded result sets. |
| **Webhook Security** | SECURE | Stripe webhook verifies signature via `constructEvent()`. Test events return `{verified: true}`. |
| **CSP Headers** | SECURE | Helmet with strict CSP in production. Script/style/img/font/connect sources properly scoped. |
| **Prototype Pollution** | SECURE | JSON.parse results are used as data, not spread into objects with prototype access. |
| **Error Info Leakage** | SECURE | Only 1 instance of `err.message` in user-facing error (deploy). All other errors use generic messages. |
| **Upload Size Limits** | SECURE | 100MB for video, 50MB for other files. Enforced server-side before S3 upload. |

---

## Summary

| Severity | Count | Findings |
|----------|-------|----------|
| HIGH | 0 | — |
| MEDIUM | 2 | ADV-01 (file name injection), ADV-02 (tunnel URL SSRF) |
| LOW | 3 | ADV-03 (no transactions), ADV-04 (missing try/catch), ADV-05 (analytics CORS) |

**Overall Security Posture: Strong.** The application has comprehensive rate limiting, proper auth gating, parameterized queries, CSP headers, and webhook signature verification. The 2 MEDIUM findings (file name sanitization and tunnel URL validation) are the only actionable items.
