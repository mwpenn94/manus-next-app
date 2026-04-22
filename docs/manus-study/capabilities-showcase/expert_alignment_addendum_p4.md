---

# ALIGNMENT ADDENDUM PASS 4: Remaining Specialist Capabilities

---

## Expert Review Supplement 2.28: Screenshot Annotation

### Design and Engineering Perspective

The `screenshot-annotator` skill provides a capability that sits at the intersection of design and engineering: the ability to annotate screenshots with precision and professional quality. The skill supports arrows, boxes, circles, numbered callouts, text labels, highlights, and redactions — the full vocabulary of visual annotation used in bug reports, tutorials, documentation, and marketing materials.

The technical implementation uses Pillow (PIL) for image manipulation, with a coordinate-based annotation system that allows precise placement of elements. The skill also supports drop shadow framing — adding a professional shadow and background to screenshots for use in presentations and marketing materials.

From a product documentation perspective, screenshot annotation is a force multiplier: a single annotated screenshot can communicate what would otherwise require several paragraphs of text. The numbered callout system is particularly effective for step-by-step tutorials, where each step corresponds to a numbered annotation on the screenshot.

The redaction capability is valuable for compliance and privacy workflows: sensitive information (API keys, personal data, internal URLs) can be redacted from screenshots before sharing, without requiring a separate image editing tool.

---

## Expert Review Supplement 2.29: Lead Research and Business Intelligence

### Business Development Perspective

The `lead-research-assistant` skill addresses one of the most time-consuming activities in business development: identifying high-quality leads and researching their contact information. The skill analyzes the user's business, identifies target companies matching the ideal customer profile, and provides actionable contact strategies.

The skill combines multiple research techniques: web search for company information, LinkedIn profile analysis for contact identification, company website analysis for technology stack and business model, and news search for recent events (funding rounds, product launches, leadership changes) that create sales opportunities.

From a sales operations perspective, the skill's output is designed to be immediately actionable: it provides not just a list of companies but a prioritized list with specific contact names, roles, and recommended outreach approaches tailored to each company's situation.

The `similarweb-analytics` skill complements lead research by providing traffic intelligence on target companies' websites — enabling sales teams to understand a prospect's digital footprint, traffic sources, and audience demographics before the first conversation.

---

## Expert Review Supplement 2.30: Financial Research and Stock Analysis

### Finance Perspective

The `stock-analysis` skill provides a comprehensive financial research capability that goes beyond simple stock price lookup. It accesses company profiles, technical insights, price charts, insider holdings, and SEC filings — the full set of information a professional equity analyst would use for initial due diligence.

The skill's integration with SEC filings is particularly valuable: 10-K and 10-Q filings contain detailed information about a company's business model, competitive position, risk factors, and financial performance that is not available in aggregated financial data sources. The ability to read and analyze these filings directly enables a level of research depth that was previously only accessible to professional analysts with Bloomberg terminals.

From an investment research perspective, the skill enables rapid initial screening: a user can research 10–20 companies in the time it would previously take to research one, enabling broader coverage of investment universes and faster identification of opportunities.

---

## Expert Review Supplement 2.31: Fine-Tuning and Model Customization Boundaries

### AI/ML Research Perspective

The reference document's treatment of fine-tuning reflects an important boundary in Manus's current capability set. Manus does not support fine-tuning the underlying language models — it cannot train custom models on user data, adjust model weights, or create persistent model adaptations.

This is a deliberate architectural choice with significant implications. Fine-tuning requires access to model weights, training infrastructure, and evaluation pipelines that are not part of Manus's current architecture. The skill system provides a form of "soft customization" — domain-specific instructions and workflows that adapt Manus's behavior without modifying model weights — but this is not equivalent to fine-tuning.

For enterprise use cases that require model customization (e.g., a legal firm wanting a model trained on their specific document formats, or a medical organization wanting a model calibrated to their clinical vocabulary), Manus is not the appropriate tool. These use cases require dedicated MLOps infrastructure.

The practical implication is that Manus's behavior is consistent across users and sessions — it does not learn from individual interactions or accumulate user-specific knowledge across sessions. Each session starts fresh. This is both a limitation (no personalization) and a feature (no data leakage between users, predictable behavior).

---

## Expert Review Supplement 2.32: SEO and Discoverability

### Product and Marketing Perspective

The reference document's treatment of SEO reflects the correct baseline for web applications built with Manus. The key SEO elements that Manus implements by default include semantic HTML structure (proper heading hierarchy, landmark elements), meta tag generation (title, description, Open Graph), canonical URL handling, and sitemap generation for multi-page applications.

The Core Web Vitals alignment (LCP, INP, CLS) is particularly important because Google uses these metrics as ranking signals. Manus's default optimizations — image lazy loading, code splitting, font preloading, explicit image dimensions — directly improve these metrics.

For content-heavy applications, the `content-research-writer` skill provides SEO-aware content creation: it researches target keywords, structures content for featured snippets, and ensures proper internal linking. This is the correct approach for applications where organic search traffic is a primary acquisition channel.

The honest limitation is that Manus does not currently provide automated SEO auditing or ongoing monitoring. Users who need continuous SEO performance tracking should integrate a dedicated SEO tool (Ahrefs, SEMrush, Google Search Console) with their deployed application.

---

## Expert Review Supplement 2.33: Comprehensive FAQ

### All Audiences

**Q: Can Manus access the internet?**
Yes. Manus has full internet access via the `browser` tool (for navigating websites) and the `search` tool (for structured searches across web, news, images, APIs, data, and research). It can navigate to any public URL, read page content, fill forms, and interact with web applications.

**Q: Can Manus access my files?**
Manus can access files you upload to the session. It cannot access files on your local computer without you uploading them first. Within a session, all files are stored in the sandbox filesystem at `/home/ubuntu/`.

**Q: Does Manus remember previous sessions?**
No. Each session starts fresh. Manus does not retain memory of previous conversations, files, or preferences across sessions. Within a session, all context is preserved.

**Q: Can Manus run code?**
Yes. Manus can write and execute Python, Node.js, Bash, and other languages in the sandbox. It can install packages, run scripts, and use the results to inform subsequent actions.

**Q: How long can a session last?**
Sessions can run for hours. The sandbox persists across hibernation cycles, so long-running tasks (research, video production, complex web apps) can be completed across multiple active periods.

**Q: Can Manus deploy applications?**
Yes, for web applications built with `webdev_init_project`. Deployed applications are accessible at a public URL (e.g., `yourapp.manus.space`) immediately after clicking the Publish button in the Management UI. Custom domains can be configured in the Settings panel.

**Q: Is my data private?**
Each user's sandbox is isolated — Manus cannot access other users' data. Files and code in your sandbox are not shared with other users. The untrusted content rule prevents Manus from executing instructions found in external content (websites, files, emails) without your explicit endorsement.

**Q: Can Manus work with my existing codebase?**
Yes. You can provide a GitHub repository URL and Manus will clone it, read the code, and make changes. The `gh` CLI is pre-installed and authenticated for GitHub operations.

**Q: What languages does Manus support?**
Manus defaults to the language of the user's first message. It can work in English, Chinese, Spanish, French, German, Japanese, Korean, Portuguese, Arabic, and many other languages. All tool outputs and generated content will be in the working language.

**Q: What are Manus's main limitations?**
The primary limitations are: no cross-session memory, no fine-tuning of underlying models, no HIPAA certification, no SAML/SSO support (enterprise gap), video generation is limited to short clips (4–8 seconds per generation), and music generation is limited to ~184 seconds per generation. The reference document's Chapter 12 provides a complete honest assessment of all limitations.

---

---

## Expert Review Supplement 2.34: Multi-Language Support

### Product and Localization Perspective

Manus's multi-language capability is a first-class feature, not an afterthought. The working language is determined by the language of the user's first message and maintained consistently throughout the session: all tool invocations, generated content, document text, code comments, and responses are produced in that language.

The supported language set covers all major world languages including English, Simplified Chinese, Traditional Chinese, Spanish, French, German, Japanese, Korean, Portuguese, Arabic, Russian, Italian, Dutch, Polish, Turkish, Vietnamese, Thai, Indonesian, and Hindi. For languages with right-to-left text direction (Arabic, Hebrew), the generated documents and web applications use appropriate RTL layout conventions.

Multi-language search is handled by including at least one English query variant in every search, since English-language sources provide the broadest coverage for most research topics. This ensures that non-English users receive the same quality of research results as English users, with the results translated and synthesized in their working language.

For web applications, the `i18n` (internationalization) framework enables runtime language switching — users can build applications that serve multiple language markets from a single codebase. The `l10n` (localization) layer handles date formats, number formats, currency symbols, and other locale-specific conventions.

The screenshot-annotator skill's text labels are rendered in the working language, ensuring that annotated screenshots in non-English workflows have properly localized callout text.

---

---

## Expert Review Supplement 2.35: Web Application Technical Stack — Deep Dive

### Engineering Perspective

The Manus web application stack is a carefully curated set of libraries that balance developer experience, performance, and production readiness. Three components deserve specific attention because they are foundational to the architecture but often overlooked in high-level capability descriptions.

**Wouter** is the client-side routing library used in Manus web applications. Unlike React Router, Wouter is a minimalist routing solution (~1.5KB gzipped) that provides the essential routing primitives — `<Route>`, `<Switch>`, `<Link>`, and the `useLocation`/`useRoute` hooks — without the complexity of a full navigation framework. This choice reflects a deliberate optimization: web applications built with Manus are typically single-page applications with simple routing requirements, and Wouter's minimal footprint reduces bundle size without sacrificing functionality.

**Radix UI** (via shadcn/ui) provides the accessible, unstyled primitive components that underpin the entire UI component system. Radix's WAI-ARIA compliance ensures that all interactive components (dialogs, dropdowns, tooltips, accordions, tabs) meet accessibility standards without requiring manual ARIA attribute management. The unstyled nature of Radix primitives means that all visual styling is applied via Tailwind CSS, maintaining full design flexibility while guaranteeing accessibility compliance. This is the correct architecture for production web applications: separate the interaction behavior (Radix) from the visual presentation (Tailwind).

**Zod** provides runtime type validation for form data, API responses, and configuration objects. In a TypeScript codebase, Zod bridges the gap between compile-time type safety (TypeScript's static analysis) and runtime type safety (validating data from external sources like APIs and user input). The `react-hook-form` + Zod combination is the production-standard approach for form validation in React applications: react-hook-form manages form state and submission, while Zod schemas define the validation rules and provide type inference for the form data.

Together, these three libraries — Wouter, Radix UI, and Zod — represent the correct choices for their respective responsibilities in a production React application. Their selection reflects engineering judgment, not just convenience.

---

---

## Expert Review Supplement 2.36: The Complete Skill Catalog — Expert Analysis

### Product and Engineering Perspective

The Manus skill system comprises 40+ modular capabilities organized into functional domains. Each skill is a self-contained directory with a `SKILL.md` file that provides instructions, metadata, and optional resources. Understanding the full skill catalog is essential for enterprise deployment planning, as the skills collectively define the boundaries of what Manus can accomplish without custom development.

**Document Generation Skills**

The `pdf` skill provides comprehensive PDF operations: reading and extracting text, merging multiple PDFs, splitting documents, rotating pages, adding watermarks, creating new PDFs from scratch, filling forms, encrypting and decrypting, extracting embedded images, and OCR on scanned documents. This covers the full lifecycle of PDF document management.

The `docx` skill handles the complete Word document workflow: creating new documents with professional formatting (tables of contents, headings, page numbers, letterheads), reading and extracting content from existing documents, inserting and replacing images, performing find-and-replace operations, working with tracked changes and comments, and converting content into polished Word documents.

The `xlsx` skill manages spreadsheet operations across `.xlsx`, `.xlsm`, `.csv`, and `.tsv` formats: opening and reading existing files, adding columns and computing formulas, formatting and charting, cleaning messy data, and converting between tabular formats. The `excel-generator` skill specializes in aesthetically polished Excel workbooks with professional formatting, conditional formatting, and data analysis features.

The `pptx` skill handles PowerPoint files bidirectionally: creating new slide decks, reading and extracting text from existing presentations, editing and modifying slides, combining or splitting files, and working with templates, layouts, speaker notes, and comments.

**Research and Intelligence Skills**

The `deep-research` skill executes autonomous multi-step research using Google Gemini Deep Research Agent. It is designed for tasks requiring comprehensive coverage across multiple sources: market analysis, competitive landscaping, literature reviews, technical research, and due diligence. Each invocation takes 2–10 minutes but produces detailed, cited reports with depth that exceeds what is achievable through manual search.

The `research-lookup` skill provides access to Perplexity's Sonar Pro Search and Sonar Reasoning Pro models for current research information with citations. It automatically selects the appropriate model based on query complexity and is optimized for academic papers, recent studies, technical documentation, and general research.

The `market-research-reports` skill generates comprehensive market research reports (50+ pages) in the style of top consulting firms (McKinsey, BCG, Gartner). It uses professional LaTeX formatting, extensive visual generation, deep research integration, and multi-framework strategic analysis including Porter Five Forces, PESTLE, SWOT, TAM/SAM/SOM, and BCG Matrix.

The `lead-research-assistant` skill identifies high-quality leads by analyzing the user's business, searching for target companies, and providing actionable contact strategies — designed for sales, business development, and marketing professionals.

The `stock-analysis` skill provides comprehensive financial research: company profiles, technical insights, price charts, insider holdings, and SEC filings.

The `similarweb-analytics` skill analyzes websites using SimilarWeb traffic data: traffic metrics, engagement statistics, global rankings, traffic sources, and geographic distribution.

**Data and Analysis Skills**

The `scientific-visualization` skill produces publication-ready figures for journal submissions: multi-panel layouts, significance annotations, error bars, colorblind-safe palettes, and specific journal formatting (Nature, Science, Cell).

The `statistical-analysis` skill provides guided statistical analysis with test selection and reporting: choosing appropriate tests, assumption checking, power analysis, and APA-formatted results — designed for academic research reporting.

The `exploratory-data-analysis` skill performs comprehensive EDA on scientific data files across 200+ file formats: chemistry, bioinformatics, microscopy, spectroscopy, proteomics, metabolomics, and general scientific data. It generates detailed markdown reports with format-specific analysis, quality metrics, and downstream analysis recommendations.

The `csv-data-summarizer` skill analyzes CSV files, generates summary statistics, and produces quick visualizations using Python and pandas.

**Creative and Design Skills**

The `canvas-design` skill creates beautiful visual art in PNG and PDF formats using design philosophy: posters, artwork, designs, and other static visual pieces. It generates original visual designs without copying existing artists' work.

The `frontend-design` skill creates distinctive, production-grade frontend interfaces: websites, landing pages, dashboards, React components, HTML/CSS layouts, and any web UI that requires high design quality.

The `slack-gif-creator` skill creates animated GIFs optimized for Slack: respecting Slack's size and format constraints, providing validation tools, and generating animation concepts.

The `screenshot-annotator` skill annotates screenshots with arrows, boxes, circles, numbered callouts, text labels, highlights, and redactions, then optionally frames them with drop shadows.

**Content and Communication Skills**

The `content-research-writer` skill assists in writing high-quality content: conducting research, adding citations, improving hooks, iterating on outlines, and providing real-time feedback on each section.

The `internal-comms` skill provides resources for writing internal communications: status reports, leadership updates, company newsletters, FAQs, incident reports, and project updates.

The `tailored-resume-generator` skill analyzes job descriptions and generates tailored resumes that highlight relevant experience, skills, and achievements.

The `meeting-insights-analyzer` skill analyzes meeting transcripts and recordings to uncover behavioral patterns, communication insights, and actionable feedback.

The `writing-plans` skill is used before multi-step writing tasks to create structured plans from specifications or requirements.

**Development and Infrastructure Skills**

The `webapp-testing` skill provides Playwright-based testing for local web applications: verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.

The `vercel-react-best-practices` skill provides React and Next.js performance optimization guidelines: optimal performance patterns for components, data fetching, bundle optimization, and performance improvements.

The `web-design-guidelines` skill reviews UI code for compliance with Web Interface Guidelines: accessibility, design auditing, and UX best practices.

The `gws-best-practices` skill provides best practices for using the `gws` CLI with Google Workspace services: Drive, Docs, Sheets, and Slides.

The `postgres` skill executes read-only SQL queries against multiple PostgreSQL databases: exploring schemas, running SELECT queries for data analysis, and checking database contents.

**Meta-Skills**

The `brainstorming` skill is used before any creative work — creating features, building components, adding functionality — to explore user intent, requirements, and design before implementation.

The `skill-creator` skill guides the creation or updating of new skills: extending Manus via specialized knowledge, workflows, or tool integrations.

The `internet-skill-finder` skill searches and recommends Agent Skills from verified GitHub repositories for specific tasks, domains, or workflows.

The `github-gem-seeker` skill searches GitHub for battle-tested solutions: format conversion, media downloading, file manipulation, web scraping, automation scripts, and CLI tools.

The `tapestry` skill provides unified content extraction and action planning from URLs: YouTube videos, articles, and PDFs — automatically detecting content type and processing accordingly.

The `bgm-prompter` skill provides a prompt crafting framework for music generation tasks: structure syntax, multi-clip strategy, and music generation best practices.

The `invoice-organizer` skill automatically organizes invoices and receipts for tax preparation: reading files, extracting key information, renaming consistently, and sorting into logical folders.

---

---

## Expert Review Supplement 2.37: Shell Tool and Port Exposure — Infrastructure Perspective

### DevOps and Engineering Perspective

Two infrastructure-level tools deserve explicit documentation because they underpin much of Manus's execution capability but are rarely discussed as first-class features.

**The Shell Tool** is the foundational execution primitive that gives Manus access to the full Ubuntu 22.04 command-line environment. It supports five actions: `exec` (run a command in a named session), `view` (inspect session history and output), `wait` (block until a long-running process completes), `send` (pipe input to an interactive process), and `kill` (terminate a running process). The shell tool is how Manus runs Python scripts, Node.js programs, ffmpeg pipelines, D2 diagram rendering, PDF conversion, package installation, git operations, and any other command-line operation. It maintains persistent named sessions, meaning a `cd` command in one invocation persists to the next invocation in the same session. This stateful session model is essential for multi-step workflows where the working directory and environment variables must be consistent across many commands.

The shell tool's `send` action enables interaction with interactive processes — for example, sending `y\n` to confirm a package installation prompt, or sending keystrokes to a running terminal application. This capability means Manus can interact with any command-line tool, including those that do not support non-interactive flags.

**The Expose Port Tool** provides temporary public access to services running inside the sandbox. When Manus starts a web server (for example, a Vite development server on port 3000, or a FastAPI server on port 8000), the `expose` tool creates a public proxied domain that routes external HTTP traffic to that port. This enables the user to preview a running web application in their browser without any deployment step. The exposed URL encodes the port number in the domain prefix and remains active as long as the sandbox session is running. This is how the interactive web dashboard in this showcase was made accessible — the Vite dev server was started on port 3000, and the expose tool created the public preview URL that appears in the web app deliverable.

The combination of the shell tool and the expose tool creates a complete local development environment with public preview capability — equivalent to having a cloud-hosted development environment (like GitHub Codespaces or Gitpod) built directly into the agent.

---

---

## Expert Review Supplement 2.38: Server Management and Sandbox Health

### DevOps and Infrastructure Perspective

Two operational tools complete the web development and infrastructure capability set.

**`webdev_restart_server`** restarts the sandbox-managed development server and any dependent services. It is invoked when the development server becomes unresponsive, when environment variables or framework configuration change in ways that require a full reload, or when `webdev_check_status` reports degraded or stopped services. The tool clears stale caches and build artifacts when the sandbox reports issues during restart, and refreshes stored project metadata with updated ports, paths, and service statuses. In practice, `webdev_restart_server` is most commonly needed after running `pnpm add` to install new dependencies, since the Vite development server must be restarted to pick up new packages.

**The `uptime` command** is the standard mechanism for explicitly waking up the sandbox after a period of inactivity. The Manus sandbox automatically hibernates when inactive and resumes when needed — but if a user explicitly requests a sandbox status check or wants to confirm the environment is responsive, `uptime` provides an immediate, low-overhead confirmation. The sandbox lifecycle is transparent to the user: state, installed packages, and running processes persist across hibernation cycles, so no re-initialization is needed after the sandbox resumes.

Together, `webdev_restart_server` and the `uptime` command represent the operational health management layer of the Manus platform — the tools that ensure the execution environment remains responsive and correctly configured throughout long-running development sessions.

---

---

## Expert Review Supplement 2.39: Presentation Structure Management and Toast Notifications

### Engineering and Product Perspective

**`slide_organize`** is the tool used to modify the structure of an existing presentation project — adding new slides, deleting slides, reordering slides, or splitting a single slide into two. It is distinct from `slide_edit` (which modifies the content of an existing slide) and `slide_initialize` (which creates a new presentation from scratch). The correct workflow is: use `slide_initialize` once to create the project and its initial outline, then use `slide_organize` for any subsequent structural changes (adding, removing, or reordering slides), and use `slide_edit` for content changes. This separation of concerns — structure vs. content — is a deliberate design choice that prevents the common mistake of re-running `slide_initialize` to reorder slides, which would destroy all existing content.

**Sonner** is the toast notification library used in Manus web applications. It provides a minimal, accessible, and visually polished notification system that displays temporary messages (toasts) in response to user actions — for example, "Feature coming soon" when a placeholder navigation item is clicked, or "Saved successfully" after a form submission. Sonner is the correct choice over alternatives like `react-toastify` or `@radix-ui/react-toast` because it integrates natively with the shadcn/ui component system, supports promise-based toasts (showing loading → success/error states), and has a minimal API surface. In the Manus web application template, Sonner is pre-configured via the `<Toaster />` component in `App.tsx` and invoked with `toast()` from the `sonner` package.

---

> **Support Policy Note:** For questions about billing, credits, refunds, or technical support, users are directed to [help.manus.im](https://help.manus.im). Manus does not process billing or support requests within the agent interface itself.
