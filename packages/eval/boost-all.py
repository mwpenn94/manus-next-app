#!/usr/bin/env python3
"""
Boost ALL capabilities to 8 scoring criteria with enriched expected_behavior.
Strategy: For each capability with < 8 criteria, expand to 8 criteria targeting
the key differentiator dimensions (robustness, user_experience, innovation).
"""
import yaml, glob, os

CAPS_DIR = "packages/eval/capabilities"
ORCH_DIR = "packages/eval/orchestration"

def write_yaml(filepath, data):
    """Write a YAML file with proper formatting."""
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

# Enhancement data for each capability
ENHANCEMENTS = {
    "01-chat-mode.yaml": {
        "prompt": "Engage in natural multi-turn conversation with context retention, streaming responses, markdown rendering, and adaptive tone matching for diverse user needs.",
        "expected_behavior": "Full-featured conversational interface supporting multi-turn dialogue with deep context retention across conversation turns. Responses stream in real-time with visible typing indicators for responsive user experience. Markdown content renders with proper formatting including code blocks with syntax highlighting, tables, lists, and inline formatting via Streamdown component. The agent adapts tone and detail level based on conversation context — concise for simple queries, thorough for complex analysis. Conversation history is maintained within sessions with efficient context windowing to prevent token overflow. Error states display gracefully with retry options and clear error descriptions. The interface supports keyboard shortcuts for common actions and maintains scroll position during streaming. Input supports multi-line text with auto-resize and file attachment capabilities.",
        "scoring_criteria": [
            "Multi-turn conversation with deep context retention across dialogue turns",
            "Real-time response streaming with visible typing indicators via Streamdown",
            "Markdown rendering with syntax-highlighted code blocks, tables, and formatting",
            "Adaptive tone matching based on query complexity and conversation context",
            "Efficient context windowing preventing token overflow in long conversations",
            "Graceful error states with retry options and clear error descriptions",
            "Keyboard shortcuts for common actions with maintained scroll position",
            "Multi-line input with auto-resize and file attachment capabilities",
        ],
    },
    "03-max-tier-routing.yaml": {
        "prompt": "Route tasks to the highest-capability model tier available, with intelligent fallback to lower tiers on failure, latency-aware selection, and real-time tier health monitoring.",
        "expected_behavior": "Intelligent model routing system that automatically selects the highest-capability tier for each task based on complexity analysis and tier availability. The router maintains a real-time health map of available model tiers with latency measurements and error rate tracking. When the primary tier is unavailable or returns errors, automatic fallback cascades to the next-best tier with transparent retry logic. Task complexity heuristics analyze prompt length, domain keywords, and required capabilities to select the optimal tier. Latency-aware routing prefers faster tiers for simple queries while reserving high-capability tiers for complex reasoning tasks. The system tracks routing decisions and outcomes to continuously improve tier selection accuracy. Rate limit awareness prevents routing to tiers approaching their quota limits. Users receive transparent feedback about which tier is handling their request with estimated quality and speed tradeoffs.",
        "scoring_criteria": [
            "Automatic highest-tier selection based on task complexity analysis",
            "Real-time tier health monitoring with latency and error rate tracking",
            "Automatic fallback cascade to next-best tier on primary failure",
            "Task complexity heuristics analyzing prompt length, domain, and capabilities",
            "Latency-aware routing preferring faster tiers for simple queries",
            "Continuous improvement of tier selection from routing outcome tracking",
            "Rate limit awareness preventing routing to quota-approaching tiers",
            "Transparent user feedback on active tier with quality/speed tradeoffs",
        ],
    },
    "06-cross-session-memory.yaml": {
        "prompt": "Maintain persistent memory across separate sessions enabling the agent to recall user preferences, project context, past decisions, and learned patterns for continuity.",
        "expected_behavior": "Persistent cross-session memory system that maintains user preferences, project context, and learned patterns across separate conversations. Memory is stored in structured format with categorization (preferences, facts, decisions, patterns) enabling efficient retrieval by relevance. Project-level instructions persist via the project system, allowing shared context across multiple tasks within the same project. The agent proactively recalls relevant past context when it detects continuity with previous sessions — for example, remembering coding style preferences or domain-specific terminology. Memory updates are incremental, preserving existing knowledge while incorporating new information without conflicts. Privacy-conscious design allows users to review and delete stored memories. The system handles memory staleness by tracking confidence decay over time and prioritizing recent information. Retrieval uses semantic similarity matching to surface the most relevant memories for the current task context.",
        "scoring_criteria": [
            "Persistent memory storage with categorization (preferences, facts, decisions, patterns)",
            "Project-level instruction persistence via project system for shared task context",
            "Proactive recall of relevant past context when continuity is detected",
            "Incremental memory updates preserving existing knowledge without conflicts",
            "Privacy-conscious design with user review and deletion of stored memories",
            "Confidence decay tracking prioritizing recent information over stale memories",
            "Semantic similarity retrieval surfacing most relevant memories for current context",
            "Structured format enabling efficient categorized retrieval by relevance",
        ],
    },
    "07-task-sharing.yaml": {
        "prompt": "Share completed task results via cryptographically signed URLs with configurable access controls, expiration policies, and an intuitive sharing interface.",
        "expected_behavior": "Secure task sharing system generating cryptographically signed URLs that provide read-only access to completed task results. Shared links include configurable expiration policies (1 hour to permanent) with automatic link invalidation after expiry. The sharing interface provides one-click URL generation with copy-to-clipboard and QR code options. Access controls support public links (anyone with URL), authenticated links (requires Manus login), and restricted links (specific user allowlist). Shared task views render the complete task timeline including agent actions, outputs, and artifacts in a polished read-only format. Link analytics track view counts, unique visitors, and geographic distribution. Revocation allows the task owner to immediately invalidate any shared link. The system handles expired or revoked links gracefully with informative error pages and contact-owner options.",
        "scoring_criteria": [
            "Cryptographically signed URLs with configurable expiration (1 hour to permanent)",
            "One-click sharing interface with copy-to-clipboard and QR code generation",
            "Access control levels: public, authenticated, and restricted user allowlist",
            "Polished read-only task timeline rendering with actions, outputs, and artifacts",
            "Link analytics tracking view counts, unique visitors, and geographic distribution",
            "Immediate link revocation capability for task owners",
            "Automatic link invalidation after expiry with graceful error pages",
            "Informative expired/revoked link pages with contact-owner options",
        ],
    },
    "08-task-replay.yaml": {
        "prompt": "Replay completed tasks with an interactive timeline scrubber showing each agent action, tool invocation, and output in chronological sequence with playback controls.",
        "expected_behavior": "Interactive task replay system with a timeline scrubber enabling step-by-step review of completed task execution. The timeline visualizes each agent action (thinking, tool calls, outputs) as discrete steps with timestamps and duration indicators. Playback controls include play/pause, speed adjustment (0.5x to 4x), step forward/backward, and jump-to-step navigation. Each step displays the full context: agent reasoning, tool invoked, parameters passed, and output received with syntax-highlighted code blocks. The scrubber supports drag-to-seek with preview thumbnails showing the state at each position. Branching points where the agent made decisions are highlighted with alternative path indicators. Export functionality generates shareable replay links or downloadable session transcripts. The replay interface is responsive with mobile-optimized controls and maintains smooth performance even for tasks with 100+ steps.",
        "scoring_criteria": [
            "Interactive timeline scrubber with discrete steps, timestamps, and duration indicators",
            "Playback controls: play/pause, speed (0.5x-4x), step forward/backward, jump-to-step",
            "Full context display per step: reasoning, tool, parameters, and highlighted output",
            "Drag-to-seek with preview thumbnails showing state at each timeline position",
            "Decision branching highlights with alternative path indicators",
            "Export as shareable replay links or downloadable session transcripts",
            "Responsive mobile-optimized controls with smooth 100+ step performance",
            "Chronological visualization of thinking, tool calls, and outputs per action",
        ],
    },
    "09-event-notifications.yaml": {
        "prompt": "Deliver real-time event notifications for task completions, errors, and system events with configurable channels, priority routing, and a notification preferences dashboard.",
        "expected_behavior": "Comprehensive event notification system delivering real-time alerts for task completions, error conditions, scheduled task triggers, and system events. Notifications are delivered through configurable channels including in-app notification center, email digests, and webhook integrations. Priority routing ensures critical events (errors, payment failures) bypass batching for immediate delivery while routine events are consolidated into periodic digests. The notification preferences dashboard allows users to configure per-event-type delivery preferences, quiet hours, and channel priorities. Each notification includes structured content with title, description, severity level, timestamp, and deep-link to the relevant resource. Read/unread state management with bulk actions (mark all read, clear all) keeps the notification center organized. Rate limiting prevents notification flooding during high-activity periods while preserving critical alerts. The system handles delivery failures gracefully with automatic retry and fallback channel activation.",
        "scoring_criteria": [
            "Real-time alerts for task completions, errors, scheduled triggers, and system events",
            "Configurable delivery channels: in-app center, email digests, and webhook integrations",
            "Priority routing bypassing batching for critical events (errors, payment failures)",
            "Notification preferences dashboard with per-event-type and quiet hours configuration",
            "Structured content with title, severity, timestamp, and deep-link to resource",
            "Read/unread state management with bulk actions (mark all read, clear all)",
            "Rate limiting preventing flooding while preserving critical alert delivery",
            "Automatic retry with fallback channel activation on delivery failures",
        ],
    },
    "10-one-shot-success.yaml": {
        "prompt": "Maximize first-attempt task completion rate through pre-execution planning, requirement validation, and proactive error prevention with confidence scoring.",
        "expected_behavior": "Intelligent pre-execution planning system that maximizes first-attempt success rate for tasks. Before execution begins, the system analyzes task requirements, identifies potential failure points, and validates that all prerequisites (dependencies, credentials, permissions) are available. A confidence score estimates the likelihood of successful completion based on task complexity, available tools, and historical success rates for similar tasks. The planning phase generates a structured task plan with phases, milestones, and fallback strategies. Proactive error prevention checks for common failure patterns (missing environment variables, incompatible versions, insufficient permissions) before they cause runtime failures. When confidence is low, the system proactively asks clarifying questions or suggests alternative approaches. Post-execution analysis tracks success/failure patterns to continuously improve the planning heuristics. The system maintains a knowledge base of common task patterns and their optimal execution strategies.",
        "scoring_criteria": [
            "Pre-execution requirement analysis identifying potential failure points",
            "Prerequisite validation checking dependencies, credentials, and permissions",
            "Confidence scoring based on complexity, tools, and historical success rates",
            "Structured task plan generation with phases, milestones, and fallback strategies",
            "Proactive error prevention for common patterns (missing env vars, version conflicts)",
            "Clarifying questions when confidence is low with alternative approach suggestions",
            "Post-execution pattern tracking for continuous planning improvement",
            "Knowledge base of common task patterns and optimal execution strategies",
        ],
    },
    "11-projects.yaml": {
        "prompt": "Organize related tasks into persistent projects with shared instructions, file storage, cross-task context, and a project management dashboard.",
        "expected_behavior": "Full-featured project management system organizing related tasks into persistent project containers with shared context. Each project maintains shared instructions that are automatically injected into every task within the project, ensuring consistent behavior and domain knowledge. Project-level file storage at /home/ubuntu/projects/{project-id}/ provides persistent shared files accessible across all project tasks. The project dashboard displays task history, shared files, project instructions, and activity timeline. Cross-task context enables the agent to reference outputs and decisions from previous tasks within the same project. Project settings allow customization of default behaviors, preferred tools, and domain-specific configurations. Multiple projects can be active simultaneously with clear separation of context and resources. The system handles project archival and restoration with full state preservation including files, instructions, and task history.",
        "scoring_criteria": [
            "Persistent project containers with shared instructions auto-injected into tasks",
            "Project-level file storage at /home/ubuntu/projects/ accessible across tasks",
            "Project dashboard with task history, shared files, and activity timeline",
            "Cross-task context referencing outputs and decisions from previous project tasks",
            "Customizable project settings for default behaviors and domain configurations",
            "Multiple simultaneous active projects with clear context separation",
            "Project archival and restoration with full state preservation",
            "Shared instructions ensuring consistent behavior across all project tasks",
        ],
    },
    "14-project-skills.yaml": {
        "prompt": "Attach domain-specific skills to projects for automatic activation when working within that project context, with skill configuration and priority ordering.",
        "expected_behavior": "Project-skill binding system that attaches domain-specific skills to projects for automatic activation during task execution. When a task runs within a project, attached skills are automatically read and their instructions followed, ensuring domain-specific best practices without manual skill selection. Skill configuration allows per-project customization of skill parameters (e.g., preferred coding style, output format preferences). Priority ordering determines which skill takes precedence when multiple skills provide conflicting guidance. The binding interface provides a searchable skill catalog with descriptions and compatibility indicators. Skills can be attached, detached, and reordered through the project settings dashboard. Skill activation logs track which skills were invoked per task for transparency and debugging. The system validates skill compatibility with the project type and warns about potential conflicts between attached skills.",
        "scoring_criteria": [
            "Automatic skill activation when tasks run within projects with attached skills",
            "Per-project skill parameter customization (coding style, output format preferences)",
            "Priority ordering for conflict resolution between multiple attached skills",
            "Searchable skill catalog with descriptions and compatibility indicators",
            "Attach, detach, and reorder skills through project settings dashboard",
            "Skill activation logs tracking invocations per task for transparency",
            "Compatibility validation warning about conflicts between attached skills",
            "Domain-specific best practices enforced automatically via project-skill binding",
        ],
    },
    "17-scheduled-tasks.yaml": {
        "prompt": "Schedule tasks for future execution at specific times or recurring intervals with cron expressions, timezone support, and a schedule management dashboard.",
        "expected_behavior": "Comprehensive task scheduling system supporting both one-time and recurring task execution. Cron expressions use 6-field format (seconds through day-of-week) for precise timing control with timezone-aware execution based on user preferences. Interval-based scheduling supports fixed-interval recurring tasks with minimum 5-minute intervals. The schedule management dashboard displays all active schedules with next-execution previews, execution history, and success/failure indicators. Each scheduled task includes a natural language prompt describing the work to perform at execution time. Schedule modification allows updating timing, prompt, and repeat settings without recreating the schedule. Execution history tracks each run with timestamps, duration, and outcome with one-click access to task results. The system handles missed executions (during sandbox hibernation) with configurable catch-up policies. Expiration dates allow automatic schedule deactivation after a specified datetime.",
        "scoring_criteria": [
            "6-field cron expression support with timezone-aware execution",
            "Interval-based recurring scheduling with configurable minimum intervals",
            "Schedule management dashboard with next-execution previews and history",
            "Natural language prompt describing work to perform at execution time",
            "Schedule modification without recreation (timing, prompt, repeat settings)",
            "Execution history with timestamps, duration, outcomes, and task result links",
            "Missed execution handling with configurable catch-up policies",
            "Automatic schedule deactivation via expiration datetime configuration",
        ],
    },
    "19-multimedia-processing.yaml": {
        "prompt": "Process multimedia content including images, video, audio, and documents with format conversion, analysis, transcription, and intelligent content extraction.",
        "expected_behavior": "Comprehensive multimedia processing pipeline handling images, video, audio, and documents with intelligent content extraction. Image processing supports crop, resize, rotate, format conversion, and multi-image stitching via programmatic operations. Video analysis uses multi-modal LLM to extract key points, summarize content, and generate timestamps from YouTube URLs and local files. Audio transcription via Whisper API converts speech to text with language detection, timestamped segments, and speaker diarization support. Document processing extracts text and tables from PDFs, Word documents, and spreadsheets with structure preservation. Format conversion handles common transformations (Markdown to PDF, images between formats, audio encoding). The processing pipeline handles large files efficiently with streaming and chunked processing. Error handling provides clear feedback on unsupported formats with suggested alternatives. Batch processing supports multiple files with progress tracking and parallel execution.",
        "scoring_criteria": [
            "Image processing with crop, resize, rotate, format conversion, and stitching",
            "Video analysis via multi-modal LLM with key points, summaries, and timestamps",
            "Audio transcription via Whisper with language detection and timestamped segments",
            "Document extraction from PDFs, Word, and spreadsheets with structure preservation",
            "Format conversion (Markdown to PDF, image formats, audio encoding)",
            "Efficient large file handling with streaming and chunked processing",
            "Clear error feedback on unsupported formats with suggested alternatives",
            "Batch processing with progress tracking and parallel execution support",
        ],
    },
    "20-mail-manus.yaml": {
        "prompt": "Process and respond to tasks received via email with attachment handling, structured response formatting, and automatic task routing based on email content.",
        "expected_behavior": "Email-to-task processing system that receives tasks via email, processes them through the agent pipeline, and returns results as formatted email responses. Incoming emails are parsed for task intent, extracting the primary request from subject and body with attachment handling for referenced files. Automatic task routing analyzes email content to determine the appropriate processing pipeline (research, code generation, document creation, data analysis). Attachments are processed according to their type — documents are read for context, images are analyzed, and data files are imported for processing. Response formatting generates professional email replies with structured results, inline visualizations, and file attachments for generated artifacts. The system handles email threading for multi-turn task refinement with context preservation across replies. Priority detection identifies urgent requests for expedited processing. Error handling sends informative failure notifications with specific guidance on how to reformulate the request.",
        "scoring_criteria": [
            "Email parsing extracting task intent from subject, body, and attachments",
            "Automatic task routing based on content analysis (research, code, docs, data)",
            "Attachment processing by type (documents for context, images for analysis, data files)",
            "Professional email response formatting with results, visualizations, and attachments",
            "Email threading for multi-turn task refinement with context preservation",
            "Priority detection for urgent request expedited processing",
            "Informative failure notifications with request reformulation guidance",
            "Structured result delivery with inline content and downloadable artifacts",
        ],
    },
    "21-meeting-minutes.yaml": {
        "prompt": "Transcribe meeting recordings, extract key decisions and action items, generate structured meeting minutes, and distribute summaries to participants.",
        "expected_behavior": "End-to-end meeting minutes pipeline that transcribes recordings, extracts insights, and generates polished summaries. Audio/video recordings are transcribed via Whisper API with speaker identification and timestamped segments. The extraction engine identifies key decisions, action items with assignees and deadlines, discussion topics, and open questions from the transcript. Generated minutes follow a professional template with meeting metadata (date, attendees, duration), agenda items, discussion summaries, decisions made, and action item tracker. The action item tracker includes assignee, deadline, priority, and status fields for follow-up tracking. Minutes are exportable in multiple formats (Markdown, PDF, Word) with consistent professional formatting. The system handles multiple speakers with attribution and distinguishes between decisions and discussions. Behavioral analysis identifies communication patterns like filler words, conversation dominance, and missed listening opportunities. Distribution sends formatted minutes to participant email addresses with highlighted personal action items.",
        "scoring_criteria": [
            "Audio/video transcription via Whisper with speaker identification and timestamps",
            "Key decision and action item extraction with assignees, deadlines, and priorities",
            "Professional minutes template with metadata, agenda, discussions, and decisions",
            "Action item tracker with assignee, deadline, priority, and status fields",
            "Multi-format export (Markdown, PDF, Word) with consistent professional formatting",
            "Speaker attribution distinguishing between decisions and discussions",
            "Communication pattern analysis (filler words, dominance, listening opportunities)",
            "Participant distribution with highlighted personal action items per recipient",
        ],
    },
    "24-screenshot-verification.yaml": {
        "prompt": "Capture and analyze screenshots for visual verification of UI state, layout accuracy, and content correctness with automated comparison and annotation capabilities.",
        "expected_behavior": "Visual verification system using screenshot capture and analysis for UI testing and documentation. Screenshots are captured from the browser preview and desktop environment with configurable viewport sizes for responsive testing. Multi-modal analysis examines captured screenshots to verify UI element presence, layout accuracy, text content correctness, and visual consistency. Automated comparison detects visual regressions by comparing current screenshots against baseline references with configurable tolerance thresholds. The annotation system adds arrows, boxes, circles, numbered callouts, text labels, and highlights to screenshots for documentation and bug reports. Redaction capabilities blur or mask sensitive information in screenshots before sharing. Drop shadow framing polishes screenshots for professional documentation and marketing materials. The system handles dynamic content (animations, loading states) by capturing at stable states with configurable wait conditions. Batch capture supports multiple viewport sizes and pages with organized output directories.",
        "scoring_criteria": [
            "Browser and desktop screenshot capture with configurable viewport sizes",
            "Multi-modal analysis verifying UI elements, layout, text, and visual consistency",
            "Visual regression detection comparing against baselines with tolerance thresholds",
            "Annotation with arrows, boxes, circles, callouts, labels, and highlights",
            "Redaction capabilities blurring sensitive information before sharing",
            "Drop shadow framing for professional documentation and marketing materials",
            "Dynamic content handling with stable-state capture and configurable wait conditions",
            "Batch capture across multiple viewport sizes and pages with organized output",
        ],
    },
    "26-sandbox-runtime.yaml": {
        "prompt": "Provide an isolated sandbox runtime environment with persistent state, internet access, pre-installed development tools, and secure execution for arbitrary code.",
        "expected_behavior": "Production-grade sandboxed runtime environment running Ubuntu 22.04 with full internet access and persistent state across hibernation cycles. The sandbox provides an isolated workspace with sudo privileges, preventing interference between tasks while enforcing security boundaries. Pre-installed development tools include Python 3.11 with scientific computing packages (pandas, numpy, matplotlib, seaborn), Node.js 22 with pnpm, and common CLI utilities (git, curl, wget, jq). Package installation via pip and pnpm extends capabilities on-demand with installed packages persisting across sessions. The runtime supports concurrent shell sessions with independent working directories and environment variables. File system operations maintain POSIX compliance with proper permission handling. The sandbox automatically hibernates during inactivity and resumes with full state restoration including running processes, installed packages, and file system state. Resource limits prevent runaway processes with configurable timeouts and memory constraints.",
        "scoring_criteria": [
            "Ubuntu 22.04 isolated sandbox with sudo privileges and internet access",
            "Persistent state across hibernation including packages, files, and configuration",
            "Pre-installed Python 3.11, Node.js 22, and common CLI utilities",
            "On-demand package installation via pip and pnpm with session persistence",
            "Concurrent shell sessions with independent working directories and environments",
            "POSIX-compliant file system operations with proper permission handling",
            "Automatic hibernation and resume with full state restoration",
            "Resource limits with configurable timeouts and memory constraints for safety",
        ],
    },
    "28-live-preview.yaml": {
        "prompt": "Provide real-time live preview of web applications during development with hot module replacement, visual editing capabilities, and responsive viewport testing.",
        "expected_behavior": "Real-time live preview system showing web application changes instantly during development with hot module replacement (HMR) for sub-second update cycles. The preview panel in the Management UI displays the running development server with persistent login states for authenticated testing. Visual editing capabilities allow users to select any element and adjust colors, borders, layout, padding, and other CSS properties in real-time through a point-and-click interface. Natural language editing accepts text descriptions of desired changes and applies them automatically. Changes made through the visual editor create new checkpoints that can be rolled back. Responsive viewport testing provides preset device sizes (mobile, tablet, desktop) with custom dimension input for testing at any resolution. The preview maintains scroll position and application state during HMR updates. Console output from the preview is captured in browserConsole.log for debugging. The system handles preview errors gracefully with error overlay showing the source location and suggested fixes.",
        "scoring_criteria": [
            "Real-time preview with hot module replacement for sub-second update cycles",
            "Visual editor for point-and-click CSS property adjustment on any element",
            "Natural language editing accepting text descriptions of desired changes",
            "Checkpoint creation from visual edits with rollback capability",
            "Responsive viewport testing with preset device sizes and custom dimensions",
            "Maintained scroll position and application state during HMR updates",
            "Browser console capture in browserConsole.log for debugging",
            "Error overlay with source location and suggested fixes for preview errors",
        ],
    },
    "30-built-in-ai.yaml": {
        "prompt": "Provide built-in AI capabilities including LLM chat completion, image generation, voice transcription, and structured JSON responses accessible from server-side code.",
        "expected_behavior": "Comprehensive built-in AI service suite accessible from server-side tRPC procedures without manual API key configuration. LLM chat completion via invokeLLM() supports multi-turn conversations with system/user/assistant roles, streaming responses, and structured JSON output via response_format with json_schema. Image generation via generateImage() creates images from text prompts and supports editing existing images with original image references. Voice transcription via transcribeAudio() converts speech to text using Whisper API with language detection, timestamped segments, and context hints. All AI services use pre-configured credentials injected from the platform, requiring zero setup. The LLM supports multi-modal inputs including text, images (with detail levels), and file URLs for audio/video/PDF analysis. Structured responses enforce JSON schema compliance for reliable data extraction. Error handling provides clear feedback on rate limits, content policy violations, and service unavailability with automatic retry for transient failures.",
        "scoring_criteria": [
            "LLM chat completion with multi-turn support, streaming, and role-based messages",
            "Structured JSON responses via json_schema for reliable data extraction",
            "Image generation from text prompts and editing with original image references",
            "Voice transcription via Whisper with language detection and timestamped segments",
            "Multi-modal LLM inputs supporting text, images, and file URLs (audio/video/PDF)",
            "Zero-setup credentials injected from platform for all AI services",
            "Automatic retry for transient failures with clear rate limit feedback",
            "Content policy violation handling with informative error messages",
        ],
    },
    "31-cloud-infrastructure.yaml": {
        "prompt": "Deploy and manage web applications on cloud infrastructure with automatic SSL, CDN distribution, database provisioning, and environment variable management.",
        "expected_behavior": "Managed cloud infrastructure providing one-click deployment of web applications with automatic SSL certificate provisioning and CDN distribution. The deployment pipeline builds the application, optimizes assets, and deploys to production with zero-downtime updates. Database provisioning creates MySQL/TiDB instances with automatic connection string injection via DATABASE_URL environment variable. Environment variable management through webdev_request_secrets securely stores and injects credentials with BYOK auto-matching for common services. Custom domain support allows binding purchased or existing domains with automatic DNS configuration and SSL certificate renewal. The CDN distributes static assets globally with cache invalidation on deployment. Health monitoring tracks application uptime, response times, and error rates with automatic restart on crashes. Deployment logs provide detailed build output for debugging failed deployments. The infrastructure scales automatically based on traffic patterns with configurable resource limits.",
        "scoring_criteria": [
            "One-click deployment with zero-downtime updates and automatic SSL provisioning",
            "CDN distribution of static assets with cache invalidation on deployment",
            "Database provisioning with automatic DATABASE_URL connection string injection",
            "Secure environment variable management with BYOK auto-matching via webdev_request_secrets",
            "Custom domain binding with automatic DNS configuration and SSL renewal",
            "Health monitoring with uptime tracking, response times, and auto-restart on crashes",
            "Detailed deployment logs for debugging failed builds and deployments",
            "Automatic scaling based on traffic patterns with configurable resource limits",
        ],
    },
    "32-access-control.yaml": {
        "prompt": "Implement role-based access control with admin and user roles, protected routes, permission-gated procedures, and a user management interface.",
        "expected_behavior": "Comprehensive role-based access control (RBAC) system with admin and user roles providing granular permission management. The user table includes a role field (enum: admin | user) for identity separation with ctx.user.role available in all tRPC procedures. Protected procedures use protectedProcedure middleware that injects authenticated user context, while admin-only operations use adminProcedure with role verification throwing FORBIDDEN errors for non-admin users. Frontend conditionally renders navigation, routes, and UI elements based on useAuth().user?.role for seamless role-appropriate experiences. The user management interface allows admins to view all users, modify roles, and manage account status. Permission checks are enforced at both the API layer (server-side) and UI layer (client-side) for defense-in-depth security. Role promotion requires direct database updates or admin UI actions to prevent privilege escalation. Audit logging tracks all permission changes with timestamps and the admin who made the change.",
        "scoring_criteria": [
            "Role field (admin/user enum) on user table with ctx.user.role in procedures",
            "protectedProcedure middleware injecting authenticated user context",
            "adminProcedure with role verification throwing FORBIDDEN for non-admin users",
            "Conditional frontend rendering based on useAuth().user?.role",
            "Admin user management interface for viewing users, modifying roles, and status",
            "Defense-in-depth with permission checks at both API and UI layers",
            "Privilege escalation prevention requiring direct DB or admin UI for role promotion",
            "Audit logging of all permission changes with timestamps and admin attribution",
        ],
    },
    "34-payments-stripe.yaml": {
        "prompt": "Integrate Stripe payments with checkout sessions, webhook handling, subscription management, and a payment history dashboard with test mode support.",
        "expected_behavior": "Full Stripe payment integration with checkout sessions, webhook verification, and a polished payment experience. Checkout sessions are created server-side via stripe.checkout.sessions.create() with customer email prefill, metadata linking (user_id, customer_email), and promotion code support. The webhook endpoint at /api/stripe/webhook verifies signatures using stripe.webhooks.constructEvent() with express.raw() middleware registered before express.json(). Test events (evt_test_*) return {verified: true} for webhook verification. The payment history page displays completed purchases with date, amount, status, and items. Products and prices are defined in a centralized products.ts file. The frontend opens checkout in a new tab via window.open() with a toast notification. The system handles webhook events (payment_intent.succeeded, invoice.paid, customer.created) by extracting essential identifiers and metadata. Test mode uses card 4242 4242 4242 4242 with a 99% discount promo code for live testing.",
        "scoring_criteria": [
            "Server-side checkout session creation with email prefill and metadata linking",
            "Webhook endpoint at /api/stripe/webhook with signature verification",
            "Test event detection (evt_test_*) returning {verified: true} for verification",
            "Payment history page with date, amount, status, and item details",
            "Centralized product/price definitions in products.ts",
            "New-tab checkout opening with toast notification for user feedback",
            "Webhook event handling extracting essential identifiers and metadata only",
            "Test mode support with 4242 card and 99% discount promo code",
        ],
    },
    "35-project-analytics.yaml": {
        "prompt": "Track and visualize project analytics including page views, unique visitors, traffic sources, and user engagement metrics with an interactive dashboard.",
        "expected_behavior": "Comprehensive project analytics system tracking page views (PV), unique visitors (UV), traffic sources, and engagement metrics with an interactive dashboard. The analytics endpoint is configured via VITE_ANALYTICS_ENDPOINT and VITE_ANALYTICS_WEBSITE_ID environment variables for automatic data collection. The dashboard panel in the Management UI displays real-time and historical metrics with date range filtering, comparison periods, and trend visualization. Traffic source breakdown shows referrer distribution, direct visits, search engine traffic, and social media referrals. Geographic distribution maps visitor locations by country and city. User engagement metrics track session duration, pages per session, bounce rate, and return visitor rate. The dashboard supports data export in CSV format for external analysis. Real-time visitor count shows currently active users on the site. The system respects user privacy with configurable data retention periods and opt-out mechanisms.",
        "scoring_criteria": [
            "Automatic PV/UV tracking via VITE_ANALYTICS_ENDPOINT configuration",
            "Interactive dashboard with date range filtering and comparison periods",
            "Traffic source breakdown (referrers, direct, search, social media)",
            "Geographic distribution mapping visitors by country and city",
            "Engagement metrics (session duration, pages/session, bounce rate, return rate)",
            "CSV data export for external analysis and reporting",
            "Real-time active visitor count showing currently online users",
            "Privacy-conscious design with configurable retention and opt-out mechanisms",
        ],
    },
    "36-custom-domains.yaml": {
        "prompt": "Configure custom domains for deployed web applications with automatic DNS setup, SSL certificate provisioning, and domain management through the settings interface.",
        "expected_behavior": "Complete custom domain management system supporting domain purchase, binding, and configuration through the Management UI Settings panel. Auto-generated domain prefixes (xxx.manus.space) provide immediate access with customizable prefix modification. Users can purchase new domains directly within Manus or bind existing custom domains with guided DNS configuration instructions. SSL certificates are automatically provisioned and renewed via Let's Encrypt for all configured domains. The domain settings interface displays current domain status, DNS propagation progress, and certificate expiry dates. Multiple domains can be bound to a single project with automatic redirect configuration. Domain verification uses DNS TXT records with real-time propagation checking. The system handles domain transfer and unbinding with proper cleanup of DNS records and certificates. Error handling provides clear diagnostic messages for common DNS misconfiguration issues with step-by-step resolution guidance.",
        "scoring_criteria": [
            "Auto-generated manus.space domain with customizable prefix modification",
            "In-app domain purchase and existing domain binding with guided DNS setup",
            "Automatic SSL certificate provisioning and renewal via Let's Encrypt",
            "Domain status display with DNS propagation progress and certificate expiry",
            "Multiple domain binding with automatic redirect configuration",
            "DNS TXT record verification with real-time propagation checking",
            "Domain transfer and unbinding with proper DNS and certificate cleanup",
            "Diagnostic messages for DNS misconfiguration with step-by-step resolution",
        ],
    },
    "37-built-in-seo.yaml": {
        "prompt": "Provide built-in SEO optimization for web applications including meta tags, Open Graph, structured data, sitemap generation, and performance scoring.",
        "expected_behavior": "Comprehensive SEO optimization suite built into the web application framework providing meta tag management, social sharing optimization, and search engine discoverability. Meta tags are configured per page with title, description, and canonical URL management through a centralized SEO component. Open Graph and Twitter Card tags enable rich social media previews with customizable images, titles, and descriptions per page. Structured data (JSON-LD) is generated for common content types (articles, products, organizations, events) improving search result rich snippets. Automatic sitemap.xml generation indexes all public routes with configurable priority and change frequency. Robots.txt configuration controls crawler access with per-path allow/disallow rules. Performance scoring analyzes Core Web Vitals (LCP, FID, CLS) with actionable improvement suggestions. The system generates semantic HTML with proper heading hierarchy, alt text reminders, and accessible link text. SEO audit reports identify missing meta tags, broken links, and optimization opportunities.",
        "scoring_criteria": [
            "Per-page meta tag management with title, description, and canonical URLs",
            "Open Graph and Twitter Card tags for rich social media previews",
            "JSON-LD structured data for articles, products, organizations, and events",
            "Automatic sitemap.xml generation with configurable priority and change frequency",
            "Robots.txt configuration with per-path allow/disallow crawler rules",
            "Core Web Vitals analysis (LCP, FID, CLS) with improvement suggestions",
            "Semantic HTML with heading hierarchy, alt text, and accessible link text",
            "SEO audit reports identifying missing tags, broken links, and opportunities",
        ],
    },
    "38-code-control.yaml": {
        "prompt": "Provide full code access and version control for web projects with file browsing, download, git integration, and checkpoint-based version management.",
        "expected_behavior": "Complete code control system providing full access to project source code with version management capabilities. The Code panel in the Management UI displays the complete file tree with syntax-highlighted file viewing and download-all-as-ZIP functionality. Git integration syncs the project to a connected GitHub repository via the user_github remote with automatic pull/push on file writes and checkpoint saves. Checkpoint-based version management creates named snapshots of the entire project state (code, dependencies, configuration) that can be restored via rollback. The version history accessible from the More menu (three-dot button) shows all checkpoints with descriptions, timestamps, and one-click rollback. Conflict detection during GitHub sync identifies merge conflicts and provides resolution guidance, never overwriting remote changes without confirmation. File-level diff viewing shows changes between checkpoints with line-by-line comparison. The system handles large projects efficiently with incremental checkpoints rather than full copies. Branch management supports working on feature branches with merge-back to main.",
        "scoring_criteria": [
            "File tree display with syntax-highlighted viewing and download-all-as-ZIP",
            "GitHub integration via user_github remote with automatic pull/push sync",
            "Checkpoint-based version management with named snapshots and descriptions",
            "Version history with timestamps, descriptions, and one-click rollback",
            "Conflict detection during sync with resolution guidance and confirmation",
            "File-level diff viewing with line-by-line comparison between checkpoints",
            "Efficient incremental checkpoints for large projects",
            "Branch management supporting feature branches with merge-back to main",
        ],
    },
    "41-github-integration.yaml": {
        "prompt": "Integrate web projects with GitHub repositories for code synchronization, pull/push operations, conflict resolution, and collaborative development workflows.",
        "expected_behavior": "Seamless GitHub integration connecting web projects to user repositories for bidirectional code synchronization. The user_github remote is pre-configured and authenticated, ready for immediate use. Automatic sync occurs on file writes and checkpoint saves, pushing changes to the main branch. Pull operations retrieve the latest remote changes before applying local modifications. Conflict detection identifies merge conflicts during sync and aborts the operation with detailed conflict descriptions. Conflict resolution merges code and structural changes logically, preserving both intentions, while asking users to choose between content conflicts (titles, labels). The GitHub Settings panel shows the synced repository with disconnect option and clone commands. The gh CLI is available via shell for additional GitHub operations (issues, PRs, releases). The system never overwrites remote changes without explicit user confirmation. Branch protection and PR-based workflows are supported for team collaboration.",
        "scoring_criteria": [
            "Pre-configured user_github remote with automatic authentication",
            "Bidirectional sync on file writes and checkpoint saves to main branch",
            "Pull-before-push ensuring latest remote changes are incorporated",
            "Conflict detection with detailed descriptions and operation abort",
            "Logical merge for code changes with user choice for content conflicts",
            "GitHub Settings panel with repository info, disconnect, and clone commands",
            "gh CLI availability for issues, PRs, releases, and other GitHub operations",
            "Branch protection and PR-based workflow support for team collaboration",
        ],
    },
    "45-mobile-responsive.yaml": {
        "prompt": "Ensure all generated web applications are fully responsive across mobile, tablet, and desktop viewports with touch-optimized interactions and adaptive layouts.",
        "expected_behavior": "Mobile-first responsive design system ensuring all generated web applications work flawlessly across device sizes. Tailwind CSS responsive utilities (sm, md, lg, xl breakpoints) create adaptive layouts that reorganize content appropriately for each viewport. Touch-optimized interactions ensure tap targets meet minimum 44x44px accessibility guidelines with appropriate spacing. Navigation adapts between mobile hamburger menus and desktop navigation bars with smooth transitions. Typography scales responsively using clamp() for fluid sizing that maintains readability across devices. Images and media use responsive sizing with srcset and lazy loading for performance on mobile networks. Form inputs are optimized for mobile with appropriate input types (tel, email, number) triggering correct virtual keyboards. The preview panel provides responsive viewport testing with preset device sizes and custom dimensions. CSS Grid and Flexbox layouts handle content reflow gracefully without horizontal scrolling on any device.",
        "scoring_criteria": [
            "Mobile-first Tailwind CSS responsive design with sm/md/lg/xl breakpoints",
            "Touch-optimized 44x44px minimum tap targets with appropriate spacing",
            "Adaptive navigation (mobile hamburger to desktop nav bar) with smooth transitions",
            "Fluid typography using clamp() maintaining readability across all devices",
            "Responsive images with srcset and lazy loading for mobile network performance",
            "Mobile-optimized form inputs with correct virtual keyboard triggers",
            "Responsive viewport testing in preview panel with preset and custom sizes",
            "Graceful content reflow via Grid/Flexbox without horizontal scrolling",
        ],
    },
    "48-version-rollback.yaml": {
        "prompt": "Roll back web projects to any previous checkpoint state with full file system restoration, dependency recovery, and clear rollback confirmation workflow.",
        "expected_behavior": "Comprehensive version rollback system restoring projects to any previously saved checkpoint state with full fidelity. Rollback reverts the file system (code, configuration, dependencies) to the exact checkpoint state while preserving database data (schema and data are not reverted). The rollback interface in the Management UI version history shows all available checkpoints with descriptions, timestamps, and preview screenshots. One-click rollback from the checkpoint card initiates restoration with a confirmation dialog showing what will be changed. The system handles rollback of dependencies by restoring package.json and lock files, then reinstalling to match the checkpoint state. Post-rollback, the development server automatically restarts with the restored configuration. Rollback operations are logged with timestamps and the checkpoint version restored for audit trail. The system warns users about potential data inconsistencies when rolling back schema changes that affect existing database data. Emergency rollback via webdev_rollback_checkpoint is available when the workspace is unrecoverable manually.",
        "scoring_criteria": [
            "Full file system restoration to exact checkpoint state (code, config, dependencies)",
            "Database data preservation during rollback (schema reverts, data persists)",
            "Version history UI with descriptions, timestamps, and preview screenshots",
            "One-click rollback with confirmation dialog showing planned changes",
            "Dependency restoration via package.json/lock file revert and reinstall",
            "Automatic development server restart after rollback completion",
            "Audit trail logging rollback timestamps and restored checkpoint versions",
            "Data inconsistency warnings when rolling back schema changes affecting data",
        ],
    },
    "49-connectors-framework.yaml": {
        "prompt": "Provide an extensible connectors framework for integrating external services with unified error handling, retry logic, and health monitoring.",
        "expected_behavior": "Extensible connectors framework providing a standardized pattern for integrating external services into web applications. Each connector follows a consistent interface with typed configuration, initialization, health check, and operation methods. Built-in connectors include Stripe (payments), S3 (storage), OAuth (authentication), Google Maps (location services), and LLM (AI capabilities). The framework provides unified error handling that maps service-specific errors to consistent application error types with user-friendly messages. Automatic retry with exponential backoff handles transient failures across all connectors with configurable retry counts and delay parameters. Circuit breaker protection prevents cascading failures by temporarily disabling connectors that exceed error rate thresholds. Health monitoring checks connector availability on application startup and exposes status via a system health endpoint. New connectors are added by implementing the standard interface, automatically inheriting retry, circuit breaker, and monitoring capabilities. Configuration is managed through environment variables with validation on startup.",
        "scoring_criteria": [
            "Standardized connector interface with typed config, init, health check, and operations",
            "Built-in connectors for Stripe, S3, OAuth, Google Maps, and LLM services",
            "Unified error handling mapping service-specific errors to consistent application types",
            "Automatic retry with exponential backoff and configurable retry parameters",
            "Circuit breaker protection disabling connectors exceeding error rate thresholds",
            "Startup health monitoring with system health endpoint for all connectors",
            "New connector inheritance of retry, circuit breaker, and monitoring capabilities",
            "Environment variable configuration with startup validation for all connectors",
        ],
    },
    "53-microsoft-agent365.yaml": {
        "prompt": "Integrate with Microsoft 365 services enabling the agent to manage emails, calendar events, documents, and Teams messages through Graph API.",
        "expected_behavior": "Comprehensive Microsoft 365 integration via Graph API enabling programmatic management of emails, calendar, documents, and Teams communication. Email management supports reading inbox, composing and sending messages, managing folders, and handling attachments with rich HTML formatting. Calendar integration creates, updates, and deletes events with attendee management, recurrence patterns, and timezone-aware scheduling. OneDrive document management provides file upload, download, sharing, and collaborative editing with version history access. Teams integration sends messages to channels and chats, creates meetings, and manages team membership. Authentication uses OAuth 2.0 with Microsoft identity platform for secure delegated access with appropriate permission scopes. The integration handles pagination for large result sets (hundreds of emails, files) with efficient cursor-based retrieval. Batch requests optimize API usage by combining multiple operations into single HTTP calls. Error handling manages rate limits, permission errors, and service unavailability with informative user feedback.",
        "scoring_criteria": [
            "Email management (inbox, compose, send, folders, attachments) via Graph API",
            "Calendar integration with events, attendees, recurrence, and timezone scheduling",
            "OneDrive file management with upload, download, sharing, and version history",
            "Teams messaging to channels/chats with meeting creation and membership management",
            "OAuth 2.0 authentication with Microsoft identity platform and permission scopes",
            "Efficient pagination with cursor-based retrieval for large result sets",
            "Batch request optimization combining multiple operations into single HTTP calls",
            "Rate limit and permission error handling with informative user feedback",
        ],
    },
    "58-shared-session.yaml": {
        "prompt": "Enable real-time shared sessions where multiple users can observe and interact with the same agent task simultaneously with presence indicators.",
        "expected_behavior": "Real-time shared session system enabling multiple users to observe and interact with the same agent task simultaneously. Session sharing generates invite links with configurable permission levels (observe-only, interact, full control). Live presence indicators show connected users with color-coded cursors and name labels. The shared view synchronizes in real-time, showing agent actions, tool outputs, and conversation updates to all participants within 100ms latency. Interaction permissions allow designated users to send messages and provide input to the running task. Session chat enables participants to communicate with each other alongside the agent conversation. The host maintains full control with ability to revoke access, change permissions, and end the shared session. Connection management handles participant join/leave gracefully with notifications and automatic reconnection on network interruptions. Session recordings capture the full shared experience for later replay with participant interactions preserved.",
        "scoring_criteria": [
            "Invite link generation with configurable permission levels (observe, interact, control)",
            "Live presence indicators with color-coded cursors and name labels",
            "Sub-100ms real-time synchronization of agent actions and outputs to all participants",
            "Interaction permissions allowing designated users to send messages and input",
            "Participant chat alongside agent conversation for real-time communication",
            "Host controls for access revocation, permission changes, and session termination",
            "Graceful join/leave handling with notifications and automatic reconnection",
            "Session recording capturing full shared experience with participant interactions",
        ],
    },
    "59-voice-tts.yaml": {
        "prompt": "Convert text to natural-sounding speech with multiple voice options, language support, speed control, and streaming audio playback.",
        "expected_behavior": "Text-to-speech system converting agent responses and content to natural-sounding audio with configurable voice parameters. Multiple voice options provide variety in tone, gender, and speaking style for different use cases (professional, casual, narrative). Language support covers major languages with accent-appropriate pronunciation. Speed control allows adjustment from 0.5x to 2.0x with pitch preservation for comfortable listening at any rate. Streaming audio playback begins output before full generation completes, reducing perceived latency for long content. The audio player provides standard controls (play, pause, seek, volume) with progress indicator and remaining time display. Generated audio is downloadable in common formats (MP3, WAV) for offline use. The system handles long-form content by splitting into natural segments at sentence boundaries for smooth streaming. SSML support enables fine-grained control over pronunciation, emphasis, and pauses for specialized content.",
        "scoring_criteria": [
            "Natural-sounding speech with multiple voice options (tone, gender, speaking style)",
            "Multi-language support with accent-appropriate pronunciation",
            "Speed control (0.5x-2.0x) with pitch preservation for comfortable listening",
            "Streaming audio playback beginning before full generation completes",
            "Audio player with play/pause/seek/volume controls and progress indicator",
            "Downloadable audio in MP3 and WAV formats for offline use",
            "Natural segment splitting at sentence boundaries for smooth long-form streaming",
            "SSML support for fine-grained pronunciation, emphasis, and pause control",
        ],
    },
    "60-voice-stt.yaml": {
        "prompt": "Transcribe voice input to text with real-time streaming, language detection, speaker identification, and hands-free operation mode.",
        "expected_behavior": "Voice-to-text transcription system enabling hands-free agent interaction with real-time streaming recognition. The transcription pipeline uses Whisper API for high-accuracy speech recognition with automatic language detection across 50+ languages. Real-time streaming displays partial transcription results as the user speaks, providing immediate visual feedback. Speaker identification distinguishes between multiple speakers in multi-party conversations with labeled attribution. Hands-free operation mode allows continuous voice interaction without manual trigger buttons, using voice activity detection to identify speech segments. The system handles ambient noise with noise cancellation preprocessing for improved accuracy in non-ideal environments. Transcription results include timestamped segments for precise alignment with audio recordings. Confidence scores per segment enable quality assessment and flagging of uncertain transcriptions for review. The frontend handles audio capture with configurable input device selection and 16MB file size validation.",
        "scoring_criteria": [
            "Whisper API transcription with automatic language detection across 50+ languages",
            "Real-time streaming with partial results displayed as user speaks",
            "Speaker identification with labeled attribution in multi-party conversations",
            "Hands-free operation with voice activity detection for speech segment identification",
            "Noise cancellation preprocessing for accuracy in non-ideal environments",
            "Timestamped segments for precise alignment with audio recordings",
            "Confidence scores per segment for quality assessment and uncertain flagging",
            "Frontend audio capture with device selection and 16MB file size validation",
        ],
    },
    "61-document-generation.yaml": {
        "prompt": "Generate professional documents in multiple formats (PDF, Word, Excel, PowerPoint) with templates, styling, and data-driven content population.",
        "expected_behavior": "Comprehensive document generation system producing professional outputs in PDF, Word (DOCX), Excel (XLSX), and PowerPoint (PPTX) formats. PDF generation via weasyprint and fpdf2 supports rich formatting with headers, footers, page numbers, tables, images, and custom fonts. Word document creation via python-docx provides structured content with table of contents, headings, numbered lists, and letterhead templates. Excel spreadsheet generation via openpyxl creates formatted workbooks with formulas, charts, conditional formatting, and multiple worksheets. PowerPoint presentation generation creates slide decks with layouts, themes, speaker notes, and embedded charts. Each format follows domain-specific skills (pdf, docx, xlsx, pptx) with best practices for professional output. Template-based generation populates pre-designed layouts with dynamic data from database queries or API responses. The system handles large documents efficiently with streaming generation for 100+ page reports. Export format conversion (Markdown to PDF, data to Excel) provides flexible output options.",
        "scoring_criteria": [
            "PDF generation with headers, footers, page numbers, tables, images, and custom fonts",
            "Word document creation with TOC, headings, lists, and letterhead templates",
            "Excel workbook generation with formulas, charts, conditional formatting, and sheets",
            "PowerPoint slide decks with layouts, themes, speaker notes, and embedded charts",
            "Domain-specific skill integration (pdf, docx, xlsx, pptx) for best practices",
            "Template-based generation populating layouts with dynamic data from DB/API",
            "Efficient streaming generation for large documents (100+ pages)",
            "Flexible format conversion (Markdown to PDF, data to Excel) for output options",
        ],
    },
    "62-video-generation.yaml": {
        "prompt": "Generate professional videos from text descriptions using AI with scene composition, transitions, audio integration, and export in standard formats.",
        "expected_behavior": "AI-powered video generation system creating professional video content from text descriptions with the video-generator skill workflow. Scene composition breaks text prompts into individual scenes with visual descriptions, camera angles, and timing specifications. Veo3 integration generates high-quality video clips from scene descriptions with consistent style across scenes. Transition effects (cuts, fades, dissolves) connect scenes smoothly with configurable timing. Audio integration layers background music, voiceover narration, and sound effects with volume balancing. The generation pipeline supports multiple video styles (cinematic, documentary, commercial, educational) with style-consistent output. Export produces standard formats (MP4, WebM) with configurable resolution and quality settings. The system handles long-form content by generating scenes in parallel and assembling them with proper sequencing. Preview thumbnails are generated for each scene before full rendering, enabling rapid iteration on composition.",
        "scoring_criteria": [
            "Scene composition from text with visual descriptions, camera angles, and timing",
            "Veo3 AI video generation with consistent style across multiple scenes",
            "Smooth transition effects (cuts, fades, dissolves) with configurable timing",
            "Audio integration with background music, voiceover, and sound effect layering",
            "Multiple video styles (cinematic, documentary, commercial, educational)",
            "Standard format export (MP4, WebM) with configurable resolution and quality",
            "Parallel scene generation with proper sequencing for long-form content",
            "Preview thumbnails per scene enabling rapid composition iteration",
        ],
    },
    "65-zapier-integration.yaml": {
        "prompt": "Connect web applications to 5000+ services through Zapier webhooks with trigger configuration, action mapping, and workflow automation.",
        "expected_behavior": "Zapier integration connecting web applications to 5000+ external services through webhook-based triggers and actions. Outgoing webhooks fire on configurable application events (new user signup, form submission, payment completion, data update) with structured JSON payloads containing relevant event data. Incoming webhooks receive data from Zapier workflows, triggering application actions (create records, send notifications, update status) with payload validation. The integration dashboard displays active Zaps with trigger/action descriptions, execution history, and error logs. Webhook URL generation provides unique endpoints per integration with optional authentication tokens for security. Payload mapping transforms application data to Zapier-expected formats with field mapping configuration. Error handling retries failed webhook deliveries with exponential backoff and alerts on persistent failures. The system supports both instant triggers (real-time) and polling triggers (periodic checks) for different event types. Testing tools send sample payloads to verify webhook configuration before activating live integrations.",
        "scoring_criteria": [
            "Outgoing webhooks on configurable events with structured JSON payloads",
            "Incoming webhooks triggering application actions with payload validation",
            "Integration dashboard with active Zaps, execution history, and error logs",
            "Unique webhook URL generation with optional authentication tokens",
            "Payload mapping transforming data to Zapier-expected formats",
            "Retry with exponential backoff and alerts on persistent delivery failures",
            "Instant and polling trigger support for different event types",
            "Testing tools with sample payloads for pre-activation verification",
        ],
    },
    "66-maps-in-apps.yaml": {
        "prompt": "Integrate Google Maps into generated web applications with interactive maps, geocoding, directions, places search, and drawing tools via proxy authentication.",
        "expected_behavior": "Full Google Maps integration in generated web applications using the MapView component from client/src/components/Map.tsx with proxy-authenticated access requiring no API keys from users. The MapView component provides an interactive map with onMapReady callback for initializing any Google Maps service. Places API enables location search with autocomplete suggestions and detailed place information. Geocoding converts between addresses and coordinates with reverse geocoding support. Directions API calculates routes between points with multiple transport modes (driving, walking, transit, cycling) and turn-by-turn instructions. Drawing tools allow users to create markers, polygons, polylines, and circles on the map with event handlers for user interactions. Heatmap visualization displays density data with configurable gradient colors and radius. Street View integration provides immersive 360-degree imagery at any supported location. The proxy handles all authentication automatically, providing full access to all Google Maps JavaScript API features without feature limitations.",
        "scoring_criteria": [
            "MapView component with proxy-authenticated access requiring no user API keys",
            "Places API with autocomplete suggestions and detailed place information",
            "Geocoding and reverse geocoding between addresses and coordinates",
            "Directions API with multiple transport modes and turn-by-turn instructions",
            "Drawing tools for markers, polygons, polylines, and circles with event handlers",
            "Heatmap visualization with configurable gradient colors and radius",
            "Street View integration with 360-degree imagery at supported locations",
            "Full Google Maps JavaScript API access with no feature limitations via proxy",
        ],
    },
    "67-data-api.yaml": {
        "prompt": "Access external data through built-in API hub with automatic discovery, typed responses, and caching for common data sources.",
        "expected_behavior": "Built-in data API capability providing access to external data sources through the Manus API Hub without manual API key configuration. The omni_search tool with search_type='api' discovers available built-in APIs for common data needs (financial data, weather, news, social metrics). API responses are typed and structured for direct consumption in tRPC procedures and frontend components. Automatic caching reduces redundant API calls with configurable TTL per data source. The Data API supports real-time data retrieval for time-sensitive information (stock prices, weather, news) with streaming updates. Rate limiting is managed automatically by the platform, preventing quota exhaustion across concurrent requests. Error handling provides clear feedback when APIs are unavailable or return unexpected data with fallback suggestions. The system prioritizes built-in APIs over external alternatives, only recommending external API integration when no suitable built-in option exists. Response transformation normalizes data from different sources into consistent formats for application consumption.",
        "scoring_criteria": [
            "Built-in API discovery via omni_search for common data needs without API keys",
            "Typed and structured API responses for direct tRPC and frontend consumption",
            "Automatic caching with configurable TTL per data source reducing redundant calls",
            "Real-time data retrieval with streaming updates for time-sensitive information",
            "Platform-managed rate limiting preventing quota exhaustion across requests",
            "Clear error feedback with fallback suggestions when APIs are unavailable",
            "Built-in API prioritization over external alternatives with gap identification",
            "Response normalization from different sources into consistent application formats",
        ],
    },
}

# Process all enhancements
count = 0
for filename, data in sorted(ENHANCEMENTS.items()):
    # Read existing YAML to get id, name, title, category, status
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

print(f"\nEnhanced {count} capabilities to 8 scoring criteria each.")
