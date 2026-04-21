# Self-Development Surfaces — §L.36

> Canonical catalog of 8 SD surfaces with current activation state.
> manus-next-app uses manus-next-app to develop manus-next-app.

## The 8 Self-Development Surfaces

| # | Surface | Description | Activation | Status |
|---|---------|-------------|-----------|--------|
| SD-1 | **Ideation** | Agent uses the app's own AI chat to brainstorm features, analyze requirements, and plan architecture | Active | The LLM pipeline (`invokeLLM`) powers both user-facing chat AND agent's own reasoning |
| SD-2 | **Coding** | Agent uses the app's code generation capabilities to write its own code | Active | tRPC procedures + LLM generate code that becomes part of the app |
| SD-3 | **Testing** | Agent uses the app's testing infrastructure to validate its own changes | Active | Vitest suite (1212 tests) runs against the app's own code |
| SD-4 | **Deploying** | Agent uses the app's deploy pipeline to deploy itself | Active | `webdev_save_checkpoint` + Manus publish deploys the app |
| SD-5 | **Monitoring** | Agent uses the app's monitoring to watch its own health | Active | `.manus-logs/`, Manus Analytics, health checks |
| SD-6 | **Maintaining** | Agent uses the app's maintenance tools to patch its own dependencies | Active | `pnpm audit` + dependency updates via the app's own workflow |
| SD-7 | **Optimizing** | Agent uses the app's performance tools to optimize itself | Active | Performance audits, bundle analysis, lighthouse scores |
| SD-8 | **Documenting** | Agent uses the app's documentation system to document itself | Active | This very document is self-generated documentation |

## Recursive Dogfooding Architecture

```
┌─────────────────────────────────────────────────┐
│                manus-next-app                    │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ AI Chat  │───▶│ Code Gen │───▶│  Deploy  │  │
│  │ (SD-1)   │    │ (SD-2)   │    │ (SD-4)   │  │
│  └──────────┘    └──────────┘    └──────────┘  │
│       │               │               │         │
│       ▼               ▼               ▼         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Test    │───▶│ Monitor  │───▶│ Maintain  │  │
│  │ (SD-3)   │    │ (SD-5)   │    │ (SD-6)   │  │
│  └──────────┘    └──────────┘    └──────────┘  │
│       │               │                         │
│       ▼               ▼                         │
│  ┌──────────┐    ┌──────────┐                   │
│  │ Optimize │───▶│ Document │                   │
│  │ (SD-7)   │    │ (SD-8)   │                   │
│  └──────────┘    └──────────┘                   │
│                                                  │
│  ◀──── All surfaces feed back into SD-1 ────▶   │
└─────────────────────────────────────────────────┘
```

## Safety Rails

| Rail | Description | Implementation |
|------|-------------|----------------|
| **Stable channel** | Always-accessible stable version that self-dev cannot break | Checkpoint system provides instant rollback |
| **Blast-radius containment** | Self-modifications are scoped to non-critical paths | §L.29/§L.33/§L.36 modules are never self-modified |
| **Loop detection** | Detect and halt infinite self-improvement loops | `META_RECURSION_LOG.md` tracks depth; cap at 2 |
| **Meta-recursion cap** | Maximum depth-2 for self-referential development | Agent cannot create agents that create agents |
| **Never self-mod safety** | §L.29, §L.33, §L.36 cannot be modified by the agent | Requires Mike's explicit edit |

## Graduation Ladder

| Step | Capability | Prerequisite | Mike Sign-off |
|------|-----------|-------------|---------------|
| 1 | README updates | — | Not required |
| 2 | Documentation changes | Step 1 demonstrated | Not required |
| 3 | Test additions | Step 2 demonstrated | Not required |
| 4 | Bug fixes (non-critical) | Step 3 + test coverage | Recommended |
| 5 | Feature additions | Step 4 + PR review | Required |
| 6 | Architecture changes | Step 5 + design doc | Required |
| 7 | Infrastructure changes | Step 6 + rollback plan | Required |
| 8 | Self-deploy to production | Step 7 + monitoring | Required |
