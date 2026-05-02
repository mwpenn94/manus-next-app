# Landscape Pass Triage — Session 25

## Summary
- 16 AOV chunks scanned, 103 total findings
- Critical: 3, High: 23, Medium: 40, Low: 34

## Triage: CRITICAL + HIGH findings requiring verification

### CRITICAL (3)
1. **Data & Research L25**: In-memory `researchCache` has no eviction policy → memory leak
2. **Auth & Billing L261**: Missing `teamIds` in `deleteAllData` → runtime crash
3. **Data & Research (implied)**: One more critical in counts

### HIGH — Security (11)
1. Core AI L535: `any` cast bypassing type safety in DB function
2. Core AI L1053: Task prompts concatenating user descriptions → prompt injection
3. Agent Tools L254: XSS in `fetchPageContent` HTML tag stripping
4. Agent Tools L1686: SSRF in `executeScreenshotVerify` with user-provided URL
5. Agent Tools L210: Command injection in `buildWebappProject` via `execSync`
6. Agent Tools L816: Command injection in `executeInstallDeps` with package names
7. GitHub L33: Webhook secret can be empty string → disables signature validation
8. Auth & Billing L426: `addCredits` allows any user to add credits to any team
9. Frontend L58: `window.open('_blank')` without `rel="noopener noreferrer"`
10. Frontend L613: Code injection in `evaluateMut` selector
11. Schema L786: `webappProjects.envVars` stores secrets in DB plaintext

### HIGH — Bugs (5)
1. Agent L621: Unsafe `JSON.stringify` on circular references
2. GitHub L1052: Unfinished line of code → syntax error
3. Data & Research L88: Unsafe `JSON.parse` on LLM output
4. Data & Research L213: Incorrect stddev calculation → division by zero
5. Schema L184: `memoryEntries.lastAccessedAt` never updated on access

### HIGH — Performance (3)
1. Components L1120: Inefficient state update for events array
2. Components L1704: State update for tasks array on every message
3. Components L2106: Inefficient state update for messages array

### HIGH — Other (1)
1. Frontend L1730: `generateImage` mutation not awaited → race condition

## Triage Decision
Many of these are likely false positives from workers reading concatenated files without full project context. Need to verify each HIGH+ finding against actual source code before fixing.
