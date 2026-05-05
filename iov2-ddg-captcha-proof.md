# CRITICAL PROOF: DDG Serves CAPTCHA to Server

## Evidence
Direct curl from the sandbox to DDG HTML endpoint returns:
```
"Unfortunately, bots use DuckDuckGo too."
"Please complete the following challenge to confirm this search was made by a human."
"Select all squares containing a duck:"
```

## Root Cause CONFIRMED
DDG HTML search returns a CAPTCHA challenge page, NOT search results.
The regex parser finds 0 `result__a` elements because there ARE none — it's a CAPTCHA page.

## Impact
- `web_search` tool is COMPLETELY BROKEN for the DDG HTML fallback path
- DDG Instant Answer API may still work for simple entity lookups
- Wikipedia API still works for encyclopedia-style queries
- But for current events, news, or specific queries → TOTAL FAILURE

## This means:
The web_search tool is NOT at parity with Manus. Manus uses a real search API (likely Google/Bing via SerpAPI or similar). This platform uses DDG which actively blocks server-side requests.

## Fix Required:
Must integrate a real search API that doesn't CAPTCHA servers:
- Brave Search API (free tier available, no CAPTCHA)
- SerpAPI (paid, reliable)
- Google Custom Search (free tier, 100 queries/day)
- Bing Web Search API (free tier available)

The DDG approach is fundamentally broken for server-side use.
