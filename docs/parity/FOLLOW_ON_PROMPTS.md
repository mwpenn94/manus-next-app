# Follow-On Prompts

**Purpose:** Per recursive optimization prompt rule 6, these are explicitly written follow-on prompts for areas where dedicated work would yield materially better results than inline optimization.

**Created:** 2026-04-22
**Last Updated:** 2026-04-22

---

## Prompt 1: Production Load Testing (Route to: Execution Agent)

**Tool:** Manus or Claude Code
**Prerequisite:** Application deployed to production domain

```
You are testing a deployed web application at [PRODUCTION_URL]. The application is a Manus-parity AI agent interface with 72 capabilities.

Execute the following load testing sequence:
1. Run Lighthouse CI against the production URL. Target: Performance ≥90, Accessibility ≥90, Best Practices ≥90, SEO ≥90.
2. Use k6 or Artillery to simulate 50 concurrent users performing these flows:
   - Homepage load → login → create task → send message → receive streaming response
   - File upload (1MB PDF) → agent processing → artifact download
   - Settings page → toggle 3 capabilities → save
3. Measure and report: P50/P95/P99 latency, error rate, throughput (req/s), WebSocket connection stability.
4. Run axe-core accessibility audit on all 15 primary routes.
5. Generate a comprehensive report with pass/fail per metric and recommendations.

Save results to docs/load-testing/PRODUCTION_LOAD_REPORT.md.
```

---

## Prompt 2: Real Manus Baseline Capture (Route to: Research Agent + Execution Agent)

**Tool:** Gemini Deep Research → Manus
**Sequence:** Research first, then execution

**Step 1 — Research (Gemini Deep Research):**
```
Research the current capabilities of Manus AI (manus.im) as of April 2026. For each of these 72 capabilities, document:
1. Whether Manus supports it (yes/no/partial)
2. Quality level (basic/intermediate/advanced/best-in-class)
3. Any known limitations or user-reported issues
4. Pricing tier required (free/pro/enterprise)

Capabilities to research: [list all 72 from MANUS_CANONICAL_CAPABILITIES.md]

Cite all sources. Focus on official documentation, user reviews, and technical blog posts.
```

**Step 2 — Execution (Manus):**
```
Using the research report from Step 1, log into Manus Pro and execute each of the 72 benchmark tasks from docs/manus-study/benchmarks/TASK_CATALOG.md. For each task:
1. Record the exact prompt used
2. Capture the full response (text + any artifacts)
3. Measure response time
4. Rate quality on the 7-dimension rubric from PER_ASPECT_SCORECARD.md
5. Save screenshots of key interactions

Store results in docs/manus-study/baselines/MANUS_PRO_BASELINE_2026Q2.md.
```

---

## Prompt 3: Stripe Production Readiness Audit (Route to: Execution Agent)

**Tool:** Claude Code or Manus
**Prerequisite:** Stripe sandbox claimed, test payments verified

```
Audit the Stripe integration in this web application for production readiness:

1. Verify webhook signature validation handles all edge cases:
   - Replay attacks (duplicate event IDs)
   - Clock skew (events with timestamps >5 minutes old)
   - Malformed payloads
2. Test all checkout flows with Stripe test cards:
   - 4242424242424242 (success)
   - 4000000000000002 (decline)
   - 4000000000009995 (insufficient funds)
   - 4000002500003155 (3D Secure required)
3. Verify idempotency: submit the same checkout session creation twice and confirm no duplicate charges.
4. Check that all Stripe customer IDs are properly linked to user accounts.
5. Verify subscription lifecycle: create → upgrade → downgrade → cancel → reactivate.
6. Generate a production readiness checklist with pass/fail for each item.

Save to docs/stripe/PRODUCTION_READINESS_AUDIT.md.
```

---

## Prompt 4: Accessibility Deep Audit (Route to: Execution Agent)

**Tool:** Manus
**Prerequisite:** Application running locally or deployed

```
Perform a comprehensive accessibility audit of this web application:

1. Run axe-core on every route (15 primary + 10 secondary routes).
2. Test keyboard navigation through all interactive flows:
   - Tab order through sidebar → main content → modals
   - Enter/Space activation of all buttons
   - Escape to close modals/dropdowns
   - Arrow keys in lists and menus
3. Test with screen reader (NVDA or VoiceOver simulation):
   - All images have meaningful alt text
   - All form inputs have labels
   - All dynamic content updates are announced
   - All error messages are associated with their inputs
4. Verify color contrast ratios meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text).
5. Test reduced motion preference (prefers-reduced-motion media query).
6. Generate an accessibility report with severity levels and remediation steps.

Save to docs/accessibility/DEEP_AUDIT_REPORT.md.
```

---

## Prompt 5: Client-Side Inference Model Integration (Route to: Execution Agent)

**Tool:** Claude Code or Cursor
**Prerequisite:** WebGPU-capable browser available for testing

```
Complete the client-side inference integration for the 3 pending models in ClientInferencePage.tsx:

1. **Whisper Tiny (WASM):** Integrate @xenova/transformers Whisper pipeline for offline speech-to-text.
   - Create useWhisperSTT hook mirroring useKokoroTTS pattern
   - Support audio recording → transcription → text output
   - Handle model download/cache with progress tracking

2. **Chatterbox Voice Clone:** Integrate real voice cloning via Transformers.js.
   - Create useChatterbox hook for zero-shot voice cloning
   - Accept 10-30s audio sample → generate cloned voice output
   - Fall back to server-side TTS if WebGPU unavailable

3. **SmolLM2 360M:** Integrate text generation via @xenova/transformers.
   - Create useSmolLM hook for local text completions
   - Support streaming token generation
   - Handle model download/cache with progress tracking

For each model:
- Follow the exact pattern established by useKokoroTTS.ts
- Add vitest tests verifying hook exports and model configuration
- Update ClientInferencePage to use real hooks instead of pending status

Save hooks to client/src/hooks/ and tests to server/.
```

---

## Prompt 6: AFK Extended Optimization Run (Route to: Execution Agent)

**Tool:** Manus (with AFK mode engaged)
**Prerequisite:** All Gate A criteria passing

```
Engage AFK mode per §8 of the v9 prompt. Execute the I→O→V loop autonomously:

Entry conditions:
- REPO_STATE_VERIFY: complete
- AFK_DECISIONS.md: exists with HRQ defaults
- AFK_BLOCKED.md: exists with owner-blocked items
- All tools functional

Execute ≥100 I→O→V cycles:
- I (Identify): Use web_search, browse_web, screenshot_verify to find gaps
- O (Optimize): Apply smallest-correct-blast-radius fixes
- V (Validate): Run tests, accessibility checks, performance benchmarks

Checkpoint every 30 minutes to AFK_PROGRESS.md.
Generate 2-hour summary reports.
Target: EXHAUSTIVE_CONVERGENCE (≥95% dimensional coverage).
```

---

## Re-Entry Triggers

These prompts should be re-executed when:
1. **Production deployment** occurs (Prompts 1, 3, 4)
2. **Manus flagship updates** are detected (Prompt 2)
3. **WebGPU browser support** improves (Prompt 5)
4. **Extended autonomous run** is requested (Prompt 6)
5. **New capabilities** are added to the application (all prompts)
