---

# PASS 2 ADDENDUM: Additional Topics Identified in Second Audit

---

## Chapter 24: Full-Stack Web Development — The Complete Architecture

### 24.1 The Two Tiers of Web Development

Manus supports two distinct tiers of web project, each with different capabilities:

**Tier 1 — Static Frontend (`web-static`):** A pure React 19 + TypeScript + Tailwind CSS 4 application with no backend. Suitable for marketing sites, dashboards consuming public APIs, interactive tools, and any application that does not require server-side logic, authentication, or a database. Deployed as a static site with CDN delivery.

**Tier 2 — Full-Stack (`web-db-user`):** Extends the static frontend with an Express.js backend, PostgreSQL database, and Manus OAuth user authentication. Suitable for SaaS applications, internal tools, data management systems, and any application requiring user accounts, persistent data, or server-side logic.

The upgrade from Tier 1 to Tier 2 is performed with a single `webdev_add_feature` call and adds:
- A PostgreSQL database with automatic schema migration
- Manus OAuth for user registration, login, and session management
- An Express.js API server with type-safe routes
- tRPC for end-to-end type-safe API calls
- S3 file storage integration
- LLM API access (for AI-powered features within the app)
- Whisper speech-to-text API access
- AI image generation API access
- Push notification support

### 24.2 Stripe Payment Integration

Manus can add Stripe payment processing to any web project with `webdev_add_feature(feature="stripe")`. This sets up:
- Stripe SDK configuration with environment variable management
- Checkout session creation for one-time payments
- Subscription management for recurring billing
- Webhook handling for payment events
- Customer portal for subscription management

### 24.3 The Database Architecture

Full-stack projects use PostgreSQL with a schema managed through migrations. Manus can:
- Design and create database schemas
- Write and run migrations
- Implement CRUD operations with type-safe queries
- Set up relationships, indexes, and constraints
- Seed databases with initial data
- Query and analyze database contents via the Management UI's Database panel

The Management UI's Database panel provides a full CRUD interface for direct data management without writing SQL, and exposes connection information for external database clients (with SSL required).

### 24.4 Authentication Architecture

The Manus OAuth system provides:
- User registration and login via the Manus OAuth portal
- JWT-based session management
- Role-based access control
- Protected routes and API endpoints
- User profile management

This means Manus-built applications can have real user accounts without requiring the developer to implement authentication from scratch.

### 24.5 Analytics

All published Manus web projects automatically include privacy-friendly analytics via Umami. The Dashboard panel in the Management UI shows:
- Unique visitors (UV) over time
- Page views (PV) over time
- Traffic sources
- Geographic distribution
- Device and browser breakdown

No additional configuration is required — analytics are enabled automatically on publish.

### 24.6 Push Notifications

Full-stack projects can send push notifications to users who have granted permission. This enables:
- Real-time alerts for application events
- Scheduled notification campaigns
- User re-engagement workflows

---

## Chapter 25: MCP (Model Context Protocol) Integration

### 25.1 What MCP Is

The **Model Context Protocol (MCP)** is an open standard for connecting AI agents to external tools and services. It defines a standardized interface that any service can implement to expose its capabilities to AI agents. Manus can interact with MCP servers via the `manus-mcp-cli` command-line utility.

### 25.2 What MCP Enables

MCP integration allows Manus to:
- Connect to any service that exposes an MCP interface
- Use tools and data sources that are not built into Manus natively
- Integrate with enterprise systems (CRM, ERP, HR platforms) that have MCP adapters
- Access proprietary data sources and internal APIs

### 25.3 The Growing MCP Ecosystem

The MCP ecosystem is growing rapidly. As of 2026, hundreds of services have published MCP servers, including:
- Database connectors (PostgreSQL, MySQL, MongoDB, Snowflake)
- Cloud storage (AWS S3, Google Cloud Storage, Azure Blob)
- Productivity tools (Notion, Airtable, Confluence)
- Communication platforms (Slack, Teams, Discord)
- Development tools (GitHub, Jira, Linear)
- Business intelligence tools (Tableau, Looker, Metabase)

### 25.4 Custom MCP Servers

Organizations can build custom MCP servers to expose their proprietary systems to Manus. This enables Manus to work directly with internal data sources, APIs, and tools without requiring custom integration code for each task.

---

## Chapter 26: The Visual Editor

### 26.1 What the Visual Editor Is

The Management UI's Preview panel includes a **visual editor** that allows direct manipulation of any element in a deployed web project without writing code. Users can:
- Select any element on the page
- Adjust colors, borders, layout, padding, and typography in real-time
- Describe a change in natural language and have it applied automatically
- Preview changes before committing them

### 26.2 How Changes Are Applied

Visual editor changes create a new checkpoint automatically. This means:
- Every visual change is versioned
- Changes can be rolled back instantly
- The code is updated to reflect the visual change
- The change is preserved across future Manus edits

### 26.3 The Collaboration Model

The visual editor enables a collaborative workflow between Manus and the user:
1. Manus builds the initial application
2. The user makes visual refinements via the editor
3. Manus continues development, preserving the user's visual changes
4. The user can make further visual adjustments at any time

This is a fundamentally different model from traditional development, where visual changes require code modifications and re-deployment.

---

## Chapter 27: The Notification and Secrets Systems

### 27.1 The Notification System

Full-stack projects have access to a built-in notification API that enables:
- In-app notifications for user events
- Email notifications (via configured SMTP)
- Push notifications to subscribed browsers
- Webhook notifications to external services

Notification settings are managed in the Management UI's Settings → Notifications panel.

### 27.2 The Secrets System

The Secrets panel in Management UI Settings allows secure storage of environment variables and API keys. This enables:
- Third-party API integration (OpenAI, Stripe, Twilio, SendGrid, etc.)
- Database credentials for external databases
- OAuth credentials for third-party authentication providers
- Any sensitive configuration that should not be hardcoded

Secrets are injected as environment variables at runtime and are never exposed in the codebase or to other users.

### 27.3 Built-In Secrets

Manus automatically injects several built-in secrets into every web project:
- `BUILT_IN_FORGE_API_KEY` and `BUILT_IN_FORGE_API_URL`: Access to Manus's built-in LLM API
- `VITE_FRONTEND_FORGE_API_KEY` and `VITE_FRONTEND_FORGE_API_URL`: Frontend-accessible LLM API
- `JWT_SECRET`: For JWT token signing
- `OAUTH_SERVER_URL` and `VITE_OAUTH_PORTAL_URL`: For Manus OAuth integration
- `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID`: For Umami analytics
- `VITE_APP_ID`, `VITE_APP_LOGO`, `VITE_APP_TITLE`: App identity variables

---

## Chapter 28: Capability Decision Tree

This chapter provides a practical decision tree for selecting the right Manus capability for a given task.

### 28.1 "I need information or analysis"

```
Do you need current, real-world information?
├── Yes → Use search + browser tools (Deep Research workflow)
│   ├── Academic/technical → Use research-lookup skill (Perplexity Sonar Pro)
│   ├── Market/business → Use market-research-reports skill
│   └── General → Use search tool with multiple query variants
└── No → Manus can work from its training knowledge
    └── For structured analysis → Use data_analysis capability
```

### 28.2 "I need a document"

```
What format?
├── PDF → Write in Markdown, convert with manus-md-to-pdf
├── Word (.docx) → Use docx skill
├── Excel (.xlsx) → Use excel-generator or xlsx skill
├── Presentation → Use slide_initialize (html or image mode)
└── Web page → Use web development tools
```

### 28.3 "I need media"

```
What type?
├── Image (new) → generate_image tool
├── Image (edit existing) → generate_image_variation tool
├── Video → generate_video tool (+ ffmpeg for composition)
├── Audio narration → generate_speech tool
├── Music → generate_music tool
├── Diagram → manus-render-diagram (D2 or Mermaid)
└── Chart/visualization → Python matplotlib/seaborn/plotly
```

### 28.4 "I need software"

```
What type?
├── Web application
│   ├── Frontend only → webdev_init_project (web-static)
│   └── Full-stack (auth + database) → webdev_init_project + webdev_add_feature(web-db-user)
├── Script or automation → Python or Node.js via shell tool
├── Data pipeline → Python pandas/SQLAlchemy via shell tool
└── CLI tool → Python or Bash script
```

### 28.5 "I need to automate something"

```
How often?
├── Once → Standard task execution
├── Recurring → schedule tool (cron or interval)
└── On many items simultaneously → map tool (parallel processing)
```

### 28.6 "I need to process existing files"

```
What type?
├── PDF → pdf skill (extract, merge, split, annotate, OCR)
├── Word (.docx) → docx skill
├── Excel (.xlsx) → xlsx skill
├── Images → generate_image_variation (AI edit) or Python PIL (programmatic)
├── Audio/video → ffmpeg via shell, manus-speech-to-text
├── CSV/data → Python pandas, csv-data-summarizer skill
└── Code → Read with file tool, analyze, refactor, test
```

---

## Chapter 29: Performance Characteristics

### 29.1 Typical Task Durations

| Task Type | Typical Duration | Notes |
|-----------|-----------------|-------|
| Simple document (1-3 pages) | 2–5 minutes | Research + writing |
| Data analysis + chart | 3–8 minutes | Includes Python execution |
| AI image generation (single) | 1–3 minutes | Depends on complexity |
| AI image generation (batch of 5) | 2–4 minutes | Parallel generation |
| Web app (static, simple) | 10–20 minutes | Design + build + deploy |
| Web app (full-stack) | 30–60 minutes | Includes DB + auth setup |
| 10-slide presentation | 15–30 minutes | Research + design + content |
| Research report (10+ pages) | 20–45 minutes | Deep research + writing |
| Video (3-5 minutes) | 30–60 minutes | Frames + narration + encoding |
| Parallel research (100 items) | 10–20 minutes | Map tool parallelization |
| Convergence loop (3 passes) | 2–3x base task time | Quality multiplier |

### 29.2 Factors That Affect Performance

**Increases duration:**
- More sources to research (each browser navigation takes 10–30 seconds)
- Larger codebases to read and understand
- More iterations in a convergence loop
- Larger image/video generation batches
- Complex ffmpeg pipelines
- Slow external APIs

**Decreases duration:**
- Parallel processing via the `map` tool
- Batch image generation (5 images in parallel vs. sequential)
- Pre-provided context (less research needed)
- Clear, specific goal statements (less planning iteration)

### 29.3 Quality vs. Speed Trade-offs

Manus is optimized for quality by default. When speed is more important than quality:
- Skip the convergence loop
- Use fewer research sources
- Request shorter, more focused outputs
- Use templates and existing patterns rather than custom design

When quality is paramount:
- Use the convergence loop (3+ passes)
- Request expert-perspective review
- Provide reference material and style guides
- Allow more time for research

---
