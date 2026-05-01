# Manus Parity Targets — Key Takeaways from Reference Materials

## Convergence Methodology (from Magnum Opus)
- **1,280 consecutive zero-update passes** across 182 domain lens clusters = converged
- Each pass: fresh, novel, wide, deep, comprehensive
- If a fix is made, convergence counter resets to 0
- Priority: Landscape > Depth > Adversarial > Future-State
- Signal assessment before each pass

## Core Manus Capabilities (from MANUS_COMPLETE_REFERENCE)
1. **Agent Loop**: Analyze → Think → Select Tool → Execute → Observe → Iterate
2. **Planning Layer**: Explicit plan with phases, updated dynamically
3. **Tool Architecture**: 15+ tool categories (shell, file, browser, search, media gen, slides, webdev, map, schedule, expose)
4. **Error Handling**: 3-attempt model (diagnose → alternative → ask user)
5. **Parallel Processing**: Up to 2,000 subtasks via map tool
6. **Reflexion**: Self-evaluate outputs, iterate until no improvements remain

## Highest-Value Capabilities for Our App (AI Reasoning + Task + App Dev)
1. **Task Execution Pipeline** — streaming agent responses, tool invocations, progress tracking
2. **AI Reasoning Display** — thinking indicators, step-by-step tool usage visualization
3. **Code/App Generation** — webapp builder, code editing, deployment pipeline
4. **Research Pipeline** — multi-source research with citations
5. **Media Generation** — images, video, audio, music, speech
6. **Scheduling** — recurring tasks, cron-based automation
7. **GitHub Integration** — repo connection, editing, deployment

## AOV Approach for Parity+
- Virtual users: New User, Power User, Security Auditor, Manus Alignment Auditor, Edge Case Explorer
- Test each capability as if a real user in production
- Ensure no regressions from component additions
- Focus on: streaming stability, tool execution accuracy, error recovery, UI responsiveness
