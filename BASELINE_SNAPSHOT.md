# BASELINE SNAPSHOT — Cycle 1 (v1.1 4-Axis Rubric)

Generated: 2026-04-25T23:45:00Z
Rubric: §5 FOUR-AXIS SCORING (CONJUNCTIVE FLOOR)
Profile: balanced (all axes target 8.5)
Note: Cycle 11's 8.1–8.5 used a 10-dimension internal rubric. Per §1 GATE A.5, those scores are NOT transcribed. Each axis is re-derived from first principles below.

## AXIS A — Manus Parity (Feature Surface)

Scoring against 67 oracle capabilities with weights: Core task execution 30%, Home/discovery 15%, Navigation 10%, Agent tools breadth 15%, Output quality 15%, Reliability/recovery 10%, Mobile/PWA 5%.

| Sub-component | Score | Evidence |
|---|---|---|
| Core task execution | 7.5 | Streaming chat works with markdown rendering, tool execution, progress indicators. Missing: latency-to-first-token telemetry, tool selection accuracy metrics, recovery rate measurement. No VU-derived data yet. |
| Home/discovery | 7.0 | Warm Void home with suggestion cards, category tabs, keyboard shortcuts. Missing: personalized recommendations, recent task quick-resume, Wide Research entry point. |
| Navigation | 7.5 | Sidebar with task list, project grouping, collapsible. Missing: breadcrumb trails, cross-task search, command palette for task switching. |
| Agent tools breadth | 6.5 | Browser automation, document generation, voice TTS, QA testing, branching. Missing vs oracle: Wide Research, Mail Manus, Scheduled Tasks UI, Design View, Meeting Mode, My Computer, Slack/Telegram integration, AI Slides, Skills marketplace. |
| Output quality | 7.5 | Document generation high fidelity, inline preview, code execution. Missing: image generation quality comparison, slide output quality, multi-format export parity. |
| Reliability/recovery | 7.0 | Error handling exists, retry logic. Missing: sandbox recovery, mid-task checkpoint/resume, graceful degradation under load. |
| Mobile/PWA | 5.0 | Responsive layout exists but no PWA manifest, no offline capability, no mobile-specific gestures. |
| **Weighted AXIS A** | **7.0** | Weighted: 7.5×0.30 + 7.0×0.15 + 7.5×0.10 + 6.5×0.15 + 7.5×0.15 + 7.0×0.10 + 5.0×0.05 = 7.075 |

## AXIS B — Engineering Quality (MIN of 9 sub-stages)

| Sub-stage | Score | Evidence |
|---|---|---|
| B1 Design system | 7.5 | Consistent token usage, shadcn/ui components, Tailwind theming. No visual regression testing wired. |
| B2 Dev velocity | 7.0 | HMR working, TypeScript clean (0 errors). No CI pipeline, no PR cycle time measurement. |
| B3 CI/test rigor | 6.5 | 303 tests passing, vitest configured. No line/branch coverage measurement, no flake rate tracking. |
| B4 Deployment automation | 6.0 | Manus checkpoint/publish flow. No blue-green/canary, no automated rollback, no secret rotation. |
| B5 Observability | 5.5 | .manus-logs directory with devserver/browser/network logs. No structured logging, no OTel, no metrics dashboard, no SLO alerting. |
| B6 Billing/payments | 6.5 | Stripe integration configured (test mode), checkout sessions, webhook handler. Missing: refund flow, dunning, tier upgrade/downgrade. |
| B7 Growth/onboarding | 5.5 | Home page with suggestions. No first-run wizard, no time-to-first-value tracking, no activation metrics. |
| B8 Support/feedback | 5.0 | No help docs, no in-app feedback widget, no response runbook, no satisfaction tracking. |
| B9 Security/compliance | 6.5 | OAuth auth, role-based access, session management. Missing: rate limiting, GDPR export, AI Act compliance, jurisdiction enumeration. |
| **AXIS B (MIN)** | **5.0** | Bottleneck: B8 Support/feedback |

## AXIS C — Reasoning Quality (MIN of 6 dimensions)

Note: No reasoning probes have been executed yet. Scoring from code inspection and architectural review only.

| Dimension | Score | Evidence |
|---|---|---|
| C1 Task understanding | 6.5 | LLM integration with structured responses, context passing. No probe validation. |
| C2 Planning quality | 6.0 | Task decomposition in agent flow. No multi-step planning verification. |
| C3 Tool grounding | 6.5 | Browser automation, document generation, voice TTS tools wired. No grounding accuracy measurement. |
| C4 Self-reflection | 5.5 | Basic error handling. No self-correction loops, no confidence calibration. |
| C5 Error recovery | 6.0 | Retry logic, error states in UI. No fault-injection testing. |
| C6 Long-horizon coherence | 5.5 | Branching system exists. No long-horizon task completion verification. |
| **AXIS C (MIN)** | **5.5** | Bottleneck: C4 Self-reflection, C6 Long-horizon coherence |

## AXIS D — Orchestration Quality (MIN of 6 dimensions)

Note: No orchestration stress scenarios have been executed yet. Scoring from code inspection only.

| Dimension | Score | Evidence |
|---|---|---|
| D1 Tool selection accuracy | 6.0 | Tools available but no selection accuracy measurement. |
| D2 Sequencing depth | 6.0 | Multi-step task flows exist. No sequencing depth verification. |
| D3 Parallel execution | 5.0 | No parallel execution capability demonstrated. |
| D4 Mid-task replanning | 5.5 | Branching exists but no dynamic replanning. |
| D5 Follow-up handling | 6.0 | Conversation continuity in chat. No follow-up quality measurement. |
| D6 Branching/continuation | 6.5 | Branch tree, compare, CRUD all functional. |
| **AXIS D (MIN)** | **5.0** | Bottleneck: D3 Parallel execution |

## CONJUNCTIVE OVERALL

| Axis | Score | Target | Gap |
|---|---|---|---|
| A — Manus Parity | 7.0 | 8.5 | -1.5 |
| B — Engineering Quality | 5.0 | 8.5 | -3.5 |
| C — Reasoning Quality | 5.5 | 8.5 | -3.0 |
| D — Orchestration Quality | 5.0 | 8.5 | -3.5 |
| **Overall (MIN)** | **5.0** | **8.5** | **-3.5** |

## Stretch Target
Second-lowest axis: C (5.5). Internal stretch: raise C to 6.5 before next cycle.

## Telemetry Status
`baseline_partial: telemetry_unavailable` — no sentinel-baseline.json found. Trigger 4 inactive.

## Self-Grading Bias Check
Scores derived from code inspection and architectural review, not from running against Manus oracle. Self-grading penalty not applicable at baseline (no comparative scoring performed). Will apply -0.5 penalty on any dimension where our score exceeds Manus's in future passes.
