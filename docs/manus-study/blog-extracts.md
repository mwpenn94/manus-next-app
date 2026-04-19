# Manus Blog Extracts — Design Principles

Source: https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
Author: Yichao 'Peak' Ji, 2025/7/18

## Core Philosophy
- "Manus would bet on context engineering" — ship improvements in hours instead of weeks
- "If model progress is the rising tide, we want Manus to be the boat, not the pillar stuck to the seabed"
- "Stochastic Graduate Descent" — architecture searching, prompt fiddling, empirical guesswork
- Rebuilt agent framework 4 times, each time after discovering better context shaping

## Key Principles

### 1. Design Around the KV-Cache
- KV-cache hit rate is the single most important metric for production AI agents
- Average input-to-output token ratio: ~100:1
- Keep prompt prefix stable (no timestamps at start)
- Make context append-only (no modifying previous actions/observations)
- Deterministic serialization (stable JSON key ordering)
- Mark cache breakpoints explicitly

### 2. Mask, Don't Remove
- Don't dynamically add/remove tools mid-iteration
- Use context-aware state machine to manage tool availability
- Mask token logits during decoding instead of removing tools
- Design action names with consistent prefixes (browser_*, shell_*)

### 3. Use the File System as Context
- File system as externalized memory for the agent
- Compress large observations into files rather than stuffing context

### 4. Manipulate Attention Through Structure
- Structure prompts to guide model attention
- Use XML tags, numbered lists, clear section headers

### 5. Keep Errors in Context
- Don't hide errors from the agent — errors are valuable learning signals
- Let the agent self-correct by seeing what went wrong

### 6. Avoid Over-Tooling
- Fewer, more general tools > many specialized tools
- Each tool should have clear, non-overlapping purpose

## Source 2: Manus Skills Blog (Jan 27, 2026)
URL: https://manus.im/blog/manus-skills

### Agent Skills Architecture
- "Progressive Disclosure" mechanism — 3 levels of context loading
  - Level 1: Metadata (name/description, ~100 tokens/Skill, loaded at startup)
  - Level 2: Instructions (SKILL.md, <5k tokens, loaded when triggered)
  - Level 3: Resources (scripts/assets, loaded on demand)
- Native Architectural Compatibility: isolated sandbox VM with Ubuntu file system
- Composability: combine multiple independent Skills for complex multi-step tasks
- Commitment to Open Standards: shared format across AI products
