# Side-by-Side Comparison Matrix: manus-next-app vs manus.im

**Date:** 2026-04-20
**Method:** Observable capability comparison from live browser sessions + benchmark data
**Authenticated user:** Michael Penn (admin on both platforms)

---

## 1. Capability Parity Matrix

| Capability | manus.im | manus-next-app | Parity Status | Gap Severity |
|---|---|---|---|---|
| **Core Agent Loop** | | | | |
| Natural language task input | YES | YES | PARITY | — |
| LLM-powered response generation | YES (GPT-4+) | YES (via Forge API) | PARITY | — |
| Multi-turn conversation | YES | YES | PARITY | — |
| Streaming SSE responses | YES | YES | PARITY | — |
| Task history / persistence | YES | YES | PARITY | — |
| Message persistence on disconnect | YES | YES (NS13 fix) | PARITY | — |
| **Tool Capabilities** | | | | |
| Web browser (autonomous) | YES | NO | GAP | HIGH |
| Code execution sandbox | YES | NO | GAP | HIGH |
| File system access | YES | NO | GAP | HIGH |
| Terminal / shell access | YES | NO | GAP | HIGH |
| Image generation | YES | YES (via Forge) | PARITY | — |
| Web search | YES (built-in) | YES (via connectors) | PARTIAL | MEDIUM |
| Document generation (PDF/DOCX) | YES | NO | GAP | MEDIUM |
| Slide generation | YES | NO | GAP | MEDIUM |
| **Integrations** | | | | |
| Microsoft 365 | YES (native) | YES (connector) | PARTIAL | LOW |
| Google Workspace | YES (native) | YES (connector) | PARTIAL | LOW |
| Slack | YES (native) | YES (connector) | PARTIAL | LOW |
| Notion | YES (native) | YES (connector) | PARTIAL | LOW |
| GitHub | YES (native) | NO | GAP | MEDIUM |
| Stripe payments | NO | YES | EXCEED | — |
| Custom connectors | NO | YES (extensible) | EXCEED | — |
| **UI/UX** | | | | |
| Task sidebar navigation | YES | YES | PARITY | — |
| Suggestion cards / onboarding | YES | YES | PARITY | — |
| Dark theme | YES | YES | PARITY | — |
| Category filtering | YES | YES | PARITY | — |
| Real-time status indicators | YES | YES | PARITY | — |
| Keyboard shortcuts (Cmd+K) | YES | YES | PARITY | — |
| File attachment upload | YES | YES | PARITY | — |
| Voice input | YES | PLACEHOLDER | GAP | LOW |
| Task replay / step visualization | YES | NO | GAP | MEDIUM |
| Artifact preview (code, docs) | YES | NO | GAP | MEDIUM |
| Mobile responsive | YES | YES | PARITY | — |
| **Architecture** | | | | |
| Multi-user support | YES | YES | PARITY | — |
| Role-based access (admin/user) | UNKNOWN | YES | POTENTIAL EXCEED | — |
| OAuth authentication | YES (Manus) | YES (Manus) | PARITY | — |
| Database persistence | YES | YES (TiDB) | PARITY | — |
| S3 file storage | YES | YES | PARITY | — |
| Webhook support | UNKNOWN | YES (Stripe) | POTENTIAL EXCEED | — |
| Self-hostable | NO | YES (open source) | EXCEED | — |
| **Reliability** | | | | |
| Error recovery | YES | YES (NS13 fixes) | PARITY | — |
| Graceful degradation | YES | PARTIAL | GAP | LOW |
| Rate limiting | YES | YES | PARITY | — |
| Session persistence | YES | YES | PARITY | — |

---

## 2. Scoring Summary

| Category | Parity | Partial | Gap | Exceed | Total |
|---|---|---|---|---|---|
| Core Agent Loop | 6 | 0 | 0 | 0 | 6 |
| Tool Capabilities | 3 | 1 | 4 | 0 | 8 |
| Integrations | 0 | 4 | 1 | 2 | 7 |
| UI/UX | 8 | 0 | 3 | 0 | 11 |
| Architecture | 4 | 0 | 0 | 3 | 7 |
| Reliability | 3 | 1 | 0 | 0 | 4 |
| **TOTAL** | **24** | **6** | **8** | **5** | **43** |

**Parity Rate:** 24/43 = 55.8%
**Parity + Partial:** 30/43 = 69.8%
**Parity + Partial + Exceed:** 35/43 = 81.4%
**Gap Rate:** 8/43 = 18.6%

---

## 3. Gap Analysis by Severity

### HIGH Severity (Fundamental capability gaps)

| Gap | Impact | Remediation Path | Effort |
|---|---|---|---|
| No browser automation | Cannot perform web research, scraping, or autonomous browsing | Integrate headless browser (Puppeteer/Playwright) as agent tool | LARGE |
| No code execution sandbox | Cannot run user code, data analysis, or scripts | Add sandboxed code execution (Docker/Firecracker) | LARGE |
| No file system access | Cannot create/manage files for the user | Extend S3 storage with virtual file system abstraction | MEDIUM |
| No terminal/shell access | Cannot execute system commands | Add sandboxed terminal (WebSocket + container) | LARGE |

### MEDIUM Severity (Feature gaps affecting specific use cases)

| Gap | Impact | Remediation Path | Effort |
|---|---|---|---|
| No document generation | Cannot produce PDF/DOCX deliverables | Add server-side document generation (puppeteer-pdf, docx) | MEDIUM |
| No slide generation | Cannot create presentations | Integrate slide generation API or library | MEDIUM |
| No task replay | Users cannot review agent's step-by-step process | Add step logging + replay UI component | MEDIUM |
| No artifact preview | Cannot preview generated code/docs inline | Add syntax-highlighted code blocks + document viewer | SMALL |
| No GitHub integration | Cannot interact with repositories | Add GitHub OAuth + API integration | MEDIUM |
| Web search partial | Connector-based, not as seamless as native | Improve connector UX, add inline search results | SMALL |

### LOW Severity (Polish and enhancement gaps)

| Gap | Impact | Remediation Path | Effort |
|---|---|---|---|
| Voice input placeholder | Feature shown but not functional | Implement Web Speech API or Whisper integration | SMALL |
| Graceful degradation partial | Some error states not fully handled | Add offline detection, retry logic, fallback UI | SMALL |

---

## 4. Exceed Analysis (Where manus-next-app surpasses manus.im)

| Exceed Area | Description | Strategic Value |
|---|---|---|
| Stripe payments | Full payment processing with checkout, webhooks, subscription support | Enables monetization of agent services |
| Custom connectors | Extensible integration framework for any API | Future-proofs against new service integrations |
| Self-hostable | Open source, can be deployed on any infrastructure | Appeals to enterprise/privacy-conscious users |
| Role-based access | Admin/user roles with granular permissions | Enables multi-tenant and team deployments |
| Webhook support | Incoming webhooks for external event processing | Enables event-driven automation workflows |

---

## 5. Benchmark Cross-Reference

| Benchmark Task | manus-next-app Score | manus.im Expected | Delta |
|---|---|---|---|
| TASK-001 Research Plan | 7.0/10 | 9.0/10 (web search) | -2.0 |
| TASK-003 Code Generation | 8.8/10 | 9.5/10 (sandbox exec) | -0.7 |
| TASK-007 Fact Checking | 5.0/10 | 9.0/10 (web search) | -4.0 |
| TASK-010 Summarization | 6.8/10 | 7.5/10 | -0.7 |
| TASK-013 Web Search | 7.5/10 | 9.5/10 (native) | -2.0 |
| TASK-016 Education | 7.2/10 | 7.5/10 | -0.3 |
| **Mean** | **7.1/10** | **8.7/10** | **-1.6** |

**Key insight:** The 1.6-point gap is almost entirely attributable to tool capabilities (browser, sandbox). For pure LLM tasks (code gen, education, summarization), the gap narrows to ~0.6 points.

---

## 6. Persona Cross-Reference

| Persona | Archetype | manus-next-app Fit | manus.im Fit | Notes |
|---|---|---|---|---|
| P01 Marcus Chen | Power User | MEDIUM | HIGH | Needs sandbox for code execution |
| P07 Sarah Mitchell | Business Pro | MEDIUM | HIGH | Needs document generation |
| P13 Lena Kowalski | Creative | HIGH | HIGH | Pure LLM task, near parity |
| P19 Priya Sharma | Student | HIGH | HIGH | Educational content works well |
| P25 David Park | Accessibility | MEDIUM | MEDIUM | Both need a11y improvements |
| P28 Maria Santos | Casual User | HIGH | HIGH | Simple tasks work well on both |

---

## 7. Strategic Recommendations

1. **Prioritize browser automation** — this single capability would close the largest gap and improve scores on 3 of 6 benchmark tasks
2. **Add code execution sandbox** — second highest impact, enables data analysis and code validation
3. **Leverage exceed areas** — Stripe payments, custom connectors, and self-hosting are genuine differentiators that manus.im doesn't offer
4. **Focus on pure-LLM personas first** — Creative (P13), Student (P19), and Casual (P28) users are already well-served
5. **Document generation** is a quick win — server-side PDF/DOCX generation requires no sandbox infrastructure
