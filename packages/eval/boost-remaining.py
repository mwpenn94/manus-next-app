#!/usr/bin/env python3
"""Boost the remaining 14 capabilities to 8 scoring criteria."""
import yaml, os

CAPS_DIR = "packages/eval/capabilities"
ORCH_DIR = "packages/eval/orchestration"

def write_yaml(filepath, data):
    content = f"""id: {data['id']}
name: {data['name']}
title: {data['title']}
category: {data['category']}
status: {data['status']}
task:
  prompt: >-
    {data['prompt']}
  expected_behavior: >-
    {data['expected_behavior']}
  scoring_criteria:
"""
    for criterion in data['scoring_criteria']:
        content += f"    - {criterion}\n"
    content += """scoring:
  dimensions:
    - correctness
    - completeness
    - efficiency
    - robustness
    - user_experience
    - maintainability
    - innovation
  weights:
    correctness: 0.2
    completeness: 0.15
    efficiency: 0.1
    robustness: 0.15
    user_experience: 0.15
    maintainability: 0.1
    innovation: 0.15
  threshold: 0.8
result: null
"""
    with open(filepath, 'w') as f:
        f.write(content)

ENHANCEMENTS = {
    "23-browser-operator.yaml": {
        "prompt": "Operate a full Chromium browser for web navigation, form filling, data extraction, authentication, and multi-tab workflows with screenshot verification.",
        "expected_behavior": "Full-featured browser automation operating Chromium stable with persistent login state and cookie management across tasks. Navigation supports URL-based browsing with intent classification (navigational, informational, transactional) for optimized page handling. Form filling automates text input, dropdown selection, checkbox toggling, and file upload with intelligent field detection. Data extraction captures structured content from web pages with CSS selector and XPath targeting for precise element identification. Multi-tab workflows manage concurrent browser sessions for comparison shopping, research aggregation, and parallel data collection. Screenshot capture verifies visual state after each significant action, enabling visual debugging and progress documentation. Authentication handling maintains login sessions across sandbox hibernation cycles for continuous access to authenticated services. The browser handles dynamic content (SPAs, infinite scroll, lazy loading) with configurable wait conditions and scroll-to-load automation. Error recovery detects navigation failures, timeout conditions, and CAPTCHA challenges with automatic retry and user escalation.",
        "scoring_criteria": [
            "Full Chromium browser with persistent login state and cookie management",
            "Intent-classified navigation (navigational, informational, transactional)",
            "Intelligent form filling with text, dropdowns, checkboxes, and file uploads",
            "Structured data extraction via CSS selectors and XPath targeting",
            "Multi-tab concurrent workflows for comparison and parallel data collection",
            "Screenshot verification after significant actions for visual debugging",
            "Dynamic content handling (SPAs, infinite scroll) with configurable wait conditions",
            "Error recovery for navigation failures, timeouts, and CAPTCHA with user escalation",
        ],
    },
    "25-computer-use.yaml": {
        "prompt": "Interact with desktop applications through screen observation, mouse control, keyboard input, and application management for non-browser automation tasks.",
        "expected_behavior": "Desktop automation system enabling interaction with GUI applications through screen observation and input control. Screen observation captures the current desktop state with multi-modal analysis identifying UI elements, text content, and application state. Mouse control provides precise click, double-click, drag, and scroll operations with coordinate-based and element-based targeting. Keyboard input supports text typing, keyboard shortcuts, and modifier key combinations for application control. Application management launches, switches between, and closes desktop applications with window positioning and sizing. The system handles multi-monitor setups with coordinate translation between screens. File system operations through GUI (file dialogs, drag-and-drop) complement shell-based file management. OCR capabilities extract text from screen regions for applications that don't expose text programmatically. The automation pipeline chains multiple GUI operations into workflows with checkpoint verification between steps to ensure each action succeeded before proceeding.",
        "scoring_criteria": [
            "Screen observation with multi-modal analysis of UI elements and application state",
            "Precise mouse control (click, double-click, drag, scroll) with coordinate targeting",
            "Keyboard input with text typing, shortcuts, and modifier key combinations",
            "Application management (launch, switch, close) with window positioning and sizing",
            "Multi-monitor support with coordinate translation between screens",
            "GUI file operations (file dialogs, drag-and-drop) complementing shell operations",
            "OCR text extraction from screen regions for non-programmatic text access",
            "Chained GUI workflows with checkpoint verification between steps",
        ],
    },
    "18-data-analysis.yaml": {
        "prompt": "Analyze structured data with statistical methods, create publication-quality visualizations, and generate insight reports with pandas, matplotlib, seaborn, and plotly.",
        "expected_behavior": "Comprehensive data analysis pipeline using pandas for data manipulation, matplotlib and seaborn for static visualizations, and plotly for interactive charts. Data ingestion supports CSV, Excel, JSON, and database queries with automatic type detection and missing value handling. Statistical analysis includes descriptive statistics, correlation matrices, hypothesis testing, and regression analysis with proper assumption checking. Visualization generation creates publication-quality figures with customizable themes, color palettes (including colorblind-safe options), and multi-panel layouts. Interactive plotly dashboards enable drill-down exploration with hover tooltips, zoom, and filter controls. The analysis pipeline handles large datasets efficiently with chunked processing and memory-optimized operations. Insight reports combine visualizations with narrative explanations of findings, statistical significance, and actionable recommendations. Export produces standalone HTML dashboards, PNG/SVG figures, and formatted data tables. The system follows the scientific-visualization skill for journal-ready figures with significance annotations and error bars.",
        "scoring_criteria": [
            "Multi-format data ingestion (CSV, Excel, JSON, DB) with auto type detection",
            "Statistical analysis with descriptive stats, correlation, hypothesis testing, regression",
            "Publication-quality static figures via matplotlib/seaborn with customizable themes",
            "Interactive plotly dashboards with hover tooltips, zoom, and filter controls",
            "Efficient large dataset handling with chunked processing and memory optimization",
            "Insight reports combining visualizations with narrative and recommendations",
            "Multi-format export (HTML dashboards, PNG/SVG figures, formatted tables)",
            "Colorblind-safe palettes and multi-panel layouts for journal-ready figures",
        ],
    },
    "46-desktop-app.yaml": {
        "prompt": "Build cross-platform desktop applications using Electron or Tauri with native OS integration, auto-updates, and platform-specific packaging.",
        "expected_behavior": "Cross-platform desktop application development using Electron or Tauri frameworks with native OS integration. The build pipeline generates platform-specific installers (DMG for macOS, MSI/NSIS for Windows, AppImage/deb for Linux) from a single codebase. Native OS integration includes system tray icons, native menus, file associations, and notification center integration. Auto-update functionality checks for new versions on startup with background download and one-click install. The application shell provides a responsive window with minimum size constraints, fullscreen support, and proper DPI scaling for high-resolution displays. IPC communication between main and renderer processes follows secure patterns with context isolation and preload scripts. Local data persistence uses SQLite or the system keychain for sensitive credentials. The development workflow includes hot reload for rapid iteration and debugging tools with Chrome DevTools integration. Code signing configuration ensures the application passes OS security checks (Gatekeeper on macOS, SmartScreen on Windows).",
        "scoring_criteria": [
            "Platform-specific installer generation (DMG, MSI/NSIS, AppImage/deb) from single codebase",
            "Native OS integration (system tray, menus, file associations, notifications)",
            "Auto-update with background download and one-click install",
            "Responsive window with DPI scaling and fullscreen support",
            "Secure IPC with context isolation and preload scripts",
            "Local data persistence via SQLite and system keychain for credentials",
            "Hot reload development workflow with Chrome DevTools debugging",
            "Code signing for OS security checks (Gatekeeper, SmartScreen)",
        ],
    },
    "27-webapp-creation.yaml": {
        "prompt": "Build full-stack web applications with React frontend, Express/tRPC backend, database integration, authentication, and one-click deployment.",
        "expected_behavior": "End-to-end full-stack web application development using React 19 with Tailwind CSS 4 frontend, Express 4 with tRPC 11 backend, and Drizzle ORM database integration. The development workflow follows the Build Loop: update schema in drizzle/schema.ts, add database helpers in server/db.ts, create tRPC procedures in server/routers.ts, and build frontend pages consuming tRPC hooks. Authentication is pre-wired via Manus OAuth with protectedProcedure middleware injecting ctx.user for authenticated routes. The frontend uses shadcn/ui components for consistent, accessible UI with Tailwind utilities for responsive layouts. Type safety flows end-to-end from database schema through tRPC procedures to React components with Superjson serialization preserving Date and BigInt types. One-click deployment via checkpoint and publish produces production builds with automatic SSL, CDN, and custom domain support. The development server provides hot module replacement with live preview in the Management UI. Vitest integration ensures code quality with test coverage for server procedures.",
        "scoring_criteria": [
            "React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM full-stack integration",
            "Build Loop workflow (schema -> db helpers -> procedures -> frontend hooks)",
            "Pre-wired Manus OAuth with protectedProcedure middleware and ctx.user injection",
            "shadcn/ui components with accessible, responsive Tailwind layouts",
            "End-to-end type safety with Superjson preserving Date and BigInt types",
            "One-click deployment with automatic SSL, CDN, and custom domain support",
            "Hot module replacement with live preview in Management UI",
            "Vitest integration for server procedure test coverage and code quality",
        ],
    },
    "16-manus-slides.yaml": {
        "prompt": "Generate professional slide presentations with two rendering modes (HTML for data-heavy content, image for visual impact), Chart.js integration, and export to PDF/PPT.",
        "expected_behavior": "Professional slide presentation generation system with two distinct rendering modes optimized for different use cases. HTML mode generates editable slides using HTML/CSS with Chart.js integration for data-heavy presentations featuring interactive charts, tables, and code blocks. Image mode renders each slide as a single high-quality image for visually stunning presentations with artistic layouts and custom typography. The generation workflow requires content preparation in a markdown file before entering slides mode, ensuring structured content drives the presentation. Chart.js integration supports bar, line, pie, doughnut, radar, and scatter charts with customizable colors, labels, and animations. Slide count scales with content complexity from simple 5-slide overviews to detailed 30+ slide presentations. Export via manus-export-slides produces PDF and PPT formats for distribution and editing. The system follows the slides_content_writing -> slides_generation phase separation for optimal content organization. Template themes provide consistent visual identity with customizable color schemes and font selections.",
        "scoring_criteria": [
            "Dual rendering modes: HTML (editable, data-heavy) and image (visual impact)",
            "Chart.js integration with bar, line, pie, radar, scatter charts and animations",
            "Content-first workflow with markdown preparation before slide generation",
            "Scalable slide count from 5-slide overviews to 30+ detailed presentations",
            "PDF and PPT export via manus-export-slides for distribution and editing",
            "Phase-separated content writing and slide generation for optimal organization",
            "Template themes with customizable color schemes and font selections",
            "Interactive data visualization with tables, code blocks, and chart customization",
        ],
    },
    "43-mobile-development.yaml": {
        "prompt": "Build mobile applications using React Native or progressive web app (PWA) approaches with responsive design, touch optimization, and app store preparation.",
        "expected_behavior": "Mobile application development supporting both React Native for native app experiences and PWA for web-based mobile deployment. React Native development produces cross-platform iOS and Android applications from a single JavaScript/TypeScript codebase with native UI components. PWA development creates installable web applications with service workers for offline support, push notifications, and home screen installation. Responsive design ensures optimal layouts across phone and tablet form factors with orientation-aware adjustments. Touch optimization implements gesture handlers (swipe, pinch, long-press) with haptic feedback and 44px minimum tap targets. Navigation follows mobile patterns (tab bars, stack navigation, drawer menus) with smooth animated transitions. Performance optimization includes lazy loading, image compression, and bundle size minimization for fast load times on mobile networks. App store preparation generates required assets (icons, splash screens, screenshots) and metadata (descriptions, keywords) for Apple App Store and Google Play submission. Testing tools provide device emulation and real-device debugging for cross-platform verification.",
        "scoring_criteria": [
            "React Native cross-platform iOS/Android development from single codebase",
            "PWA with service workers for offline support, push notifications, and installation",
            "Responsive layouts across phone and tablet with orientation-aware adjustments",
            "Touch gesture handlers (swipe, pinch, long-press) with haptic feedback",
            "Mobile navigation patterns (tab bars, stack nav, drawers) with animated transitions",
            "Performance optimization with lazy loading, compression, and bundle minimization",
            "App store asset generation (icons, splash screens, metadata) for submission",
            "Device emulation and real-device debugging for cross-platform testing",
        ],
    },
    "51-slack-integration.yaml": {
        "prompt": "Integrate with Slack workspaces for sending messages, creating channels, managing threads, and building interactive bot experiences with Block Kit UI.",
        "expected_behavior": "Comprehensive Slack integration enabling programmatic workspace interaction through the Slack Web API and Events API. Message sending supports rich formatting with Block Kit UI components including sections, dividers, images, buttons, and interactive elements. Channel management creates, archives, and configures channels with topic and purpose setting. Thread management enables organized conversations with reply threading, thread summarization, and follow-up tracking. Interactive bot experiences respond to slash commands, button clicks, and modal submissions with real-time user interaction. File sharing uploads documents, images, and code snippets to channels with preview generation. User management queries workspace members, manages presence status, and handles direct message conversations. Webhook integration receives real-time events (messages, reactions, channel updates) for triggering automated workflows. The integration handles rate limiting with automatic retry and request queuing to prevent API throttling. GIF creation via the slack-gif-creator skill produces optimized animated content for engaging team communication.",
        "scoring_criteria": [
            "Rich messaging with Block Kit UI (sections, dividers, images, buttons, interactives)",
            "Channel management (create, archive, configure) with topic and purpose setting",
            "Thread management with reply threading, summarization, and follow-up tracking",
            "Interactive bot with slash commands, button clicks, and modal submissions",
            "File sharing with document, image, and code snippet uploads and previews",
            "User management with member queries, presence status, and DM conversations",
            "Real-time webhook events (messages, reactions, updates) for automated workflows",
            "Rate limiting with automatic retry and request queuing to prevent throttling",
        ],
    },
    "57-team-billing.yaml": {
        "prompt": "Manage team subscriptions with seat-based billing, admin controls, usage tracking, and Stripe-powered payment processing with invoice management.",
        "expected_behavior": "Team billing and administration system with seat-based subscription management powered by Stripe. Admin controls provide a dashboard for managing team members with invite, remove, and role assignment capabilities. Seat-based billing automatically adjusts subscription charges when team members are added or removed with prorated billing for mid-cycle changes. Usage tracking monitors per-member resource consumption (tasks, API calls, storage) with configurable limits and overage policies. Invoice management generates and delivers monthly invoices with line-item detail for each team member and usage category. Payment method management allows admins to update credit cards, view payment history, and download receipts. The billing dashboard displays current plan details, upcoming charges, and usage trends with visual charts. Subscription plan management supports upgrades, downgrades, and cancellations with immediate or end-of-period effective dates. Tax handling calculates applicable taxes based on team location with proper tax ID validation and exemption support.",
        "scoring_criteria": [
            "Admin dashboard for team member management (invite, remove, role assignment)",
            "Seat-based billing with automatic charge adjustment and prorated mid-cycle changes",
            "Per-member usage tracking (tasks, API calls, storage) with configurable limits",
            "Monthly invoice generation with line-item detail per member and usage category",
            "Payment method management with card updates, history, and receipt downloads",
            "Billing dashboard with plan details, upcoming charges, and usage trend charts",
            "Subscription plan upgrades, downgrades, and cancellations with effective date options",
            "Tax calculation based on location with tax ID validation and exemption support",
        ],
    },
    # Orchestration files
    "orch-1.yaml": {
        "prompt": "Execute complex tasks requiring sequential invocation of multiple tools with data passing between steps, error handling at each stage, and progress tracking.",
        "expected_behavior": "Multi-tool orchestration system executing complex tasks through sequential tool chains with intelligent data passing between steps. The orchestrator analyzes task requirements to determine the optimal tool sequence, selecting from browser, shell, file operations, search, and generation tools. Data flows between tools via structured intermediate results — for example, search results feed into browser navigation, which produces data for file writing, which triggers shell execution. Error handling at each stage detects failures, attempts automatic recovery, and falls back to alternative approaches when primary tools fail. Progress tracking provides real-time visibility into the current step, completed steps, and estimated remaining work. The system handles tool dependencies by ensuring prerequisite tools complete successfully before dependent tools begin. Parallel execution opportunities are identified and exploited when tools have no data dependencies. The orchestrator maintains a task plan that adapts dynamically as intermediate results reveal new requirements or constraints. Rollback capabilities undo partial progress when a critical step fails, preventing inconsistent state.",
        "scoring_criteria": [
            "Optimal tool sequence selection from browser, shell, file, search, and generation tools",
            "Structured data passing between tools via intermediate results",
            "Per-stage error handling with automatic recovery and alternative fallback approaches",
            "Real-time progress tracking with current step, completed steps, and time estimates",
            "Tool dependency management ensuring prerequisites complete before dependents",
            "Parallel execution when tools have no data dependencies for efficiency",
            "Dynamic task plan adaptation as intermediate results reveal new requirements",
            "Rollback of partial progress on critical step failure preventing inconsistent state",
        ],
    },
    "orch-2.yaml": {
        "prompt": "Recover gracefully from tool failures, API errors, and unexpected states during task execution with automatic retry, alternative strategies, and user escalation.",
        "expected_behavior": "Comprehensive error recovery system handling tool failures, API errors, and unexpected states during multi-step task execution. Automatic retry with exponential backoff handles transient failures (network timeouts, rate limits, temporary service unavailability) with configurable retry counts per tool type. Alternative strategy selection activates when primary approaches fail — for example, switching from browser automation to API calls, or from one search provider to another. State preservation captures the task context before each risky operation, enabling rollback to the last known good state on failure. User escalation triggers when automatic recovery is exhausted, providing clear error descriptions with specific guidance on what the user can do to help (provide credentials, approve actions, clarify requirements). The system distinguishes between recoverable errors (retry-worthy) and fatal errors (require user intervention) to avoid wasting resources on unrecoverable situations. Error pattern learning tracks recurring failures to preemptively avoid known problematic approaches. Graceful degradation delivers partial results when complete task execution is impossible, clearly communicating what was accomplished and what remains. Diagnostic logging captures full error context (stack traces, request/response data, environment state) for debugging.",
        "scoring_criteria": [
            "Automatic retry with exponential backoff for transient failures per tool type",
            "Alternative strategy selection when primary approaches fail (browser to API, etc.)",
            "State preservation before risky operations enabling rollback to last good state",
            "User escalation with clear error descriptions and specific guidance for resolution",
            "Recoverable vs fatal error classification avoiding wasted retry resources",
            "Error pattern learning preemptively avoiding known problematic approaches",
            "Graceful degradation delivering partial results with clear status communication",
            "Diagnostic logging with stack traces, request/response data, and environment state",
        ],
    },
    "orch-3.yaml": {
        "prompt": "Switch seamlessly between different operational modes (chat, agent, browser, code) mid-task based on evolving requirements without losing context.",
        "expected_behavior": "Seamless mode switching system transitioning between operational modes (chat, agent, browser, code execution) mid-task based on evolving requirements. Context preservation ensures all accumulated knowledge, decisions, and intermediate results carry across mode transitions without information loss. The system detects when the current mode is insufficient for the next step — for example, recognizing that a research question requires browser navigation, or that a coding task needs shell execution. Transition triggers are both automatic (tool requirement analysis) and manual (user requests a specific mode). Each mode maintains its own state (browser tabs, shell sessions, file edits) that persists across switches and can be resumed. The switching mechanism handles cleanup of the current mode's resources before transitioning to prevent resource leaks. Mode-specific optimizations activate appropriate tool sets and prompting strategies for each mode. The system tracks mode switch history for debugging and optimization, identifying patterns where frequent switching indicates task decomposition improvements. Smooth transitions maintain user experience continuity with clear indicators of the active mode and available capabilities.",
        "scoring_criteria": [
            "Seamless transitions between chat, agent, browser, and code execution modes",
            "Full context preservation across mode transitions without information loss",
            "Automatic mode insufficiency detection triggering appropriate transitions",
            "Both automatic and manual transition triggers based on requirements and user requests",
            "Per-mode state persistence (browser tabs, shell sessions, files) across switches",
            "Resource cleanup before transitions preventing leaks and conflicts",
            "Mode-specific optimizations activating appropriate tools and strategies",
            "Mode switch history tracking for debugging and task decomposition optimization",
        ],
    },
    "orch-4.yaml": {
        "prompt": "Maintain and leverage memory across separate tasks within the same project, enabling cumulative learning and context building over multiple interactions.",
        "expected_behavior": "Cross-task memory system maintaining cumulative knowledge within project contexts across separate task executions. Project-level instructions persist via the project system and are automatically injected into every task, providing consistent domain knowledge and behavioral guidelines. Shared files at /home/ubuntu/projects/{project-id}/ enable data persistence across tasks with structured storage for intermediate results, learned patterns, and reference materials. The memory system tracks decisions made in previous tasks to maintain consistency — for example, remembering chosen architecture patterns, naming conventions, and design decisions. Cumulative learning builds project-specific knowledge over time, improving task efficiency as the agent develops deeper understanding of the project domain. Memory retrieval uses semantic relevance matching to surface the most applicable past context for the current task. The system handles memory conflicts when new information contradicts previous knowledge by preferring recent information with explicit acknowledgment of the change. Memory pruning removes outdated or superseded information to prevent context pollution. Cross-task dependency tracking identifies when current task outputs will be consumed by future tasks, ensuring appropriate documentation and format.",
        "scoring_criteria": [
            "Project-level instruction persistence with automatic injection into all tasks",
            "Shared file storage at project directory for cross-task data persistence",
            "Decision tracking maintaining consistency across tasks (architecture, naming, design)",
            "Cumulative domain learning improving efficiency over multiple interactions",
            "Semantic relevance matching for surfacing applicable past context",
            "Memory conflict resolution preferring recent information with change acknowledgment",
            "Memory pruning removing outdated information to prevent context pollution",
            "Cross-task dependency tracking ensuring proper documentation for future consumption",
        ],
    },
    "05-wide-research.yaml": {
        "prompt": "Conduct comprehensive research across multiple sources with parallel search, source cross-validation, citation tracking, and synthesized research reports.",
        "expected_behavior": "Comprehensive multi-source research system conducting parallel searches across web, academic, news, and data sources with intelligent synthesis. The parallel processing capability spawns up to 2000 subtasks for broad coverage, searching multiple query variants simultaneously. Source cross-validation compares findings across independent sources to verify accuracy and identify consensus vs. conflicting information. Citation tracking maintains provenance for every factual claim with inline numeric references linking to source URLs. Research reports synthesize findings into structured documents with executive summaries, detailed analysis sections, and annotated bibliographies. The system uses the deep-research skill for complex topics requiring 2-10 minute autonomous multi-step investigation with Gemini Deep Research Agent. Academic research via the research-lookup skill accesses papers, studies, and technical documentation with proper citations. The research pipeline handles information freshness by prioritizing recent sources for time-sensitive topics while including foundational references for established knowledge. Quality assessment scores each source on authority, recency, and relevance to filter low-quality results.",
        "scoring_criteria": [
            "Parallel search across web, academic, news, and data sources with 2000 subtask capacity",
            "Source cross-validation comparing findings across independent sources for accuracy",
            "Citation tracking with inline numeric references linking to source URLs",
            "Synthesized research reports with executive summaries and annotated bibliographies",
            "Deep-research skill integration for complex autonomous multi-step investigation",
            "Academic research via research-lookup with papers, studies, and proper citations",
            "Information freshness prioritization for time-sensitive vs. foundational topics",
            "Source quality assessment scoring authority, recency, and relevance for filtering",
        ],
    },
}

count = 0
for filename, data in sorted(ENHANCEMENTS.items()):
    for dir_path in [CAPS_DIR, ORCH_DIR]:
        filepath = os.path.join(dir_path, filename)
        if os.path.exists(filepath):
            with open(filepath) as f:
                existing = yaml.safe_load(f)
            write_data = {
                "id": existing["id"],
                "name": existing["name"],
                "title": existing["title"],
                "category": existing["category"],
                "status": existing["status"],
                "prompt": data["prompt"],
                "expected_behavior": data["expected_behavior"],
                "scoring_criteria": data["scoring_criteria"],
            }
            write_yaml(filepath, write_data)
            count += 1
            print(f"  ✓ {filename}")
            break
    else:
        print(f"  ✗ {filename} NOT FOUND")

print(f"\nEnhanced {count} remaining capabilities to 8 scoring criteria each.")
