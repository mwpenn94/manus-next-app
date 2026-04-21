# PERSONA_CATALOG.md — §L.28 Virtual User Testing

**Generated:** 2026-04-21
**Minimum personas:** 30 (per §L.28 requirement)
**Coverage:** Multi-session, cross-surface, voice-primary, collaborative, localization

## Persona Schema

Each persona includes:
- `id`: Unique identifier (P-001 through P-030+)
- `name`: Descriptive persona name
- `age`: Age range
- `tech_literacy`: low / medium / high / expert
- `role`: Professional role or context
- `evidence_of_fit`: Why this persona exists in Mike's market
- `interaction_mode`: voice_primary / text_primary / hybrid
- `surfaces_used`: Which §L.23 surfaces they use
- `friction_tolerance`: How many speedbumps before frustration (1-10)
- `reasoning_preference`: verbose / concise / structured / hidden
- `language_primary`: ISO language code
- `accessibility_needs`: Any specific needs

## Persona Catalog

### Core Professional Personas (P-001 to P-010)

| ID | Name | Age | Tech | Role | Interaction | Language |
|----|------|-----|------|------|-------------|----------|
| P-001 | Financial Advisor Alex | 42 | high | Independent financial advisor | text_primary | en |
| P-002 | Marketing Manager Sarah | 35 | medium | SaaS marketing lead | hybrid | en |
| P-003 | Software Engineer Dev | 28 | expert | Full-stack developer | text_primary | en |
| P-004 | Executive Director James | 55 | medium | C-suite executive | voice_primary | en |
| P-005 | Freelance Designer Maya | 31 | high | UI/UX freelancer | text_primary | en |
| P-006 | Sales Rep Carlos | 38 | medium | Enterprise sales | voice_primary | es |
| P-007 | Data Analyst Priya | 26 | high | Business intelligence | text_primary | en |
| P-008 | HR Manager Linda | 48 | low | People operations | hybrid | en |
| P-009 | Startup Founder Kai | 33 | high | Early-stage CEO | hybrid | en |
| P-010 | Consultant Marcus | 45 | medium | Management consulting | text_primary | en |

### Accessibility Personas (P-011 to P-015)

| ID | Name | Age | Tech | Accessibility Need | Interaction |
|----|------|-----|------|--------------------|-------------|
| P-011 | Screen Reader User Jordan | 34 | high | Blind, uses JAWS/NVDA | text_primary |
| P-012 | Motor Impaired User Sam | 29 | medium | Limited fine motor, uses switch access | text_primary |
| P-013 | Cognitive Processing User Robin | 40 | low | ADHD, needs reduced complexity | hybrid |
| P-014 | Deaf User Taylor | 37 | high | Deaf, text-only output | text_primary |
| P-015 | Low Vision User Pat | 62 | low | 20/200 vision, high contrast + zoom | hybrid |

### Voice-Primary Personas (P-016 to P-019)

| ID | Name | Age | Context | Interaction | Evidence |
|----|------|-----|---------|-------------|----------|
| P-016 | Commuter Driver Mike | 38 | Driving, hands-busy | voice_primary | Hands-free mobile users per §L.35 |
| P-017 | Kitchen Chef Anna | 44 | Cooking, hands dirty | voice_primary | Situational disability use case |
| P-018 | Warehouse Worker Tom | 32 | Walking warehouse floor | voice_primary | Industrial hands-free |
| P-019 | Parent with Child Jess | 36 | Holding baby, one hand | voice_primary | Situational disability |

### Cross-Surface Personas (P-020 to P-024)

| ID | Name | Surfaces | Transitions | Evidence |
|----|------|----------|-------------|----------|
| P-020 | Multi-Device Professional | mobile-ios, desktop-mac | commute→office | Cross-device sync per §L.23 Surface 3 |
| P-021 | Tablet Reviewer | desktop-win, tablet-ipad | office→couch | Document review workflow |
| P-022 | Mobile-First Manager | mobile-android, desktop-win | field→office | Sales field work pattern |
| P-023 | Remote Worker | desktop-mac, desktop-win | home→office | Dual-machine workflow |
| P-024 | Travel Professional | mobile-ios, tablet-ipad, desktop-mac | airport→hotel→office | 3-surface journey |

### Localization Personas (P-025 to P-028)

| ID | Name | Language | RTL | Tech | Evidence |
|----|------|----------|-----|------|----------|
| P-025 | Japanese Business User Yuki | ja | No | high | East Asian market |
| P-026 | Arabic Entrepreneur Ahmed | ar | Yes | medium | RTL layout testing |
| P-027 | German Engineer Hans | de | No | expert | European market |
| P-028 | Brazilian Marketer Lucia | pt-BR | No | medium | LATAM market |

### Collaborative Personas (P-029 to P-030)

| ID | Scenario | Participants | Interaction |
|----|----------|-------------|-------------|
| P-029 | Client Review | P-001 (advisor) + P-008 (HR client) | Document co-review |
| P-030 | Team Planning | P-009 (founder) + P-003 (engineer) + P-005 (designer) | Sprint planning |

## Journey Templates

### Multi-Session Journey Example (P-001)
```
Session 1 (Monday 9am): Create client portfolio analysis
  - Upload financial data CSV
  - Request analysis with charts
  - Save draft report
Session 2 (Wednesday 2pm): Review and refine
  - Open saved report
  - Request revisions to charts
  - Generate PDF for client
  - Email to client
Gap: 53 hours (multi-session verified)
```

### Cross-Surface Journey Example (P-020)
```
Segment 1 (mobile-ios, commute):
  - Voice: "Start a market research report on AI tools"
  - Agent begins research, saves progress
Segment 2 (desktop-mac, office):
  - Open same task, see progress
  - Refine with keyboard, add data
  - Generate final document
Transition test: state persists from mobile to desktop
```

### Collaborative Journey Example (P-029)
```
Participant A (P-001, advisor):
  - Creates document, shares with client
Participant B (P-008, HR client):
  - Opens shared document
  - Adds comments
  - Requests changes
Sync test: both see real-time updates
```

## Scoring Rubric (7 dimensions + 1 extended)

1. **Task completion** (0-5): Did persona achieve goal?
2. **Time efficiency** (0-5): Within persona's time budget?
3. **Error recovery** (0-5): Could persona recover from errors?
4. **Cognitive load** (0-5): Was complexity appropriate for tech literacy?
5. **Accessibility** (0-5): Were accessibility needs met?
6. **Delight** (0-3): Unexpected positive moments
7. **Trust** (0-5): Did persona trust the agent's output?
8. **Reasoning-fits-persona** (0-5): Was reasoning verbosity appropriate?

## Abandonment Tracking

- **Threshold:** ≤5% abandonment rate across all personas
- **Attribution:** §L.27 capability-lag vs §L.28 experience-friction
- **Cascade tracking:** If primary goal abandoned, track fallback goal outcome
- **Legitimate abandonment:** Out-of-scope personas don't count toward threshold

## Schedule

- **Every 20 passes:** Rotate 5 personas through journeys
- **Every 200 passes:** Full catalog sweep (all 30 personas)
- **Every 500 passes:** Persona drift review
