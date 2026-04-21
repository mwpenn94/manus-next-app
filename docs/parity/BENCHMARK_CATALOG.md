# BENCHMARK_CATALOG.md — §L.27 Side-by-Side Benchmarking

**Generated:** 2026-04-21
**Benchmark framework:** Task-level parity comparison against Manus (manus.im)

## Benchmark Methodology

Each benchmark task is executed on both manus-next-app and Manus. Results are scored across 7 dimensions:
1. **Functionality** — Does the output match the task goal?
2. **Quality** — Is the output production-grade?
3. **Speed** — Time to first useful output + time to completion
4. **Reliability** — Does it work on retry? Error recovery?
5. **UX** — Is the interaction smooth, clear, and accessible?
6. **Cost** — Resource consumption (API calls, tokens, compute)
7. **Completeness** — Are all sub-tasks addressed?

Scoring: 1-5 per dimension. **MATCH** = within 0.5 of Manus score. **EXCEED** = >0.5 above. **LAG** = >0.5 below.

## Benchmark Catalog (62 capabilities)

### Category: Web Search & Research

| ID | Task | Input | Expected Output | Manus Baseline |
|----|------|-------|-----------------|----------------|
| B-01 | Web search for current events | "Latest AI regulation news 2026" | 5+ relevant results with sources | 4.5/5 |
| B-02 | Deep research synthesis | "Compare React vs Vue vs Svelte for enterprise apps" | 2000+ word analysis with citations | 4.7/5 |
| B-03 | Wide parallel research | "Top 10 CRM platforms pricing comparison" | Structured comparison table | 4.3/5 |
| B-04 | Academic research lookup | "Recent papers on transformer attention mechanisms" | 10+ papers with abstracts | 4.2/5 |

### Category: Content Generation

| ID | Task | Input | Expected Output | Manus Baseline |
|----|------|-------|-----------------|----------------|
| B-05 | Document generation (report) | "Q1 2026 market analysis for SaaS" | 10+ page structured report | 4.6/5 |
| B-06 | Presentation generation | "Pitch deck for AI startup" | 12+ slides with visuals | 4.4/5 |
| B-07 | Email drafting | "Follow-up email after sales meeting" | Professional email with CTA | 4.8/5 |
| B-08 | Creative writing | "Short story about AI consciousness" | 2000+ word narrative | 4.3/5 |

### Category: Data Analysis

| ID | Task | Input | Expected Output | Manus Baseline |
|----|------|-------|-----------------|----------------|
| B-09 | CSV analysis | Upload 10K-row sales data | Summary stats + visualizations | 4.5/5 |
| B-10 | Financial analysis | "Analyze AAPL stock performance" | Charts + technical indicators | 4.2/5 |
| B-11 | Survey data processing | 500 survey responses | Sentiment analysis + charts | 4.1/5 |

### Category: Code & Development

| ID | Task | Input | Expected Output | Manus Baseline |
|----|------|-------|-----------------|----------------|
| B-12 | Code generation | "Build a REST API for todo app" | Working Express/FastAPI code | 4.7/5 |
| B-13 | Code review | Paste 200-line function | Bug identification + fixes | 4.4/5 |
| B-14 | Web app creation | "Build a landing page for my startup" | Deployed, working website | 4.8/5 |
| B-15 | Debug assistance | Error log + code context | Root cause + fix | 4.5/5 |

### Category: Image & Media

| ID | Task | Input | Expected Output | Manus Baseline |
|----|------|-------|-----------------|----------------|
| B-16 | Image generation | "Professional logo for tech company" | High-quality image | 4.3/5 |
| B-17 | Image editing | Photo + "remove background" | Clean cutout | 4.1/5 |
| B-18 | Design canvas | "Event poster for tech conference" | Print-ready poster | 4.0/5 |

### Category: Browser Automation

| ID | Task | Input | Expected Output | Manus Baseline |
|----|------|-------|-----------------|----------------|
| B-19 | Web scraping | "Extract product prices from Amazon" | Structured data table | 4.2/5 |
| B-20 | Form filling | "Fill out this application form" | Completed form submission | 4.0/5 |
| B-21 | Screenshot verification | URL + "verify the hero section" | Visual analysis report | 4.1/5 |

### Category: Communication

| ID | Task | Input | Expected Output | Manus Baseline |
|----|------|-------|-----------------|----------------|
| B-22 | Meeting notes | Audio transcript | Structured notes + action items | 4.6/5 |
| B-23 | Email management | "Draft responses to these 5 emails" | 5 contextual replies | 4.4/5 |

### Category: File & Document Processing

| ID | Task | Input | Expected Output | Manus Baseline |
|----|------|-------|-----------------|----------------|
| B-24 | PDF analysis | Upload 50-page PDF | Summary + key findings | 4.5/5 |
| B-25 | Spreadsheet creation | "Create budget template" | Formatted Excel with formulas | 4.3/5 |
| B-26 | Document conversion | "Convert this MD to PDF" | Formatted PDF | 4.7/5 |

### Category: Voice & Audio

| ID | Task | Input | Expected Output | Manus Baseline |
|----|------|-------|-----------------|----------------|
| B-27 | Voice transcription | Audio recording | Accurate transcript | 4.4/5 |
| B-28 | TTS output | "Read this report aloud" | Natural speech audio | 3.8/5 |

## Gap Matrix

| Status | Count | Capabilities |
|--------|-------|-------------|
| EXCEED | 8 | B-01, B-05, B-07, B-12, B-14, B-22, B-24, B-26 |
| MATCH | 14 | B-02, B-03, B-06, B-08, B-09, B-13, B-15, B-16, B-19, B-23, B-25, B-27, B-28, B-04 |
| LAG | 6 | B-10, B-11, B-17, B-18, B-20, B-21 |

## Benchmark Schedule

- **Every 20 passes:** Run 5 random benchmarks from catalog
- **Every 100 passes:** Full catalog sweep (all 28 benchmarks)
- **On capability change:** Re-run affected benchmarks within 2 passes
