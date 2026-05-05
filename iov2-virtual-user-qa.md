# IOV-2: Virtual User QA — Live Testing

## Homepage State (Dev Preview)
- **Greeting**: "Good morning, Michael." — personalized, correct
- **Input area**: Textarea with placeholder "Assign a task or ask anything" — functional
- **Sidebar**: Shows task history with ~50+ previous tasks visible
- **Quick actions**: "Build a website", "Create slides", "Write a document", "Generate images", "Wide Research"
- **Suggestion cards**: 6 visible (Research AI Agent Architectures, Analyze Market Trends, etc.)
- **Connector prompt**: "Connect Your Services — 1 connected"
- **Package badges**: Full strip visible at bottom
- **Theme**: Dark mode active

## ISSUE FOUND: "Test Template" buttons
- There are 18+ buttons all labeled "Test Template" in the quick-action carousel
- These appear to be placeholder/test data that was never cleaned up
- A real user would see these and be confused
- **Severity: HIGH** — this is a user-facing quality issue

## Test Results

### TEST 1: Simple Math (23 × 17)
- **Input**: "What is 23 times 17? Give me just the number."
- **Output**: "391" ✅ CORRECT
- **Mechanism verified**: Simple query guard stripped tool call, re-invoked LLM with text-only nudge
- **Server logs confirm**: "SIMPLE QUERY GUARD: No text content after stripping — re-invoking LLM for direct answer"
- **Time**: ~3.2 seconds total (2 LLM calls)
- **Cost shown**: $0.063 / 21.0k tokens
- **Status**: Task shows "Completed" in header bar
- **VERDICT**: ✅ FIX WORKS — prior pass bug is resolved

### TEST 2: Research Query (next)
### TEST 3: Image Generation (next)
### TEST 4: Task History Persistence (next)
