# IOV-3: Deep Research Verification Results

## Test: "Do deep research on the current state of CRISPR gene editing technology in 2025"

### Execution Timeline
- 03:39:15 — deep_research_content tool invoked
- 03:39:15 — gatherRealSearchData called for 3/4 sources (web_search, academic_paper, news_article)
- 03:39:21 — **Got real data from 3/4 sources** ✅ (previously was 0/4)
- 03:40:15 — First document artifact produced (from deep_research_content tool)
- 03:41-03:43 — Agent continued with additional web_search + read_webpage calls (multi-turn research)
- 03:44:06 — Second document artifact produced (full Markdown report)
- 03:44:52 — Stream complete after 9 turns, 21 tool calls

### Key Findings

**FIX VERIFIED**: The JSON.stringify fix works. Deep research now gets **3/4 real search results** before LLM synthesis.

**Search sources that fired**:
- Wikipedia: Returned results for CRISPR gene editing, Genome editing, Cas9, Gene therapy, 2025 in science ✅
- Hacker News: Searched ✅
- YouTube (via Forge API): Multiple video results ✅

**Quality Issue**: QualityJudge scored 2.6/5.0 (flagged). Dimensions:
- accuracy=3, completeness=1, reasoning=3, actionability=2, safety=4

The completeness=1 is because the agent got stuck after producing the deep_research document and tried to add more content but hit the stuck detector. The deep_research_content tool DID produce a full report, but the agent then tried to do MORE research and got repetitive.

### Remaining Issue
The agent over-researches after deep_research_content already produced a document. The deep_research tool itself works correctly (3/4 real sources), but the agent's agentic loop doesn't know to stop after the tool produces its artifact. This is a prompt/behavior issue, not a tool issue.

### Verdict
- **deep_research_content tool**: ✅ FIXED — now calls real web_search, gets real data
- **Agent behavior after deep_research**: ⚠️ Continues researching after tool already produced output
- **Overall user experience**: Acceptable — user gets a full research document, just takes ~5 minutes
