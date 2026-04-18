# Parity v8.2 Implementation Notes

## Key Actionable Items for This Session

### From "Where to Beat Manus" (§D)
1. **Keyboard shortcuts** — more extensive power-user navigation (Cmd+K already done, need slash commands, Cmd+N new task, Cmd+/, Escape)
2. **Cost visibility** — per-task cost before/during execution
3. **Multi-provider transparency** — provider/model visible in UI
4. **Offline + PWA** — installable web app (manifest + service worker)
5. **Bundle size / load time** — code-splitting optimization

### From "Key UI Capabilities" (§B)
1. **Feature toolbar** — Focus / Media / TTS / Share / Replay / Artifacts / Tools
2. **Keyboard shortcuts** — slash commands + Cmd+K + power-user navigation
3. **Three-panel layout** — already implemented (chat/canvas/task-tree)
4. **Live canvas view** — already implemented (workspace panel)
5. **Replay scrubber** — already implemented
6. **Share flow** — already implemented
7. **Welcome screen** — already implemented (6 suggestion cards)
8. **Mobile responsive** — already implemented

### From Capability Inventory (§2)
- #4 Speed/Quality Mode — already implemented
- #5 Wide Research — just implemented (parallel multi-query)
- #6 Cross-session memory — already implemented
- #7 Task sharing — already implemented
- #8 Task replay — already implemented
- #9 Event notifications — already implemented
- #17 Scheduled Tasks — just implemented (server-side scheduler)
- #59 Voice TTS — partial (STT done, TTS not yet)
- #60 Voice STT — already implemented

### Remaining Items to Implement This Session
1. ✅ Server-side scheduler polling loop — DONE
2. ✅ Parallel multi-query research (wide_research) — DONE
3. Keyboard shortcuts (Cmd+N, Cmd+/, Escape, slash commands)
4. Cost visibility indicator in task header
5. PWA manifest + installability
6. Feature toolbar enhancements
7. Voice TTS output (text-to-speech for responses)
8. Update all tests for new tools
9. Update all documentation
