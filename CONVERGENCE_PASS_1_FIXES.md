# Convergence Pass 1 - Consolidated Fixes

## Already Fixed (this session):
- [x] SSE buffer accumulation in streamWithRetry.ts
- [x] Task deduplication race condition in TaskContext.tsx  
- [x] JSON.parse try/catch in TaskContext.tsx
- [x] SandboxViewer browser iframe (use iframe when browserUrl available)
- [x] onArtifact try/catch in agentStream.ts
- [x] ARTIFACT_TYPES expanded for xlsx/csv
- [x] Download filename sanitization in InteractiveOutputCard
- [x] Webapp creation reliability (prefer HTML template)
- [x] Agent tone warmth in system prompt
- [x] Motion signatures (120ms fade-and-rise)

## Remaining Critical Fixes:
1. WebappPreviewCard animation timing 300ms → 120ms
2. SandboxViewer floating toolbar buttons need onClick handlers
3. ActiveToolIndicator timer race condition (ensure timer resets on tool change)
4. Scheduled tasks table migration (scheduler poll error)

## Remaining Medium Fixes:
5. SandboxViewer code syntax highlighting (add basic highlighting)
6. streamWithRetry final chunk processing (remaining buffer after loop)
7. WebappPreviewCard Code tab - show file list properly

## Status: Pass 1 complete, applying remaining fixes
