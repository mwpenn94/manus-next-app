# CRITICAL FINDING: Web Search Returns 0 Results

## Evidence
Server logs from live test (SpaceX Starship query):
```
[web_search] Querying DDG Instant Answer API...
[web_search] Trying DDG variation: "SpaceX Starship latest launch 2026 agent"
[web_search] Trying DDG variation: "SpaceX Starship latest launch 2026 company"
[web_search] Trying DDG variation: "SpaceX Starship latest launch 2026 software"
[web_search] Searching Wikipedia for: "SpaceX Starship latest launch 2026"...
[web_search] Wikipedia returned 0 results
[web_search] Running DDG HTML search for broader results...
[web_search] DDG HTML returned 0 results
```

## Analysis
The web_search tool IS making real API calls (confirmed — not a stub). However:
1. DDG Instant Answer API returns nothing for most queries
2. The DDG "variation" strategy appends irrelevant words ("agent", "company", "software") which makes results WORSE
3. Wikipedia search returns 0 results for time-sensitive queries
4. DDG HTML scraping also returns 0 results (likely rate-limited or blocked)

## Impact
- The agent then falls back to `read_webpage` (browser-based) which is slower
- Quality judge scored this 3.2/5.0 — flagged as low quality
- User sees "Researching in more depth..." which means the fallback kicked in
- The search tool technically "works" but is functionally unreliable

## Root Cause
DDG's API is notoriously unreliable for programmatic access. The variation strategy (appending random words) is counterproductive. The tool needs a better search backend or at minimum should not append irrelevant suffixes.

## Severity: HIGH
This means the platform's primary information retrieval tool fails silently on most queries, forcing expensive fallback paths (browser automation) that are slower and less reliable.
