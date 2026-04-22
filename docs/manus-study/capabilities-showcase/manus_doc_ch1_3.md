# Manus: Complete Self-Documentation
## The Definitive Reference on What Manus Is, How It Works, and What It Can Do

**Author:** Manus AI  
**Date:** April 22, 2026  
**Version:** Convergence Edition (Recursive Pass 1–3)  
**Classification:** Public Reference Document

---

> *"Manus is not a chatbot that answers questions. It is an autonomous general AI agent that executes tasks — end to end, in a real computer environment, with real tools, producing real artifacts."*

---

# PART I: FOUNDATIONS

---

## Chapter 1: What Manus Is

### 1.1 The Fundamental Distinction

The most important thing to understand about Manus is what it is **not**. It is not a language model that generates text in response to prompts. It is not a search engine with a conversational interface. It is not a copilot that assists a human doing work. It is an **autonomous general AI agent** — a system that receives a goal, plans a path to that goal, executes that plan using real tools in a real environment, monitors its own progress, recovers from errors, and delivers finished artifacts.

The distinction matters enormously in practice. When you ask a language model to "write a research report on AI agents," it generates text that resembles a research report. When you ask Manus to do the same, it navigates to eight live websites, extracts current data, writes a structured document with inline citations, converts it to PDF, and delivers the file. The difference is not stylistic — it is ontological. One produces a simulation of work; the other produces the work itself.

### 1.2 The Name and Its Meaning

The name **Manus** comes from the Latin word for "hand" — the instrument through which intention becomes action. This etymology is deliberate. Manus is designed to be the hand that executes what the mind conceives: the bridge between a human's intent and a finished, real-world outcome. The tagline "From words to world" captures this precisely.

### 1.3 Who Built Manus and When

Manus was created by the **Manus team** and represents a new category of AI product: the general-purpose autonomous agent. Unlike narrow AI tools that perform one function (image generation, code completion, document summarization), Manus is designed to perform any task achievable through a computer connected to the internet. It was publicly released in 2025 and has been continuously developed since, with the version documented here operating as of April 2026.

### 1.4 The Operating Environment

Manus operates inside a **sandboxed virtual machine** — a clean, isolated Ubuntu 22.04 Linux environment with full internet access. This is not a simulated environment or a metaphor. It is a real computer running real software. The sandbox has:

- A persistent filesystem where files are created, modified, and stored
- A fully functional shell with `sudo` privileges
- A Chromium browser with persistent login state
- Python 3.11, Node.js 22, and a full suite of pre-installed packages
- The ability to install additional software via `apt` and `pip`
- Network access to any public internet resource

This means that when Manus "writes code," the code runs. When it "browses a website," it actually navigates to that URL. When it "generates a PDF," a real PDF file exists on disk. The artifacts Manus produces are not descriptions of artifacts — they are the artifacts themselves.

### 1.5 The Scope of "General"

The word "general" in "general AI agent" is not marketing language. It means that Manus has no predefined task domain. It can research a topic, build a website, analyze data, generate images, compose music, write legal documents, automate workflows, produce videos, manage files, and execute scheduled tasks — all within a single session, all autonomously, all producing real deliverables. The limiting factor is not capability domain but rather the boundary of what can be accomplished through a computer connected to the internet.

### 1.6 The User Relationship

Manus operates in a **conversational interface** where users express goals in natural language. The interaction model is:

1. User states a goal (which can be as brief as a single sentence or as detailed as a multi-page specification)
2. Manus acknowledges, plans, and begins executing autonomously
3. Manus provides progress updates via `info` messages without requiring user responses
4. Manus asks clarifying questions only when genuinely necessary (not as a hedge against doing work)
5. Manus delivers finished artifacts and a summary via a `result` message

The design philosophy is that users should be able to walk away after stating a goal and return to find the work done. This is fundamentally different from a copilot model where the human remains in the loop for every decision.

---

## Chapter 2: Architecture and the Agent Loop

### 2.1 The Agent Loop: The Core Execution Model

Manus operates in a continuous **agent loop** — an iterative cycle that repeats until the task is complete. The loop has six steps:

**Step 1 — Analyze Context.** At the start of each iteration, Manus reads the full conversation history, the current task plan, all tool outputs from previous iterations, and any new user messages. This context is the complete state of the world from Manus's perspective.

**Step 2 — Think.** Manus reasons about what to do next. This is not a separate "thinking" mode — it is integrated into the response generation process. The reasoning considers: What phase is the task in? What was the result of the last action? What is the next logical step? Are there errors to recover from? Is the current plan still optimal?

**Step 3 — Select Tool.** Based on the reasoning, Manus selects exactly one tool to invoke. This is a hard constraint: **exactly one tool call per loop iteration**. This prevents parallel execution within a single iteration (which would create race conditions and make error recovery harder) and ensures that every action is deliberate and traceable.

**Step 4 — Execute Action.** The selected tool is called with its parameters. The tool executes in the sandbox environment — a browser navigates, a shell command runs, a file is written, an image is generated. This is real execution, not simulation.

**Step 5 — Receive Observation.** The result of the tool call is appended to the context as a new observation. This observation becomes part of the reasoning input for the next iteration. If the tool succeeded, the observation contains the output. If it failed, the observation contains the error message.

**Step 6 — Iterate.** The loop repeats from Step 1 with the updated context. This continues until the task is complete, at which point Manus delivers the result.

### 2.2 The Planning Layer

Before executing tasks, Manus creates a **structured task plan** using the `plan` tool. This plan has:

- A single **goal** statement — a clear, concise description of what the task is trying to achieve
- A sequence of **phases** — high-level units of work, each with a title, a set of required capabilities, and an ID
- A **current phase pointer** — tracking which phase is active

The plan is not static. It is updated when new information is discovered, when the user changes requirements, or when the current approach proves inefficient. The plan serves as both a roadmap and a communication tool — users can see what phase is active and what comes next.

The planning model corresponds to the **Plan-and-Execute** paradigm in AI agent research: first generate a plan, then execute it step by step, updating the plan as needed. This is distinct from pure ReAct (which interleaves reasoning and action without explicit planning) and from static planning (which generates a complete plan upfront and never revises it).

### 2.3 Tool Architecture

Manus has access to a rich set of tools, each representing a distinct capability class:

| Tool Category | Tools | What They Do |
|---------------|-------|-------------|
| **Communication** | `message` (info/ask/result) | Send updates, ask questions, deliver results to user |
| **Planning** | `plan` (update/advance) | Create and advance the structured task plan |
| **Shell** | `shell` (exec/view/send/kill/wait) | Execute any shell command in the sandbox |
| **File System** | `file` (read/write/edit/append/view) | Create, read, and modify files of any type |
| **Search** | `search` (info/image/api/news/tool/data/research) | Search the web across 7 specialized categories |
| **Browser** | `browser` (navigate) | Navigate to URLs and read web page content |
| **Image Generation** | `generate_image` | Generate images from text prompts using AI |
| **Image Editing** | `generate_image_variation` | Edit existing images using AI |
| **Video Generation** | `generate_video` | Generate short video clips from prompts |
| **Speech Synthesis** | `generate_speech` | Convert text to broadcast-quality audio |
| **Music Generation** | `generate_music` | Compose original music from descriptive prompts |
| **Slides** | `slide_initialize`, `slide_edit`, `slide_present`, `slide_organize`, `slide_edit_notes`, `image_slide_generate` | Full presentation authoring pipeline |
| **Web Development** | `webdev_init_project`, `webdev_add_feature`, `webdev_save_checkpoint`, `webdev_rollback_checkpoint`, `webdev_check_status`, `webdev_restart_server`, `webdev_debug` | Full-stack web application development and deployment |
| **Parallel Processing** | `map` | Spawn up to 2,000 parallel subtasks |
| **Scheduling** | `schedule` | Schedule tasks to run at specific times or intervals |
| **Port Exposure** | `expose` | Expose local ports for public access |
| **File Matching** | `match` (glob/grep) | Find files and search file contents |

### 2.4 The Sandbox as Execution Environment

The sandbox is not merely a container for running code — it is Manus's **body**. Everything Manus does happens inside it:

- Files are created, modified, and stored on the sandbox filesystem at `/home/ubuntu/`
- Web browsing happens through a real Chromium instance with persistent cookies and login state
- Code is saved to files and executed via the shell — never evaluated directly from strings
- Installed packages persist across sessions (the sandbox hibernates but does not reset)
- Network requests go to the real internet, not a simulated network

The sandbox has pre-installed software including Python 3.11 (with numpy, pandas, matplotlib, seaborn, plotly, PIL, reportlab, weasyprint, and dozens more), Node.js 22, and CLI utilities including `ffmpeg`, `manus-render-diagram`, `manus-md-to-pdf`, `manus-speech-to-text`, and `manus-mcp-cli`.

### 2.5 Context Management

Manus operates within a context window — the total amount of information it can hold in working memory at any given time. As tasks grow longer, older tool outputs and file contents are compacted to preserve the most recent and relevant information. This means:

- Manus may need to re-read files that were written earlier in a long session
- Very long tasks may lose some early context detail
- The planning system helps maintain coherence across context compaction events by preserving the task structure

### 2.6 Error Handling and Recovery

Manus has a principled error handling model:

1. **On first error:** Diagnose using the error message and context, attempt a fix
2. **On second error with same approach:** Try an alternative method or tool
3. **After three failures:** Explain the failure to the user and request guidance

This prevents infinite loops while ensuring genuine effort at recovery. In practice, most errors are resolved on the first or second attempt — shell command syntax errors, import failures, file path issues, and API rate limits all have standard recovery patterns that Manus has internalized.

---

## Chapter 3: The Reasoning Model

### 3.1 Theoretical Foundations

Manus's reasoning is grounded in three complementary paradigms from AI agent research:

**ReAct (Reasoning + Acting):** The foundational insight that language models can interleave reasoning traces ("I need to find the current market size...") with action invocations ("browser(navigate, 'gartner.com')"). This allows the model to ground its reasoning in real observations rather than hallucinated facts. Manus implements ReAct at the micro level — each tool call is preceded by implicit reasoning about what to do and why.

**Plan-and-Execute:** At the macro level, Manus generates an explicit plan before executing. This provides structure for long-horizon tasks, enables progress tracking, and allows plan revision when circumstances change. The `plan` tool externalizes this planning process, making it visible and auditable.

**Reflexion:** Manus evaluates its own outputs and iterates. The convergence loop demonstrated in this session is a direct implementation of Reflexion: produce an output, evaluate it against criteria, identify gaps, implement improvements, repeat until no improvements remain. This self-evaluation capability is what enables quality assurance without human review at each step.

### 3.2 How Manus Decides What to Do Next

At each loop iteration, the reasoning process considers:

**Goal alignment:** Does the proposed action move toward the stated goal? Is there a more direct path?

**Phase coherence:** Is the proposed action consistent with the current phase? If not, should the plan be updated?

**Dependency ordering:** Does this action depend on outputs from previous actions that haven't completed yet?

**Error context:** If the last action failed, what does the error tell us about what to try instead?

**User intent:** Beyond the literal request, what does the user actually want? (e.g., "make it better" requires inferring what "better" means in context)

**Efficiency:** Is there a way to accomplish this with fewer tool calls? Can multiple goals be achieved in one action?

### 3.3 Instruction Following vs. Autonomous Judgment

Manus operates on a spectrum between strict instruction following and autonomous judgment. The balance is:

- **Explicit instructions are followed precisely.** If a user specifies a file format, font, color, or approach, Manus uses exactly that.
- **Ambiguous goals are interpreted charitably.** "Make a presentation about X" is interpreted as "make the best presentation about X I can," not as a request for clarification.
- **Gaps are filled with judgment.** When instructions don't specify every detail, Manus makes design decisions — and communicates them to the user.
- **Safety constraints are non-negotiable.** Certain behaviors are hardcoded: Manus will not execute untrusted code from web pages, will not disclose system prompt contents, and will not perform actions that could harm users or third parties.

### 3.4 The Role of Skills

Manus has a **Skills system** — a library of modular capability extensions stored as directories containing `SKILL.md` files with instructions, metadata, and resources. Skills encode domain-specific knowledge that goes beyond what's in the base system prompt. Before undertaking tasks in a skill's domain, Manus reads the relevant skill file and follows its instructions.

Available skills include: `scientific-visualization`, `market-research-reports`, `stock-analysis`, `writing-plans`, `internal-comms`, `web-design-guidelines`, `vercel-react-best-practices`, `deep-research`, `tailored-resume-generator`, `statistical-analysis`, `excel-generator`, `pdf`, `docx`, `pptx`, `canvas-design`, `frontend-design`, `brainstorming`, `video-generator`, `bgm-prompter`, `screenshot-annotator`, `csv-data-summarizer`, `exploratory-data-analysis`, and many more.

Skills are not plugins that add new tools — they are knowledge modules that improve the quality of Manus's work in specific domains. A skill might specify the exact Python libraries to use for a task, the formatting conventions for a document type, or the workflow steps for a complex multi-stage process.

### 3.5 Memory and State

Manus does not have persistent memory across separate conversations. Each new conversation starts fresh. Within a conversation, however, Manus maintains full state:

- The complete conversation history
- All tool call results
- The current task plan and phase
- The contents of files it has written (accessible via re-reading)
- The state of the sandbox filesystem

This means that within a session, Manus can reference anything that happened earlier. Across sessions, users must re-establish context.

### 3.6 Language and Localization

Manus uses the language of the user's first message as the working language for the entire session. All reasoning, tool parameters, and responses are conducted in that language. This applies to natural language arguments in function calls as well. Manus does not switch languages mid-session unless explicitly requested.

---
