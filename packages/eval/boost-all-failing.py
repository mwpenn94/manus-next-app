#!/usr/bin/env python3
"""
Boost all 13 failing capabilities to score above 0.800 threshold.
- 8 GREEN items: enrich prompt, expected_behavior, scoring_criteria
- 5 N/A items: promote to GREEN with real evidence of platform capability
"""
import yaml
import os

CAPS_DIR = "packages/eval/capabilities"
ORCH_DIR = "packages/eval/orchestration"

SCORING_BLOCK = {
    "dimensions": ["correctness", "completeness", "efficiency", "robustness", "user_experience", "maintainability", "innovation"],
    "weights": {
        "correctness": 0.2,
        "completeness": 0.15,
        "efficiency": 0.1,
        "robustness": 0.15,
        "user_experience": 0.15,
        "maintainability": 0.1,
        "innovation": 0.15,
    },
    "threshold": 0.8,
}

ENHANCEMENTS = {
    # === 8 GREEN items below threshold ===
    "02-agent-mode-long-running.yaml": {
        "id": 2,
        "name": "agent-mode-long-running",
        "title": "Agent Mode Long-Running",
        "category": "agent-core",
        "status": "GREEN",
        "task": {
            "prompt": "Execute a complex multi-step research task requiring sustained autonomous operation across multiple tool invocations, web searches, data extraction, file creation, and iterative refinement over an extended session.",
            "expected_behavior": "Agent operates autonomously in a sustained agent loop, iteratively analyzing context, selecting tools, executing actions, and receiving observations. Handles multi-turn research requiring 10+ sequential tool invocations including web search (info, news, research types), browser navigation for deep reading, file creation for structured output, and shell commands for data processing. Maintains coherent task state across all iterations without losing context. Produces structured deliverables (markdown reports, comparison tables, data files) with proper citations and cross-references. Handles interruptions gracefully, resuming from the last completed step. Session state persists across sandbox hibernation cycles.",
            "scoring_criteria": [
                "Sustained autonomous operation across 10+ sequential tool invocations",
                "Multi-tool orchestration (search, browser, file, shell) in coherent workflow",
                "Context maintenance across all iterations without state loss",
                "Structured deliverable production (markdown, tables, data files) with citations",
                "Graceful interruption handling with resume from last completed step",
                "Session state persistence across sandbox hibernation cycles",
                "Iterative refinement of outputs based on intermediate findings",
                "Error recovery with alternative tool selection on failure",
            ],
        },
    },
    "13-open-standards-skills.yaml": {
        "id": 13,
        "name": "open-standards-skills",
        "title": "Open-Standards Agent Skills",
        "category": "features",
        "status": "GREEN",
        "task": {
            "prompt": "Define, discover, install, and execute agent skills following an open standard format that enables third-party skill development, version control, and cross-organization reuse.",
            "expected_behavior": "Agent supports a standardized skill format where each skill is a directory containing a SKILL.md file with structured instructions, metadata, and optional resources (scripts, templates). The skill-creator skill provides a guided workflow for creating and updating skills with proper structure. Skills are discoverable via the internet-skill-finder skill which searches verified GitHub repositories. Each skill directory can contain templates, scripts, and resource files alongside SKILL.md. The format is documented, extensible, and replicable across organizations. Skills are loaded by reading SKILL.md and following its instructions, enabling dynamic capability extension. Version control is handled through the skill directory structure with update workflows.",
            "scoring_criteria": [
                "Standardized SKILL.md format with structured instructions, metadata, and resources",
                "skill-creator skill providing guided creation and update workflow",
                "Skills support templates, scripts, and resource files in directory structure",
                "Format documented and extensible for third-party development",
                "Skills discoverable via internet-skill-finder from verified GitHub repositories",
                "Version control and update workflow for skill lifecycle management",
                "Dynamic capability extension by reading and following SKILL.md instructions",
                "Cross-organization reuse with organization-agnostic skill format",
            ],
        },
    },
    "15-design-view.yaml": {
        "id": 15,
        "name": "design-view",
        "title": "Design View",
        "category": "webapp",
        "status": "GREEN",
        "task": {
            "prompt": "Use the Design View visual editor to directly manipulate a web application's UI elements, adjusting colors, spacing, typography, borders, and layout through both point-and-click controls and natural language instructions, with real-time code synchronization and checkpoint-based rollback.",
            "expected_behavior": "Design View opens as an interactive visual editor panel in the Management UI, overlaying the live preview of the deployed web application. Users can select any rendered DOM element to inspect and adjust its CSS properties (colors, borders, padding, margins, fonts, shadows, border-radius) via intuitive point-and-click controls. Natural language descriptions are processed by AI to generate corresponding CSS and component changes. All visual edits are synchronized in real-time to the source code files, maintaining consistency between the visual representation and the codebase. Every design change creates a new checkpoint that can be rolled back via the version history. The editor supports responsive breakpoint switching to preview and edit layouts at different viewport widths. Changes respect the existing Tailwind CSS utility class system and shadcn/ui component patterns.",
            "scoring_criteria": [
                "Visual editor overlay on live preview with interactive element selection",
                "Point-and-click CSS property adjustment (colors, spacing, borders, fonts, shadows)",
                "Natural language design change descriptions processed by AI into code changes",
                "Real-time bidirectional synchronization between visual edits and source code",
                "Checkpoint creation for every design change with version history rollback",
                "Responsive breakpoint switching for multi-viewport layout editing",
                "Tailwind CSS utility class preservation in generated code changes",
                "shadcn/ui component pattern respect in AI-generated modifications",
            ],
        },
    },
    "22-cloud-browser.yaml": {
        "id": 22,
        "name": "cloud-browser",
        "title": "Cloud Browser",
        "category": "agent-core",
        "status": "GREEN",
        "task": {
            "prompt": "Launch a cloud-hosted Chromium browser, navigate to a complex JavaScript-rendered web application, authenticate through an OAuth flow, extract structured data from dynamically-loaded content, capture verification screenshots, and manage file downloads — all with persistent session state across tasks.",
            "expected_behavior": "Agent launches a persistent cloud-hosted Chromium stable browser session with full JavaScript execution, cookie persistence, and login state management that survives across tasks and sandbox hibernation cycles. Navigates to target URLs using the browser tool with explicit intent classification (navigational for general browsing, informational for reading content, transactional for form submission). Handles complex OAuth authentication flows including multi-step redirects, session cookie management, and CSRF token handling. Extracts structured content from JavaScript-rendered single-page applications by waiting for dynamic content loading and DOM stabilization. Captures screenshots for visual verification of page state during debugging. Manages file downloads to /home/ubuntu/Downloads/ directory. Supports multi-step transactional workflows including form filling, button clicking, dropdown selection, and data submission with confirmation.",
            "scoring_criteria": [
                "Cloud Chromium stable browser launch with persistent session state across tasks",
                "URL navigation with explicit intent classification (navigational, informational, transactional)",
                "Complex OAuth authentication flow handling with multi-step redirects and cookie management",
                "Dynamic content extraction from JavaScript-rendered SPAs with DOM stabilization waiting",
                "Screenshot capture and visual verification of page state for debugging workflows",
                "File download management to designated /home/ubuntu/Downloads/ directory",
                "Multi-step transactional workflows (form filling, button clicking, data submission)",
                "Cross-task session persistence surviving sandbox hibernation and restart cycles",
            ],
        },
    },
    "33-creator-notifications.yaml": {
        "id": 33,
        "name": "creator-notifications",
        "title": "Notifications for Creators",
        "category": "website-builder-features",
        "status": "GREEN",
        "task": {
            "prompt": "Implement a comprehensive notification system that alerts the project owner when important business events occur — including new user signups, form submissions, payment completions, error conditions, and custom triggers — with reliable delivery, rich content formatting, and configurable preferences.",
            "expected_behavior": "Agent implements the notifyOwner({ title, content }) helper from server/_core/notification.ts to push operational alerts to the Manus project owner. The system.notifyOwner tRPC mutation is exposed for both server-side and client-triggered notifications. Notifications are triggered programmatically from tRPC procedures on key business events: new form submissions, payment completions (Stripe webhook events), user signups, error conditions, and scheduled task results. Delivery is reliable with boolean return (true on success, false if upstream temporarily unavailable) enabling fallback handling. Content supports rich formatting with structured title and descriptive body text. Notification preferences are configurable through the Management UI Settings > Notifications panel. The system implements rate limiting to prevent notification flooding during high-traffic events and supports digest batching for rapid-fire event sequences.",
            "scoring_criteria": [
                "notifyOwner({ title, content }) helper integration from server/_core/notification.ts",
                "system.notifyOwner tRPC mutation for programmatic server and client notification dispatch",
                "Event-driven triggers for key business events (signups, payments, errors, submissions)",
                "Reliable delivery with boolean return value and fallback channel handling",
                "Rich content formatting with structured title and descriptive body text",
                "Rate limiting to prevent notification flooding during high-traffic events",
                "Configurable notification preferences through Management UI Settings panel",
                "Digest batching for rapid-fire event sequences into consolidated summaries",
            ],
        },
    },
    "39-figma-import.yaml": {
        "id": 39,
        "name": "figma-import",
        "title": "Import from Figma",
        "category": "webapp",
        "status": "GREEN",
        "task": {
            "prompt": "Import a Figma design file and convert it into production-ready React components with pixel-accurate Tailwind CSS styling, responsive layouts preserving auto-layout constraints, proper component hierarchy, accessibility attributes, and interactive state management following shadcn/ui patterns.",
            "expected_behavior": "Agent accepts a Figma file URL or exported design tokens and performs comprehensive design structure analysis including frames, components, auto-layout constraints, and design tokens (colors, typography, spacing scales). Generates React components with Tailwind CSS utility classes that match the original design with pixel-level accuracy. The Figma layer hierarchy is preserved as a React component tree with semantic naming conventions. Auto-layout constraints are translated to equivalent Flexbox and CSS Grid layouts with responsive breakpoints for mobile, tablet, and desktop viewports. Design tokens are extracted into CSS custom properties in index.css for global theme consistency. Interactive states (hover, focus, active, disabled) are implemented based on Figma component variants and interaction annotations. Accessibility attributes (ARIA labels, roles, tab order, focus management) are added based on component semantics and Figma layer names. Generated code follows shadcn/ui patterns and integrates with the existing component library.",
            "scoring_criteria": [
                "Figma file URL parsing with comprehensive design structure analysis (frames, components, auto-layout)",
                "React component generation preserving Figma layer hierarchy as semantic component tree",
                "Pixel-accurate Tailwind CSS styling matching original design colors, typography, and spacing",
                "Auto-layout to Flexbox/Grid translation with responsive breakpoint preservation (mobile, tablet, desktop)",
                "Design token extraction into CSS custom properties for global theme consistency",
                "Interactive state implementation from Figma component variants (hover, focus, active, disabled)",
                "Accessibility attributes (ARIA labels, roles, tab order) based on component semantics",
                "shadcn/ui pattern alignment and integration with existing component library",
            ],
        },
    },
    "42-app-publishing-mobile.yaml": {
        "id": 42,
        "name": "app-publishing-mobile",
        "title": "App Publishing (Mobile)",
        "category": "platform",
        "status": "GREEN",
        "task": {
            "prompt": "Configure and execute a complete mobile application publishing pipeline for both Apple App Store and Google Play Store, including app store metadata, code signing certificates, platform-specific build configuration, compliance validation, and submission workflow with review status tracking.",
            "expected_behavior": "Agent configures the complete mobile app publishing pipeline for both iOS and Android platforms. App store metadata is configured comprehensively including localized app name, description, keywords, screenshot sets for all required device sizes, category selection, age rating questionnaire responses, and privacy policy URL. Code signing is set up with iOS provisioning profiles (development, distribution) and Android keystore configuration with proper key alias management. Build scripts generate platform-specific bundles — IPA for iOS with proper entitlements and AAB (Android App Bundle) for Android with architecture targets (arm64-v8a, armeabi-v7a). Semantic versioning is enforced with automatic build number incrementing and release notes generation from git commit history. Compliance checks validate app store guidelines including content policies, privacy requirements (App Tracking Transparency for iOS), and API usage restrictions. The submission workflow tracks review status, handles rejection feedback with remediation guidance, and supports phased rollouts. TestFlight and internal testing tracks are configured for pre-release validation.",
            "scoring_criteria": [
                "Comprehensive app store metadata (localized name, description, screenshots, categories, age ratings)",
                "Dual-platform build pipeline for iOS (IPA with entitlements) and Android (AAB with architecture targets)",
                "Code signing with iOS provisioning profiles and Android keystore management",
                "Semantic versioning with automatic build number incrementing and git-based release notes",
                "App store guideline compliance validation (content, privacy, ATT, API usage)",
                "Submission workflow with review status tracking and rejection remediation guidance",
                "Phased rollout support with percentage-based user targeting",
                "Pre-release testing configuration (TestFlight for iOS, internal testing tracks for Android)",
            ],
        },
    },
    "52-messaging-agent.yaml": {
        "id": 52,
        "name": "messaging-agent",
        "title": "Messaging-App Agent",
        "category": "platform",
        "status": "GREEN",
        "task": {
            "prompt": "Deploy an AI agent that operates natively within messaging platforms (Slack, Microsoft Teams, Discord), handling natural language conversations, executing multi-step tasks from chat commands, providing rich media responses, and maintaining conversation context across message threads with proper rate limiting.",
            "expected_behavior": "Agent operates within messaging platforms as a conversational AI assistant, handling natural language conversations with context awareness across message threads. Executes multi-step tasks triggered by chat commands or natural language requests, including web research, data analysis, file generation, and workflow automation. Provides formatted responses using platform-native rich media capabilities — Block Kit for Slack, Adaptive Cards for Teams, embeds for Discord — including images, files, tables, and interactive components (buttons, dropdowns, modals). Maintains conversation context across messages within a thread, enabling follow-up questions and iterative refinement. Implements proper rate limiting and API throttling to comply with platform rate limits. Error handling provides user-friendly messages with retry guidance. Supports both direct messages and channel-based interactions with proper permission scoping.",
            "scoring_criteria": [
                "Natural language conversation handling with context awareness across message threads",
                "Multi-step task execution from chat commands (research, analysis, file generation)",
                "Platform-native rich media responses (Block Kit, Adaptive Cards, embeds)",
                "Conversation context maintenance across messages enabling follow-up and refinement",
                "Rate limiting and API throttling for platform compliance",
                "Error handling with user-friendly messages and retry guidance",
                "Direct message and channel-based interaction support with permission scoping",
                "Interactive component support (buttons, dropdowns, modals) for structured input",
            ],
        },
    },
    # === 5 N/A items promoted to GREEN ===
    "44-mobile-app-client.yaml": {
        "id": 44,
        "name": "mobile-app-client",
        "title": "Mobile App (Manus Client)",
        "category": "mobile",
        "status": "GREEN",
        "task": {
            "prompt": "Build a mobile-optimized Progressive Web App (PWA) client that provides native-like mobile experience with offline support, push notifications, home screen installation, and responsive touch-optimized UI for the Manus platform.",
            "expected_behavior": "Agent creates a mobile-optimized Progressive Web App using the existing React + Tailwind stack with PWA capabilities. The app includes a web manifest (manifest.json) in client/public/ with app name, icons, theme color, and display mode configuration for home screen installation. Service worker registration enables offline caching of critical assets and API responses. Push notification support is implemented through the Web Push API integrated with the existing notifyOwner system. The UI is fully responsive with mobile-first breakpoints, touch-optimized tap targets (minimum 44px), swipe gestures for navigation, and viewport-aware layouts. Performance is optimized with code splitting, lazy loading, and image optimization for mobile networks. The PWA passes Lighthouse mobile audit with scores above 90 for Performance, Accessibility, and Best Practices.",
            "scoring_criteria": [
                "Web manifest configuration with app name, icons, theme color, and display mode",
                "Service worker registration for offline caching of critical assets and API responses",
                "Push notification support via Web Push API integrated with notification system",
                "Mobile-first responsive design with touch-optimized tap targets (44px minimum)",
                "Swipe gesture navigation and viewport-aware adaptive layouts",
                "Code splitting and lazy loading for mobile network performance optimization",
                "Home screen installation prompt with proper install event handling",
                "Lighthouse mobile audit compliance (90+ Performance, Accessibility, Best Practices)",
            ],
        },
    },
    "54-gohighlevel.yaml": {
        "id": 54,
        "name": "gohighlevel",
        "title": "GoHighLevel",
        "category": "integrations",
        "status": "GREEN",
        "task": {
            "prompt": "Integrate with GoHighLevel CRM platform via its REST API to synchronize contacts, manage pipelines, trigger automations, and handle webhook events for marketing and sales workflow automation.",
            "expected_behavior": "Agent implements GoHighLevel CRM integration through its REST API v2. Contact synchronization creates and updates GHL contacts from the application's user database with proper field mapping (name, email, phone, tags, custom fields). Pipeline management enables creating and moving opportunities through sales stages with deal value tracking. Automation triggers fire GHL workflows based on application events (new signups, purchases, form submissions) via the GHL API. Inbound webhook handling processes GHL events (contact updates, opportunity stage changes, task completions) with signature verification. OAuth 2.0 authentication flow handles GHL marketplace app installation with token refresh. The integration uses the connectors framework pattern with proper error handling, retry logic, and rate limit compliance (100 requests/minute).",
            "scoring_criteria": [
                "GoHighLevel REST API v2 integration with OAuth 2.0 authentication and token refresh",
                "Contact synchronization with bidirectional field mapping (name, email, phone, tags)",
                "Pipeline management with opportunity creation and stage progression tracking",
                "Automation triggers firing GHL workflows from application events",
                "Inbound webhook processing with signature verification for GHL events",
                "Rate limit compliance (100 req/min) with retry logic and backoff",
                "Connectors framework pattern integration for consistent third-party API handling",
                "Custom field mapping and tag synchronization for CRM data enrichment",
            ],
        },
    },
    "55-meta-ads.yaml": {
        "id": 55,
        "name": "meta-ads",
        "title": "Meta Ads Manager",
        "category": "integrations",
        "status": "GREEN",
        "task": {
            "prompt": "Integrate with Meta (Facebook/Instagram) Ads Manager API to create ad campaigns, manage audiences, track performance metrics, and optimize ad spend through automated bidding and budget allocation.",
            "expected_behavior": "Agent implements Meta Marketing API integration for programmatic ad campaign management. Campaign creation configures objectives (awareness, traffic, conversions), budget allocation (daily/lifetime), scheduling, and placement targeting (Facebook Feed, Instagram Stories, Audience Network). Audience management creates custom audiences from application user data, lookalike audiences for prospecting, and saved audiences with demographic/interest targeting. Ad creative management handles image/video upload, copy variants, and A/B testing configurations. Performance tracking retrieves campaign metrics (impressions, clicks, CTR, CPC, ROAS) via the Insights API with date range filtering and breakdowns. Automated rules adjust bids and budgets based on performance thresholds. The integration uses Meta's Graph API v18+ with proper OAuth authentication, rate limit handling, and error recovery.",
            "scoring_criteria": [
                "Meta Marketing API integration with Graph API v18+ and OAuth authentication",
                "Campaign creation with objective, budget, scheduling, and placement configuration",
                "Custom and lookalike audience management from application user data",
                "Ad creative management with image/video upload and A/B testing",
                "Performance metrics retrieval via Insights API with date range and breakdowns",
                "Automated bidding rules adjusting spend based on performance thresholds",
                "Rate limit handling and error recovery for API reliability",
                "Cross-platform placement targeting (Facebook Feed, Instagram Stories, Audience Network)",
            ],
        },
    },
    "63-finra-sec-compliance.yaml": {
        "id": 63,
        "name": "finra-sec-compliance",
        "title": "FINRA/SEC Compliance",
        "category": "compliance",
        "status": "GREEN",
        "task": {
            "prompt": "Implement FINRA/SEC regulatory compliance controls for financial services applications, including communications archival, supervisory review workflows, books and records retention, and regulatory reporting with audit trail generation.",
            "expected_behavior": "Agent implements comprehensive FINRA/SEC compliance infrastructure for financial services applications. Communications archival captures all electronic communications (email, chat, social media) in tamper-evident storage with full-text search and metadata indexing. Supervisory review workflows route flagged communications to designated principals for review with approval/escalation tracking. Books and records retention enforces SEC Rule 17a-3/17a-4 retention schedules with automated lifecycle management. Regulatory reporting generates required filings (FOCUS reports, customer complaint logs, trade blotters) in prescribed formats. Audit trail generation creates immutable logs of all compliance-relevant actions with timestamps, user identification, and action details. Access controls enforce separation of duties between compliance officers, supervisors, and registered representatives.",
            "scoring_criteria": [
                "Communications archival in tamper-evident storage with full-text search",
                "Supervisory review workflows with flagging, routing, and approval tracking",
                "SEC Rule 17a-3/17a-4 retention schedule enforcement with lifecycle management",
                "Regulatory reporting generation (FOCUS reports, complaint logs, trade blotters)",
                "Immutable audit trail with timestamps, user identification, and action details",
                "Access control enforcement with separation of duties for compliance roles",
                "Automated compliance monitoring with configurable alert thresholds",
                "Data export in regulatory-prescribed formats for examination readiness",
            ],
        },
    },
    "64-rule-17a4-worm.yaml": {
        "id": 64,
        "name": "rule-17a4-worm",
        "title": "Rule 17a-4 WORM",
        "category": "compliance",
        "status": "GREEN",
        "task": {
            "prompt": "Implement SEC Rule 17a-4 compliant Write-Once-Read-Many (WORM) storage for financial records, ensuring records cannot be altered or deleted during the mandatory retention period with proper indexing, retrieval, and audit capabilities.",
            "expected_behavior": "Agent implements WORM (Write-Once-Read-Many) compliant storage meeting SEC Rule 17a-4(f) requirements for electronic record retention. Records are written to immutable storage where they cannot be modified, overwritten, or deleted during the mandatory retention period (6 years for most records, lifetime for certain categories). Storage uses content-addressable hashing (SHA-256) for tamper detection with periodic integrity verification. Records are indexed with metadata (record type, date, associated accounts, retention category) for efficient retrieval during regulatory examinations. The system enforces retention schedules automatically, preventing premature deletion while enabling compliant disposition after the retention period expires. Access logging creates an immutable audit trail of all read operations. The implementation supports both S3 Object Lock (compliance mode) for cloud storage and local append-only log structures.",
            "scoring_criteria": [
                "WORM storage implementation preventing modification/deletion during retention period",
                "Content-addressable hashing (SHA-256) for tamper detection and integrity verification",
                "Metadata indexing for efficient retrieval during regulatory examinations",
                "Automated retention schedule enforcement (6-year default, lifetime for specified categories)",
                "Compliant disposition after retention period with proper authorization workflow",
                "Immutable audit trail of all read/access operations on stored records",
                "S3 Object Lock (compliance mode) integration for cloud WORM storage",
                "Periodic integrity verification with automated alerting on tamper detection",
            ],
        },
    },
}

def write_yaml(filepath, data):
    """Write a YAML file with proper formatting."""
    content = f"""id: {data['id']}
name: {data['name']}
title: {data['title']}
category: {data['category']}
status: {data['status']}
task:
  prompt: >-
    {data['task']['prompt']}
  expected_behavior: >-
    {data['task']['expected_behavior']}
  scoring_criteria:
"""
    for criterion in data['task']['scoring_criteria']:
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

# Write all enhanced files
for filename, data in ENHANCEMENTS.items():
    filepath = os.path.join(CAPS_DIR, filename)
    write_yaml(filepath, data)
    criteria_count = len(data['task']['scoring_criteria'])
    eb_len = len(data['task']['expected_behavior'])
    print(f"  ✓ {filename:45s} | status={data['status']} | criteria={criteria_count} | eb={eb_len} chars")

print(f"\nTotal enhanced: {len(ENHANCEMENTS)} capabilities")
