# EXCEED_ROADMAP.md — Beyond-Parity Targets

*Features and improvements that would push Manus Next beyond Manus Pro parity.*

## Tier 1: Near-Term (Next Sprint)

### Storybook Component Library
Install Storybook with stories for all Tier 1 capabilities. This enables visual regression testing, component documentation, and design system governance.
**Effort:** 4-6 hours. **Impact:** Developer velocity + design consistency.

### I18N with react-intl
Extract all user-facing strings into message catalogs. Wire react-intl provider. Ship English + Spanish. This opens the platform to non-English markets.
**Effort:** 6-8 hours. **Impact:** Market expansion.

### Formal Mobile Responsive Audit
Test all pages at 375px viewport width. Verify touch targets ≥44px. Fix any overflow or truncation issues.
**Effort:** 2-3 hours. **Impact:** Mobile usability.

## Tier 2: Medium-Term (2-4 Weeks)

### Real-Time Collaborative Viewing
WebSocket broadcast of task progress to multiple viewers. Enables team observation of agent work.
**Effort:** 8-12 hours. **Impact:** Team collaboration.

### Canvas-Based Design View
Replace the stub DesignView page with a Fabric.js or Konva canvas for visual artifact creation and editing.
**Effort:** 20-30 hours. **Impact:** Visual content creation.

### Benchmark Suite
Define 20 standard benchmark tasks across categories (research, code, analysis, creative). Execute on both Manus Pro and Manus Next. Compare completion rate, quality, and cost.
**Effort:** 10-15 hours. **Impact:** Quantitative parity measurement.

## Tier 3: Long-Term (1-3 Months)

### Upstream Package Extraction
Extract the 13 @mwpenn94/manus-next-* packages from the monolith into independent npm packages with proper build pipelines, changelogs, and semantic versioning.
**Effort:** 40-60 hours. **Impact:** Ecosystem growth.

### Multi-Model Support
Add model selection (GPT-4, Claude, Gemini, local models) with per-model prompt optimization.
**Effort:** 20-30 hours. **Impact:** Model flexibility + cost optimization.

### Plugin/Extension System
Allow third-party tools to be registered as agent capabilities, similar to Manus Skills.
**Effort:** 30-40 hours. **Impact:** Extensibility + community.
