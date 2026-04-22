# Tried and Failed

**Purpose:** Document approaches, techniques, and implementations that were attempted but did not succeed, to prevent future regressions and inform decision-making.

**Created:** 2026-04-22
**Last Updated:** 2026-04-22

---

## 1. Simulated Model Downloads for Client Inference

**What was tried:** Fake progress bars using `setInterval` to simulate downloading Chatterbox, Whisper, and SmolLM2 models. Progress incremented randomly until 100%, then status was set to "ready" — but no actual model was loaded.

**Why it failed:** Users would see "ready" status but the models couldn't actually perform inference. Voice cloning fell back to server-side TTS with a different voice, which was dishonest about what was happening. The simulation created a false sense of capability.

**Resolution:** Replaced with honest status tracking. Models that aren't yet integrated show "pending" with a clear message about what's operational (Kokoro TTS) and what requires additional Transformers.js wiring. WebGPU availability is checked before allowing download attempts.

**Lesson:** Never simulate capability that doesn't exist. Users prefer honest "not yet available" over fake "ready."

---

## 2. Clerk Auth Provider Stubs

**What was tried:** A full `ClerkAuthProvider` class with commented-out implementation plans, warning logs, and null returns from `getUserFromRequest()` and `verifyToken()`. The factory pattern allowed selecting Clerk via `AUTH_PROVIDER=clerk` env var.

**Why it failed:** Setting `AUTH_PROVIDER=clerk` would silently break authentication — all users would get null from auth checks, effectively locking everyone out. The stubs gave the appearance of multi-provider support without any actual functionality.

**Resolution:** Removed the Clerk provider entirely. The auth adapter now only registers providers that are actually implemented (Manus OAuth). Future provider support is documented as a migration path with clear prerequisites (install package, set env vars, implement provider).

**Lesson:** Stub implementations of security-critical features are dangerous. Either implement fully or don't register.

---

## 3. Hardcoded Feature Checks in Runtime Validator

**What was tried:** `runFeatureChecks()` returned a static array of 22 feature names, all marked as `status: "active"` with the current timestamp. No actual verification was performed.

**Why it failed:** The /_validate endpoint would always report all features as active, even if their backing services were down or their tRPC routers weren't registered. This made the health check useless for actual monitoring.

**Resolution:** Replaced with two verification strategies: (1) route-check — dynamically imports the tRPC router and checks if procedures matching each feature's router key exist, and (2) config-check — verifies that required environment variables and service configurations are present. Each check now reports its verification method.

**Lesson:** Health checks that always return "healthy" are worse than no health checks — they create false confidence.

---

## 4. YAML Capability Shell Files

**What was tried (Sessions 1-3):** Creating YAML files for each of 72 capabilities with structured metadata (status, evidence, dimensions). Multiple iterations attempted different schemas and scoring approaches.

**Why it failed:** The YAML files became a maintenance burden. They duplicated information already in the judge scoring system, the per-cap-notes, and the PER_ASPECT_SCORECARD. Keeping them synchronized required manual updates that frequently went stale.

**Resolution (Session 4):** Consolidated all capability scoring into the judge.mjs automated system and PER_ASPECT_SCORECARD.md. YAML shells were enhanced to 8 criteria for the final judge run but are now treated as judge input artifacts, not standalone documentation.

**Lesson:** Avoid creating parallel tracking systems for the same data. One source of truth, referenced everywhere.

---

## 5. 60/72 Stale Reference Cascade

**What was tried:** After judge v3 achieved 60/72 passing, multiple artifacts were updated with this count. When judge v9 later achieved 72/72, many artifacts still referenced the old 60/72 count.

**Why it failed:** Manual find-and-replace across 308 documentation artifacts is error-prone. Some references were in historical log entries (acceptable), but others were in current-status sections (stale).

**Resolution:** Implemented a systematic stale-reference sweep as part of each convergence pass. Historical references in log entries are marked as acceptable; current-status references are updated. The convergence pass now explicitly checks key artifacts for stale counts.

**Lesson:** When a key metric changes, immediately grep all documentation for the old value and update current-status references.

---

## 6. Single-Pass Convergence Declarations

**What was tried (16+ times):** Declaring convergence after a single clean pass, or after fixing issues and immediately declaring the fix-pass as clean.

**Why it failed:** The v9 prompt explicitly requires 3 consecutive zero-finding passes. A fix-pass resets the counter to 0/3. Premature convergence declarations were caught by subsequent adversarial passes that found new issues.

**Resolution:** Strict adherence to the 3/3 rule. Any pass with findings resets the counter. The convergence log tracks the counter explicitly. The GATE_A_TRUE_FINAL_REPORT includes a humility note acknowledging the 16+ premature declarations.

**Lesson:** Convergence is a property of the system, not a declaration. Three clean passes from different angles (comprehensive, novel, final) provide genuine confidence.

---

## 7. ComputerUsePage as "Simulated Desktop"

**What was tried:** The page header described itself as a "Simulated Desktop Environment," implying the desktop was fake.

**Why it failed:** The desktop environment is actually agent-powered — terminal commands are executed via the /api/stream endpoint, which routes to real agent execution. Calling it "simulated" undersold the actual capability.

**Resolution:** Renamed to "Agent-Powered Desktop Environment" to accurately describe the real functionality: window management is client-side UI, but terminal execution, file operations, and screenshot capture are all agent-driven through the streaming API.

**Lesson:** Accurate naming matters. Don't undersell real capabilities or oversell fake ones.
