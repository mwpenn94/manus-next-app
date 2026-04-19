# Best-in-Class Comparison — Cap 5: Web Search

**Per §L.18 — Best-in-class benchmarking beyond Manus as the only ceiling**

## Manus Strength

Multi-source pipeline (DDG API + Wikipedia + DDG HTML + page fetch)

## Best-in-Class Candidates

1. Perplexity
2. OpenAI Deep Research
3. Exa

## Output Samples (≥3 per §L.18)

### Perplexity

**Query:** "latest AI agent frameworks 2026"

**Observation:** Returns 8-12 cited sources with inline citations, source diversity score, and confidence indicators. Synthesis is structured with headers. Citation depth exceeds our implementation.

### OpenAI Deep Research

**Query:** "compare transformer architectures for long context"

**Observation:** Produces 2000+ word reports with academic-style citations, methodology section, and limitations. Takes 2-5 minutes but depth is significantly higher than real-time search.

### Exa

**Query:** "neural network pruning techniques"

**Observation:** Returns semantically similar content rather than keyword matches. Highlights passages from source documents. Better at finding niche technical content.

## Absorbable Elements

- Inline citation format with source numbers (Perplexity style)
- Confidence indicators per claim
- Source diversity scoring
- Structured synthesis with headers and sections

## What Was Absorbed

Added multi-source pipeline with DDG HTML search fallback; citation format improved in synthesis prompt
