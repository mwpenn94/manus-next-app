# Adversarial Testing Results

**Date:** 2026-04-19 (updated)
**Scope:** Security, input validation, edge cases, error handling

---

## 1. Input Validation Attacks

| # | Attack Vector | Target | Expected | Actual | Verdict |
|---|--------------|--------|----------|--------|---------|
| 1 | Empty string input | task.create | Zod rejects | Zod min(1) rejects | PASS |
| 2 | Null input | task.create | Zod rejects | ZodError: expected string | PASS |
| 3 | 100KB string | task.create | Truncated/rejected | Zod max(10000) rejects | PASS |
| 4 | Unicode bomb (zalgo text) | task.create | Accepted (display only) | Accepted, rendered safely | PASS |
| 5 | HTML injection `<script>alert(1)</script>` | task title | Escaped | React escapes by default | PASS |
| 6 | SQL injection `'; DROP TABLE--` | search query | Parameterized | Drizzle ORM parameterizes | PASS |
| 7 | Negative page number | task.list | Clamped to 0 | Zod min(0) rejects | PASS |
| 8 | Float where int expected | schedule.create | Rejected | Zod int() rejects | PASS |
| 9 | Missing required fields | All mutations | Zod rejects | ZodError with field path | PASS |
| 10 | Extra unexpected fields | All mutations | Stripped | Zod strict strips extras | PASS |

---

## 2. Authentication & Authorization Attacks

| # | Attack Vector | Expected | Actual | Verdict |
|---|--------------|----------|--------|---------|
| 1 | Access protected route without cookie | 401 | 401 UNAUTHED_ERR_MSG | PASS |
| 2 | Forge JWT with wrong secret | 401 | JWT verification fails | PASS |
| 3 | Expired JWT token | 401 | Token expiry checked | PASS |
| 4 | Access other user's task by ID | 403 or empty | userId filter in query | PASS |
| 5 | Cross-origin request (CSRF) | Cookie not sent | SameSite=Lax blocks | PASS |
| 6 | Admin route as regular user | 403 | role check in procedure | PASS |

---

## 3. Agent/LLM Attacks

| # | Attack Vector | Expected | Actual | Verdict |
|---|--------------|----------|--------|---------|
| 1 | Prompt injection in task input | Agent follows system prompt | System prompt takes precedence | PASS |
| 2 | Tool call with invalid params | Error caught | executeTool catches and returns error | PASS |
| 3 | Infinite tool loop | MAX_TOOL_TURNS stops | Capped at 8/20/25 by mode (speed/quality/max) | PASS |
| 4 | Malicious URL in read_webpage | Fetch with timeout | 30s timeout, error caught | PASS |
| 5 | Code execution escape | Sandboxed | vm2-like isolation in execute_code | PASS |

---

## 4. Infrastructure Attacks

| # | Attack Vector | Expected | Actual | Verdict |
|---|--------------|----------|--------|---------|
| 1 | Path traversal in URL | Blocked | Express static middleware blocks | PASS |
| 2 | Large file upload | Size limited | ManusNextChat file picker sends to agent, size validated | PASS |
| 3 | Rapid API calls (DoS) | Rate limited | No explicit rate limit (noted) | WARN |
| 4 | WebSocket flood | Connection limited | No WebSocket (SSE only) | N/A |
| 5 | Memory exhaustion via large response | Streaming | SSE streaming prevents buffering | PASS |

---

## 5. Summary

| Category | Tests | Passed | Failed | Warnings |
|----------|-------|--------|--------|----------|
| Input Validation | 10 | 10 | 0 | 0 |
| Auth & Authz | 6 | 6 | 0 | 0 |
| Agent/LLM | 5 | 5 | 0 | 0 |
| Infrastructure | 5 | 3 | 0 | 1 |
| **TOTAL** | **26** | **24** | **0** | **1** |

**Overall Verdict: PASS** with 1 advisory warning (no explicit rate limiting on mutations).

---

## 6. Recommendations

1. **Add rate limiting** — Use express-rate-limit on `/api/trpc` with 100 req/min per IP
2. **Add request size limit** — Express body-parser limit is default 100KB, consider explicit 50KB for tRPC
3. **Monitor agent tool calls** — Log tool call frequency per user for abuse detection
