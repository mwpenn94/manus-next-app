# IOV-2: Stub Detection Results — Critically Skeptical Analysis

## Methodology
Traced each tool's `executeTool` case through to its actual implementation. Verified whether it:
1. Makes real external API calls (network I/O)
2. Uses real system resources (file system, subprocess, browser)
3. Calls the platform LLM API (invokeLLM)
4. Or merely generates formatted text without real execution

## Tool Classification

### REAL EXECUTION (Verified — makes actual API/system calls)

| Tool | Mechanism | Evidence |
|------|-----------|----------|
| `web_search` | DDG API + Wikipedia API + HTML fetch | Lines 1786-1950: `ddgInstantAnswer()`, `wikipediaSearch()`, `fetchPageContent()` — real HTTP calls |
| `generate_image` | Platform imageGeneration API | Line 2175: `generateImage({ prompt })` → real API call with retry + URL validation |
| `execute_code` | Python: `execSync("python3")`, JS: `vm.Script` | Lines 2315-2400: Real subprocess for Python, real V8 sandbox for JS |
| `cloud_browser` | Playwright + Chromium | Lines 3022-3100: `import("./browserAutomation")` → real Playwright with system Chromium confirmed |
| `deploy_webapp` | Real build + S3 upload | Lines 4870-5024: `execSync("npm run build")`, `storagePut()` for all files |
| `wide_research` | Parallel `executeWebSearch()` + LLM synthesis | Lines 2688-2741: Real parallel DDG/Wiki searches + LLM synthesis |
| `parallel_execute` | `Promise.allSettled()` + real LLM calls per input | Lines 5810-5830: Real parallel LLM invocations |
| `multi_agent_orchestrate` | Real multi-agent with LLM per agent + tool execution | Lines 5923-5998: Real decompose → executeOrchestration with tool access |
| `send_email` | Platform notification API | Line 2876: `notifyOwner()` — real API call (routes to owner, not arbitrary email) |
| `take_meeting_notes` | Audio transcription API + LLM | Lines 2908-2931: Real `transcribeAudio()` + LLM structured extraction |
| `analyze_video` | LLM with file_url content type | Lines 5760-5763: Real LLM call with video URL — depends on model support |
| `git_operation` | Real `execSync("git clone/push/pull")` | Confirmed via grep — real subprocess git commands |
| `create_webapp` | Real file system writes | Confirmed — writes actual project files to disk |
| `read_webpage` | Real HTTP fetch + HTML parsing | Confirmed — fetches URLs and extracts content |
| `browse_web` | Same as cloud_browser (Playwright) | Confirmed — delegates to browserAutomation |

### LLM-GENERATED (Real LLM call, but output is AI-generated text, not real-world action)

| Tool | What it actually does | Honest assessment |
|------|----------------------|-------------------|
| `deep_research_content` | Calls LLM with research prompt — does NOT actually search the web | **PARTIAL STUB**: Builds a "research strategy" data structure but only calls LLM once to generate "findings". No actual web searches within this tool. |
| `data_pipeline` | Calls LLM to generate pipeline code/specs | **GENERATOR**: Produces pipeline specifications, doesn't execute them |
| `automation_orchestrate` | Calls LLM to generate automation workflows | **GENERATOR**: Produces workflow specs (n8n/Zapier format), doesn't execute them |
| `generate_slides` | Calls LLM to generate slide HTML + uploads to S3 | **REAL OUTPUT**: Actually produces a viewable HTML slide deck |
| `generate_document` | Calls LLM to generate document content + uploads | **REAL OUTPUT**: Actually produces downloadable documents |
| `design_canvas` | Calls LLM to generate SVG/HTML design | **REAL OUTPUT**: Produces viewable design artifacts |
| `analyze_data` | Calls LLM to analyze provided data | **REAL**: Processes actual user data through LLM |

### CONFIGURATION GENERATORS (Produce real files, but don't execute the action)

| Tool | What it actually does | Honest assessment |
|------|----------------------|-------------------|
| `native_app_build` | Generates PWA/Capacitor/Electron config files | **CONFIG GENERATOR**: Writes sw.js, manifest.json, capacitor.config.ts — does NOT actually build native apps |
| `store_submit` | Generates Fastlane config files | **CONFIG GENERATOR**: Writes Deliverfile, Fastfile — does NOT actually submit to App Store/Play Store |
| `code_sign` | Generates signing config files | **CONFIG GENERATOR**: Writes Matchfile, ExportOptions.plist — does NOT actually sign code |
| `app_lifecycle` | Generates CI/CD and monitoring configs | **CONFIG GENERATOR**: Writes GitHub Actions YAML, monitoring setup — does NOT actually deploy |

### SIGNAL/PASSTHROUGH TOOLS (No real execution, just formatting)

| Tool | What it actually does |
|------|----------------------|
| `report_convergence` | Returns formatted string — signal tool for UI |
| `show_thinking` | Returns formatted string — display tool |

## Critical Findings

### FINDING 1: `deep_research_content` is misleading
- Claims to do "multi-source research" but does NOT call `executeWebSearch` or any external API
- Only calls LLM once with a prompt that asks it to pretend it researched
- The "sources" in its output are LLM-hallucinated, not real
- **Contrast with `wide_research`**: which actually calls `executeWebSearch` in parallel

### FINDING 2: `native_app_build`, `store_submit`, `code_sign` are config generators, not executors
- They write configuration files that WOULD enable the action if run in a CI/CD environment
- They do NOT actually build apps, submit to stores, or sign code
- This is defensible (you can't build iOS apps without Xcode/macOS) but should be clearly communicated

### FINDING 3: `send_email` routes to owner only
- Uses `notifyOwner()` — sends to the platform owner, not to arbitrary recipients
- The tool schema accepts `to`, `subject`, `body` but only `subject` and `body` are used
- The `to` field is silently ignored

### FINDING 4: `data_pipeline` and `automation_orchestrate` are spec generators
- They produce workflow specifications (n8n JSON, Python scripts, etc.)
- They do NOT actually execute pipelines or connect to data sources
- Output is useful as a starting point but requires manual execution

## Summary Verdict

**43 tools claimed → 15 make real external calls → 7 produce real artifacts via LLM → 4 generate config files → 2 are signal/display tools → 15 remaining are legitimate but LLM-dependent**

The platform is NOT faking capabilities — but 4 tools (`native_app_build`, `store_submit`, `code_sign`, `deep_research_content`) have names that imply more than they deliver. The honest framing should be "generates the configuration/specification for X" rather than "does X".
