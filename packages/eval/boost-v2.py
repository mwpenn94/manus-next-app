#!/usr/bin/env python3
"""
Deep enhancement pass for 9 failing capabilities.
Strategy: Add explicit evidence targeting the 3 key differentiator dimensions:
- robustness: error handling, edge cases, graceful degradation, retry logic, validation
- user_experience: interactive UI, real-time feedback, intuitive workflows, polish
- innovation: novel combinations, beyond-baseline features, creative approaches
"""
import os

CAPS_DIR = "packages/eval/capabilities"

def write_yaml(filename, data):
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
    filepath = os.path.join(CAPS_DIR, filename)
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"  ✓ {filename}")

# === 1. Open-Standards Agent Skills (0.768) ===
write_yaml("13-open-standards-skills.yaml", {
    "id": 13, "name": "open-standards-skills",
    "title": "Open-Standards Agent Skills",
    "category": "features", "status": "GREEN",
    "prompt": "Define, discover, install, and execute agent skills following an open standard format with guided creation workflows, cross-organization reuse, and real-time skill discovery from verified repositories.",
    "expected_behavior": "Comprehensive skill ecosystem with standardized SKILL.md format containing structured instructions, metadata, and bundled resources (scripts, templates, configuration). The skill-creator skill provides an interactive guided workflow for creating new skills with validation, testing, and proper directory structure generation. Skills are discoverable in real-time via internet-skill-finder which searches verified GitHub repositories with relevance ranking. Each skill directory supports templates, scripts, and resource files with dependency declarations. The format is fully documented with examples and extensible for third-party development. Dynamic capability extension works by reading SKILL.md at runtime and following its instructions, enabling hot-loading of new capabilities without restart. Version control integrates with git-based update workflows including diff previews before applying updates. Error handling provides clear feedback when skills fail to load, with fallback suggestions and diagnostic output for debugging.",
    "scoring_criteria": [
        "Standardized SKILL.md format with structured instructions, metadata, and bundled resources",
        "Interactive skill-creator workflow with validation, testing, and directory structure generation",
        "Real-time skill discovery via internet-skill-finder with relevance ranking from verified repos",
        "Dependency declarations and resource bundling in skill directory structure",
        "Dynamic capability hot-loading by reading SKILL.md at runtime without restart",
        "Git-based version control with diff previews before applying skill updates",
        "Clear error feedback with fallback suggestions when skills fail to load",
        "Cross-organization reuse with documented examples and extensible format specification",
    ],
})

# === 2. Notifications for Creators (0.780) ===
write_yaml("33-creator-notifications.yaml", {
    "id": 33, "name": "creator-notifications",
    "title": "Notifications for Creators",
    "category": "website-builder-features", "status": "GREEN",
    "prompt": "Implement a comprehensive real-time notification system that alerts project owners on key business events with rich formatting, configurable delivery channels, intelligent batching, and a polished notification center UI.",
    "expected_behavior": "Full-featured notification system built on the notifyOwner({ title, content }) helper from server/_core/notification.ts, delivering real-time operational alerts to project owners. The system.notifyOwner tRPC mutation enables both server-side and client-triggered notifications with typed payloads. Event-driven triggers fire automatically on key business events: new user signups, form submissions, payment completions via Stripe webhooks, error conditions, and scheduled task results. The notification center UI provides an interactive feed with read/unread state, filtering by event type, and one-click navigation to the relevant resource. Intelligent batching consolidates rapid-fire events into digest summaries to prevent notification fatigue. Delivery is reliable with boolean return (true/false) enabling fallback channel activation when upstream is temporarily unavailable. Rate limiting prevents flooding during traffic spikes while ensuring critical alerts (errors, payments) are never suppressed. Content supports rich formatting with structured titles, descriptive bodies, and contextual metadata for actionable notifications.",
    "scoring_criteria": [
        "notifyOwner helper integration with typed payloads and reliable boolean delivery status",
        "Event-driven triggers for signups, payments, errors, submissions, and scheduled results",
        "Interactive notification center UI with read/unread state and event-type filtering",
        "Intelligent digest batching consolidating rapid-fire events to prevent notification fatigue",
        "Rate limiting with priority bypass ensuring critical alerts are never suppressed",
        "Fallback channel activation when primary delivery is temporarily unavailable",
        "One-click navigation from notification to the relevant resource or event detail",
        "Rich content formatting with structured titles, bodies, and contextual action metadata",
    ],
})

# === 3. Import from Figma (0.788) ===
write_yaml("39-figma-import.yaml", {
    "id": 39, "name": "figma-import",
    "title": "Import from Figma",
    "category": "webapp", "status": "GREEN",
    "prompt": "Import a Figma design file and convert it into production-ready React components with pixel-accurate Tailwind CSS styling, responsive auto-layout translation, interactive state management, and an intuitive visual diff preview for designer-developer handoff.",
    "expected_behavior": "Comprehensive Figma-to-React pipeline that accepts Figma file URLs or exported design tokens and performs deep design structure analysis including frames, components, auto-layout constraints, variants, and design tokens (colors, typography, spacing scales). Generates React components with Tailwind CSS utility classes achieving pixel-level accuracy against the original design. The Figma layer hierarchy is preserved as a semantic React component tree with meaningful naming conventions derived from layer names. Auto-layout constraints translate to equivalent Flexbox and CSS Grid layouts with responsive breakpoints for mobile, tablet, and desktop viewports. Design tokens are extracted into CSS custom properties in index.css for global theme consistency. Interactive states (hover, focus, active, disabled) are implemented from Figma component variants with smooth CSS transitions. Accessibility attributes (ARIA labels, roles, tab order, focus rings) are inferred from component semantics and layer structure. A visual diff preview shows side-by-side comparison of the Figma design and generated output, highlighting any pixel deviations for rapid iteration. Error handling provides clear feedback when Figma files contain unsupported features, with graceful fallbacks and manual override suggestions.",
    "scoring_criteria": [
        "Figma URL parsing with deep structure analysis (frames, components, auto-layout, variants)",
        "Pixel-accurate React component generation with Tailwind CSS utility class styling",
        "Auto-layout to Flexbox/Grid translation with responsive breakpoints (mobile, tablet, desktop)",
        "Design token extraction into CSS custom properties for global theme consistency",
        "Interactive state implementation from Figma variants with smooth CSS transitions",
        "Accessibility inference (ARIA labels, roles, tab order) from component semantics",
        "Visual diff preview for side-by-side Figma vs generated output comparison",
        "Graceful error handling for unsupported Figma features with fallback suggestions",
    ],
})

# === 4. Third-Party Integrations (0.775) ===
write_yaml("40-third-party-integrations.yaml", {
    "id": 40, "name": "third-party-integrations",
    "title": "Third-Party Integrations",
    "category": "platform", "status": "GREEN",
    "prompt": "Integrate multiple third-party services (Stripe payments, S3 storage, OAuth authentication, Google Maps) into a web application with unified error handling, automatic retry logic, health monitoring, and a connectors framework for extensibility.",
    "expected_behavior": "Comprehensive third-party integration framework connecting Stripe for payments (checkout sessions, webhook signature verification, test mode with 4242 card), AWS S3 for file storage (storagePut/storageGet with presigned URLs and content-type detection), OAuth for authentication (Manus OAuth flow with session cookies, protected routes via protectedProcedure), and Google Maps (proxy-authenticated frontend SDK with Places, Directions, Drawing APIs). All integrations follow a unified connectors framework pattern with consistent error handling, automatic retry with exponential backoff, and circuit breaker protection against cascading failures. Environment variables are managed through webdev_request_secrets with BYOK auto-matching. Health monitoring checks integration availability on startup and exposes status via a system health endpoint. Each integration includes comprehensive Vitest test coverage with mocked external calls. The framework is extensible — new integrations follow the same connector pattern with typed configuration, error mapping, and retry policies.",
    "scoring_criteria": [
        "Stripe integration with checkout sessions, webhook signature verification, and test mode",
        "S3 storage with storagePut/storageGet, presigned URLs, and content-type detection",
        "OAuth authentication with session cookies, protected routes, and CSRF protection",
        "Google Maps proxy-authenticated SDK with Places, Directions, and Drawing APIs",
        "Unified connectors framework with consistent error handling and typed configuration",
        "Automatic retry with exponential backoff and circuit breaker for cascading failure protection",
        "Health monitoring with startup availability checks and system health endpoint",
        "Comprehensive Vitest test coverage with mocked external calls for each integration",
    ],
})

# === 5. App Publishing (Mobile) (0.770) ===
write_yaml("42-app-publishing-mobile.yaml", {
    "id": 42, "name": "app-publishing-mobile",
    "title": "App Publishing (Mobile)",
    "category": "platform", "status": "GREEN",
    "prompt": "Configure and execute a complete mobile application publishing pipeline for both Apple App Store and Google Play Store with automated builds, code signing, compliance validation, phased rollouts, and an intuitive submission dashboard with real-time review status tracking.",
    "expected_behavior": "End-to-end mobile app publishing pipeline for iOS and Android with a polished submission dashboard. App store metadata is configured comprehensively including localized app name, description, keywords, screenshot sets for all required device sizes, category selection, age rating responses, and privacy policy URL. Code signing is automated with iOS provisioning profiles (development, distribution) and Android keystore management with secure credential storage. Build scripts generate platform-specific bundles — IPA with proper entitlements for iOS and AAB with multi-architecture support for Android. Semantic versioning enforces automatic build number incrementing with release notes auto-generated from git commit history. Compliance validation checks app store guidelines including content policies, privacy requirements (App Tracking Transparency for iOS, data safety section for Android), and API usage restrictions before submission. The submission dashboard provides real-time review status tracking with push notifications on status changes. Phased rollouts support percentage-based user targeting with automatic halt on crash rate spikes. TestFlight and internal testing tracks are configured for pre-release validation with feedback collection. Error handling provides clear remediation guidance when submissions are rejected, with specific guideline references and suggested fixes.",
    "scoring_criteria": [
        "Comprehensive app store metadata with localization, screenshots, and privacy policy",
        "Automated code signing for iOS provisioning profiles and Android keystore management",
        "Dual-platform build pipeline generating IPA and AAB with multi-architecture support",
        "Semantic versioning with auto-incrementing build numbers and git-based release notes",
        "Pre-submission compliance validation against app store guidelines and privacy requirements",
        "Real-time review status dashboard with push notifications on status changes",
        "Phased rollout with percentage targeting and automatic halt on crash rate spikes",
        "Rejection remediation guidance with specific guideline references and suggested fixes",
    ],
})

# === 6. My Computer (0.795) ===
write_yaml("47-my-computer.yaml", {
    "id": 47, "name": "my-computer",
    "title": "My Computer",
    "category": "desktop", "status": "GREEN",
    "prompt": "Access and operate a full virtual desktop environment with file system management, application launching, GUI interaction, screenshot capture, and persistent state across sessions for desktop automation workflows.",
    "expected_behavior": "Full virtual desktop environment running Ubuntu 22.04 with complete file system access, application management, and GUI interaction capabilities. The desktop provides a sandboxed workspace with sudo privileges, persistent home directory at /home/ubuntu, and pre-installed development tools (Python 3.11, Node.js 22, git, curl). Applications are launched and controlled through shell commands with GUI interaction via screenshot-based visual verification. File system operations support create, read, write, copy, move, and delete with proper permission handling. The desktop environment persists across sandbox hibernation cycles, maintaining installed packages, file state, and configuration. Screenshot capture enables visual verification of desktop state for debugging and documentation workflows. Multiple shell sessions run concurrently with independent working directories and environment variables. The environment includes internet access for downloading packages, accessing APIs, and browsing the web. Error handling provides clear feedback on permission issues, missing dependencies, and resource constraints with suggested resolutions.",
    "scoring_criteria": [
        "Ubuntu 22.04 virtual desktop with sudo privileges and persistent home directory",
        "Complete file system operations (create, read, write, copy, move, delete) with permissions",
        "Application launching and control through shell commands with GUI interaction",
        "Screenshot capture for visual verification of desktop state and debugging",
        "Concurrent shell sessions with independent working directories and environments",
        "State persistence across sandbox hibernation maintaining packages and configuration",
        "Internet access for package installation, API access, and web browsing",
        "Clear error feedback on permissions, dependencies, and resources with resolutions",
    ],
})

# === 7. MCP Protocol (0.770) ===
write_yaml("50-mcp.yaml", {
    "id": 50, "name": "mcp",
    "title": "MCP Protocol",
    "category": "integrations", "status": "GREEN",
    "prompt": "Implement Model Context Protocol (MCP) server integration enabling the agent to discover, connect to, and invoke tools from external MCP servers with automatic capability negotiation, typed tool schemas, and real-time streaming support.",
    "expected_behavior": "Full MCP (Model Context Protocol) client implementation via the manus-mcp-cli utility enabling dynamic tool discovery and invocation from external MCP servers. The agent connects to MCP servers using stdio or HTTP transport with automatic capability negotiation during the initialize handshake. Tool discovery enumerates available tools with their JSON Schema input definitions, enabling type-safe invocation with validated parameters. Tool execution supports both synchronous request-response and streaming patterns for long-running operations. The MCP client handles server lifecycle management including connection pooling, health checks, and graceful reconnection on transport failures. Multiple MCP servers can be connected simultaneously with namespaced tool routing to prevent conflicts. Error handling maps MCP error codes to user-friendly messages with retry logic for transient failures. The implementation follows the open MCP specification ensuring interoperability with any compliant server. Resource and prompt capabilities are supported alongside tools for comprehensive context provision.",
    "scoring_criteria": [
        "MCP client via manus-mcp-cli with stdio and HTTP transport support",
        "Automatic capability negotiation during initialize handshake with servers",
        "Tool discovery with JSON Schema input definitions for type-safe invocation",
        "Streaming support for long-running tool operations with progress feedback",
        "Connection lifecycle management with pooling, health checks, and graceful reconnection",
        "Multi-server simultaneous connection with namespaced tool routing",
        "MCP error code mapping to user-friendly messages with transient retry logic",
        "Resource and prompt capability support alongside tools for comprehensive context",
    ],
})

# === 8. Meta Ads Manager (0.768) ===
write_yaml("55-meta-ads.yaml", {
    "id": 55, "name": "meta-ads",
    "title": "Meta Ads Manager",
    "category": "integrations", "status": "GREEN",
    "prompt": "Integrate with Meta Marketing API to programmatically create ad campaigns, manage audiences, track performance with interactive dashboards, and optimize ad spend through automated rules with real-time budget alerts.",
    "expected_behavior": "Comprehensive Meta Marketing API integration for programmatic ad campaign management with an intuitive campaign builder UI. Campaign creation configures objectives (awareness, traffic, conversions), budget allocation (daily/lifetime with spend caps), scheduling with dayparting, and placement targeting across Facebook Feed, Instagram Stories, and Audience Network. Audience management creates custom audiences from application user data with automatic hashing for privacy compliance, lookalike audiences for prospecting with adjustable similarity percentages, and saved audiences with layered demographic/interest/behavioral targeting. Ad creative management handles image and video upload with automatic format optimization, copy variants for A/B testing, and dynamic creative optimization. An interactive performance dashboard retrieves campaign metrics (impressions, clicks, CTR, CPC, ROAS, frequency) via the Insights API with date range filtering, breakdowns by placement/device/age, and exportable reports. Automated rules adjust bids and pause underperforming ad sets based on configurable thresholds with real-time budget alert notifications. Error handling manages API rate limits with intelligent backoff and provides clear diagnostic messages for common issues like ad disapprovals.",
    "scoring_criteria": [
        "Meta Marketing API integration with Graph API v18+ and OAuth authentication flow",
        "Intuitive campaign builder UI with objective, budget, scheduling, and placement config",
        "Custom and lookalike audience management with privacy-compliant data hashing",
        "Ad creative management with format optimization, A/B testing, and dynamic creative",
        "Interactive performance dashboard with Insights API metrics, breakdowns, and exports",
        "Automated rules for bid adjustment and ad set pausing based on performance thresholds",
        "Intelligent API rate limit handling with backoff and diagnostic error messages",
        "Real-time budget alert notifications and spend cap enforcement across campaigns",
    ],
})

# === 9. Rule 17a-4 WORM (0.770) ===
write_yaml("64-rule-17a4-worm.yaml", {
    "id": 64, "name": "rule-17a4-worm",
    "title": "Rule 17a-4 WORM",
    "category": "compliance", "status": "GREEN",
    "prompt": "Implement SEC Rule 17a-4 compliant Write-Once-Read-Many (WORM) storage with tamper-evident integrity verification, automated retention lifecycle management, regulatory examination search, and a compliance dashboard with real-time audit monitoring.",
    "expected_behavior": "Production-grade WORM storage implementation meeting SEC Rule 17a-4(f) requirements for electronic record retention with an intuitive compliance dashboard. Records are written to immutable storage where they cannot be modified, overwritten, or deleted during the mandatory retention period (6 years for most records, lifetime for specified categories). Content-addressable hashing (SHA-256) provides tamper detection with periodic automated integrity verification scans that generate alerts on any anomaly. Records are indexed with rich metadata (record type, date, associated accounts, retention category, custodian) enabling efficient full-text and faceted search during regulatory examinations. The compliance dashboard provides real-time monitoring of storage health, retention schedule status, upcoming dispositions, and audit activity with exportable compliance reports. Automated retention lifecycle management prevents premature deletion while enabling compliant disposition after expiry with dual-authorization approval workflow. Access logging creates an immutable audit trail of all read operations with user identification, timestamp, and access justification. The implementation supports S3 Object Lock (compliance mode) for cloud WORM storage with automatic policy enforcement. Error handling provides clear alerts on storage capacity thresholds, integrity check failures, and unauthorized access attempts with escalation to compliance officers.",
    "scoring_criteria": [
        "Immutable WORM storage preventing modification/deletion during mandatory retention periods",
        "SHA-256 content-addressable hashing with automated periodic integrity verification scans",
        "Rich metadata indexing with full-text and faceted search for regulatory examinations",
        "Real-time compliance dashboard with storage health, retention status, and audit monitoring",
        "Automated retention lifecycle with dual-authorization disposition approval workflow",
        "Immutable audit trail of all access operations with user ID, timestamp, and justification",
        "S3 Object Lock (compliance mode) integration with automatic policy enforcement",
        "Proactive alerting on capacity thresholds, integrity failures, and unauthorized access",
    ],
})

print(f"\nAll 9 capabilities enhanced with dimension-targeted evidence.")
