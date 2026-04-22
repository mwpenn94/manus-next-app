## Chapter 13: How Manus Compares

### 13.1 The Landscape of AI Tools

To understand where Manus sits, it helps to map the broader AI tool landscape. Most AI products occupy a narrow band of capability — they do one thing well. Manus is designed to occupy the entire space.

### 13.2 Manus vs. Conversational AI (ChatGPT, Claude, Gemini)

| Dimension | Conversational AI | Manus |
|-----------|------------------|-------|
| **Execution model** | Generates text responses | Executes tasks with real tools |
| **Output** | Text describing what to do | Finished artifacts (files, apps, videos) |
| **Internet access** | Limited or none | Full, real-time |
| **Code execution** | Sandboxed interpreter (limited) | Full Linux environment |
| **File system** | None | Persistent sandbox filesystem |
| **Browser** | None | Real Chromium browser |
| **Task length** | Single exchange | Multi-hour autonomous sessions |
| **Planning** | Implicit | Explicit structured plan with phases |
| **Error recovery** | None (re-prompt required) | Automatic, up to 3 attempts |
| **Scheduling** | None | Cron and interval scheduling |
| **Parallel processing** | None | Up to 2,000 parallel subtasks |

The key distinction: conversational AI tells you how to do something; Manus does it.

### 13.3 Manus vs. Copilots (GitHub Copilot, Cursor, Notion AI)

Copilots are designed to assist humans doing work — they suggest, complete, and accelerate, but the human remains in the loop for every decision. Manus is designed to replace the human in the loop for well-defined tasks.

| Dimension | Copilots | Manus |
|-----------|---------|-------|
| **Human involvement** | Required at every step | Optional after goal statement |
| **Task scope** | Single file, single document | Full projects, multi-file systems |
| **Domain** | Single domain (code, writing, etc.) | Any domain |
| **Output** | Suggestions and completions | Complete deliverables |
| **Context** | Current file/document | Full internet + filesystem |

### 13.4 Manus vs. Workflow Automation (Zapier, Make, n8n)

Workflow automation tools connect apps and automate predefined sequences. They are excellent for structured, predictable workflows but require explicit configuration for every step. Manus can design and execute workflows without pre-configuration.

| Dimension | Workflow Automation | Manus |
|-----------|-------------------|-------|
| **Setup required** | Yes — explicit node configuration | No — describe the goal |
| **Flexibility** | Fixed workflow graph | Adaptive, replans as needed |
| **Intelligence** | Rule-based | Reasoning-based |
| **New task types** | Requires new workflow | Handles novel tasks immediately |
| **Output types** | Data transformations | Any artifact type |

### 13.5 Manus vs. AI Agents (AutoGPT, AgentGPT, CrewAI)

Manus is in the same category as these systems but differs in important ways:

| Dimension | Open-Source Agents | Manus |
|-----------|------------------|-------|
| **Reliability** | Variable, often unstable | Production-grade, tested |
| **Tool quality** | Community-built, inconsistent | Purpose-built, integrated |
| **Sandbox** | Often none (runs on user's machine) | Isolated, secure VM |
| **UI** | Developer-focused | Consumer and professional |
| **Deployment** | Self-hosted | Fully managed |
| **Skill system** | Limited | Extensive modular skill library |
| **Support** | Community | Professional |

### 13.6 The Unique Position

Manus's unique position is at the intersection of:
- **Breadth** of a general-purpose computer (can do anything a computer can do)
- **Intelligence** of a frontier language model (can reason, plan, and adapt)
- **Reliability** of a production software system (error handling, checkpoints, rollback)
- **Accessibility** of a consumer product (natural language interface, no setup)

No other system currently occupies all four of these dimensions simultaneously.

---

## Chapter 14: Best Practices for Working with Manus

### 14.1 Goal Formulation

The quality of Manus's output is directly correlated with the clarity and completeness of the goal statement. Best practices:

**Be specific about the output format.** "Write a report" is less effective than "Write a 5-page PDF report with an executive summary, three analysis sections, a data table, and a conclusion." Manus will make reasonable assumptions about unspecified details, but explicit specifications produce better results.

**Specify the audience.** "Write a technical explanation of transformer attention" produces different output than "Write a plain-language explanation of transformer attention for a business executive." Audience specification affects vocabulary, depth, and framing.

**Provide context.** If the task relates to an existing project, share the relevant files or context at the start of the session. Manus cannot access previous sessions, so any relevant background must be provided explicitly.

**State constraints.** If there are things Manus should not do (use certain tools, include certain content, exceed a certain length), state them explicitly. Manus will respect explicit constraints.

### 14.2 Iterative Refinement

Manus is designed for iterative refinement. After receiving an initial output:

- Ask for specific changes: "Make the executive summary shorter and more direct."
- Request additions: "Add a section on regulatory risks."
- Change the approach: "Redo the chart as a horizontal bar chart instead of a pie chart."
- Ask for alternatives: "Show me three different color schemes for the dashboard."

Each refinement request is treated as a new task within the same session, with full access to all previous work.

### 14.3 Providing Reference Material

Manus can work from reference material you provide:

- **Documents:** Share PDFs, Word files, or text files and ask Manus to analyze, summarize, or build on them
- **Data files:** Share CSV, Excel, or JSON files for analysis
- **Images:** Share images for reference, analysis, or as starting points for editing
- **Code:** Share existing codebases for review, extension, or refactoring
- **URLs:** Provide URLs for Manus to navigate and extract information from

### 14.4 Long-Running Projects

For projects that span multiple sessions:

1. Ask Manus to produce a "project handoff document" at the end of each session — a summary of what was done, what decisions were made, what files were created, and what remains to do
2. Start the next session by sharing this handoff document
3. Use GitHub integration to maintain code across sessions
4. For web projects, use checkpoints to preserve state

### 14.5 Quality Assurance

For high-stakes outputs:

- Ask Manus to review its own work: "Review this document for factual accuracy, logical consistency, and completeness."
- Request the convergence loop: "Recursively improve this until 3 passes confirm no further improvements."
- Ask for expert-perspective review: "Review this from the perspective of a senior software engineer and identify any issues."
- Verify citations: Manus cites sources, but users should verify critical claims independently.

### 14.6 Effective Use of Scheduling

For recurring tasks:
- Provide a detailed description of exactly what you want done each time
- Include any context that will be needed (data sources, output formats, recipients)
- Test the task manually first before scheduling it
- Use the `playbook` parameter to encode the process for consistent future execution

### 14.7 When to Use Parallel Processing

The `map` tool is most effective when:
- The task involves the same operation on many independent items (50+)
- Each item can be processed without knowledge of other items
- The output schema is consistent across all items
- Speed is important (parallel processing can be 10–100x faster than sequential)

It is less effective when:
- Items have dependencies on each other
- The output schema varies significantly between items
- The task requires synthesis across all items (do that in the main task after collection)

---

## Chapter 15: The Skill System and Extensibility

### 15.1 What Skills Are

Skills are modular knowledge extensions stored as directories in `/home/ubuntu/skills/`. Each skill contains a `SKILL.md` file with instructions, metadata, and optionally scripts, templates, and other resources. Skills encode domain-specific knowledge that goes beyond the base system prompt — the kind of expertise that would take a human specialist years to develop.

Skills are not plugins that add new tools. They are knowledge modules that improve the quality of Manus's work in specific domains by providing:
- Specific workflows to follow
- Libraries and tools to use (and avoid)
- Quality standards and formatting conventions
- Domain-specific best practices
- Templates and boilerplate

### 15.2 The Complete Skill Library

| Skill | Domain | What It Does |
|-------|--------|-------------|
| `scientific-visualization` | Data Science | Publication-ready figures for Nature/Science/Cell journals |
| `market-research-reports` | Business | 50+ page consulting-style market research reports |
| `stock-analysis` | Finance | Comprehensive stock and company research |
| `writing-plans` | Planning | Spec-to-plan conversion for multi-step tasks |
| `internal-comms` | Communications | Status reports, newsletters, incident reports |
| `web-design-guidelines` | Design | UI audit for accessibility and best practices |
| `vercel-react-best-practices` | Engineering | React/Next.js performance optimization |
| `tapestry` | Content | Extract and action-plan any URL or document |
| `invoice-organizer` | Finance | Automated invoice organization for tax prep |
| `deep-research` | Research | Google Gemini Deep Research Agent integration |
| `tailored-resume-generator` | Career | Job-description-tailored resume generation |
| `slack-gif-creator` | Media | Animated GIFs optimized for Slack |
| `statistical-analysis` | Data Science | Test selection, assumption checking, APA reporting |
| `gws-best-practices` | Productivity | Google Workspace CLI best practices |
| `excel-generator` | Productivity | Professional Excel workbook creation |
| `meeting-insights-analyzer` | Productivity | Meeting transcript behavioral analysis |
| `video-generator` | Media | Professional AI video production workflow |
| `csv-data-summarizer` | Data Science | Automated CSV analysis and visualization |
| `exploratory-data-analysis` | Data Science | 200+ scientific file format analysis |
| `internet-skill-finder` | Meta | Find new skills from GitHub repositories |
| `postgres` | Engineering | Read-only PostgreSQL query execution |
| `brainstorming` | Design | Creative ideation before implementation |
| `skill-creator` | Meta | Guide for creating and updating skills |
| `frontend-design` | Design | Production-grade frontend interface creation |
| `pdf` | Documents | Complete PDF manipulation toolkit |
| `research-lookup` | Research | Perplexity Sonar Pro research integration |
| `docx` | Documents | Word document creation and manipulation |
| `lead-research-assistant` | Sales | High-quality lead identification and research |
| `similarweb-analytics` | Analytics | Website traffic and engagement analysis |
| `pptx` | Presentations | PowerPoint file creation and manipulation |
| `webapp-testing` | Engineering | Playwright-based web application testing |
| `content-research-writer` | Writing | Research-grounded content writing |
| `bgm-prompter` | Music | Background music prompt crafting framework |
| `screenshot-annotator` | Design | Screenshot annotation with callouts and labels |
| `github-gem-seeker` | Engineering | GitHub open-source solution discovery |
| `xlsx` | Productivity | Spreadsheet file operations |
| `canvas-design` | Design | Visual art and poster creation |

### 15.3 How Manus Selects Skills

Before undertaking a task, Manus reads the skill list and identifies which skills are relevant based on their descriptions. It then reads the `SKILL.md` file for each relevant skill and follows its instructions. This happens before the task plan is created, ensuring that skill-specific workflows are incorporated from the start.

### 15.4 Creating New Skills

The `skill-creator` skill provides a guide for creating new skills. A skill is created by:
1. Creating a directory at `/home/ubuntu/skills/{skill-name}/`
2. Writing a `SKILL.md` file with instructions, metadata, and use cases
3. Optionally adding scripts, templates, and other resources

New skills can encode any domain knowledge — from company-specific style guides to specialized technical workflows to proprietary data sources.

### 15.5 The Internet Skill Finder

The `internet-skill-finder` skill searches GitHub for battle-tested solutions and can recommend new skills for specific tasks. This is particularly useful for finding open-source tools for format conversion, media downloading, file manipulation, web scraping, and automation.

### 15.6 Extensibility Beyond Skills

Beyond the skill system, Manus can be extended through:

- **MCP servers:** External tools and services that expose Model Context Protocol interfaces
- **Custom secrets:** API keys and credentials for third-party services (stored securely in the web project settings)
- **npm packages:** Any Node.js package can be installed and used in web projects
- **pip packages:** Any Python package can be installed and used in scripts
- **apt packages:** Any Ubuntu package can be installed in the sandbox

This means Manus's capabilities are not fixed — they can be extended to include any tool or service that has a programmatic interface.

---
