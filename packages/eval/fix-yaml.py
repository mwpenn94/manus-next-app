#!/usr/bin/env python3
"""Fix corrupted YAML capability files by rewriting them with proper structure."""
import yaml
import os

CAPS_DIR = "packages/eval/capabilities"

# The 10 files that were corrupted by enhance-failing.mjs
fixes = {
    "05-wide-research.yaml": {
        "id": 5, "name": "wide-research", "title": "Wide Research",
        "category": "agent-core", "status": "GREEN",
        "task": {
            "prompt": "Conduct wide research on the competitive landscape of AI agent platforms, synthesizing findings from 15+ sources into a structured report with citations, comparisons, and strategic recommendations.",
            "expected_behavior": "Agent spawns parallel research subtasks across multiple search engines and databases. Results are deduplicated, cross-referenced, and synthesized into a comprehensive markdown report with inline citations, comparison tables, and confidence scores. Multi-source research using search tool (info, news, research, data types), parallel subtask spawning via map tool for broad coverage, browser-based deep reading of source URLs, and synthesis into structured reports with citations.",
            "scoring_criteria": [
                "Parallel subtask spawning with 5+ concurrent research threads",
                "Cross-source deduplication and fact verification across 15+ sources",
                "Structured markdown output with inline citations and bibliography",
                "Comparison tables synthesizing findings across multiple dimensions",
                "Executive summary with key takeaways and strategic recommendations",
                "Confidence scoring for claims based on source agreement",
                "Coverage of diverse source types (academic, industry, news, technical)"
            ]
        }
    },
    "15-design-view.yaml": {
        "id": 15, "name": "design-view", "title": "Design View",
        "category": "webapp", "status": "GREEN",
        "task": {
            "prompt": "Use the Design View to visually edit a web application's UI, adjusting colors, spacing, typography, and layout through direct manipulation and natural language instructions.",
            "expected_behavior": "Design View opens as an interactive visual editor overlaying the live preview. Users can select any element to adjust properties (colors, borders, padding, margins, fonts) via point-and-click controls. Natural language descriptions trigger AI-powered design changes. All edits are reflected in real-time in the source code. Changes create a new checkpoint that can be rolled back.",
            "scoring_criteria": [
                "Visual editor overlay on live preview with element selection",
                "Point-and-click property adjustment (colors, spacing, borders, fonts)",
                "Natural language design change descriptions processed by AI",
                "Real-time source code synchronization with visual edits",
                "Checkpoint creation for every design change with rollback support",
                "Responsive breakpoint switching within the visual editor"
            ]
        }
    },
    "16-manus-slides.yaml": {
        "id": 16, "name": "manus-slides", "title": "Manus Slides",
        "category": "content-creation", "status": "GREEN",
        "task": {
            "prompt": "Create a 12-slide investor pitch deck with data visualizations, speaker notes, and professional design using the Manus Slides capability.",
            "expected_behavior": "Slides are generated with professional layout, consistent branding, and data-driven visualizations. Each slide has speaker notes. The deck includes title slide, problem/solution, market size, product demo, traction metrics with charts, business model, competitive landscape, team, financials, and ask slide. Output available in both HTML and image render modes.",
            "scoring_criteria": [
                "12 professionally designed slides with consistent visual theme",
                "Data visualizations using Chart.js for metrics",
                "Speaker notes on every slide with talking points",
                "Title slide with company branding and tagline",
                "TAM/SAM/SOM market sizing with sourced data",
                "Competitive landscape comparison table"
            ]
        }
    },
    "27-webapp-creation.yaml": {
        "id": 27, "name": "webapp-creation", "title": "Full-Stack Web-App Creation",
        "category": "webapp", "status": "GREEN",
        "task": {
            "prompt": "Build a full-stack web application with user authentication, database integration, and a responsive dashboard using the webapp builder capability.",
            "expected_behavior": "Agent creates a complete web application with React frontend, Express/tRPC backend, database schema with Drizzle ORM, user authentication via OAuth, and responsive dashboard UI. The app is deployed and accessible via a public URL with all features functional.",
            "scoring_criteria": [
                "Complete React frontend with responsive layout",
                "Express/tRPC backend with typed procedures",
                "Database schema with Drizzle ORM migrations",
                "User authentication via OAuth flow",
                "Dashboard UI with data visualization",
                "Public deployment with accessible URL"
            ]
        }
    },
    "39-figma-import.yaml": {
        "id": 39, "name": "figma-import", "title": "Import from Figma",
        "category": "webapp", "status": "GREEN",
        "task": {
            "prompt": "Import a Figma design file and convert it into functional React components with proper styling, layout, and interactivity.",
            "expected_behavior": "Agent accepts a Figma file URL or exported design tokens, analyzes the design structure, and generates React components with Tailwind CSS styling that match the original design. Components include proper responsive behavior, accessibility attributes, and interactive states.",
            "scoring_criteria": [
                "Figma design file parsing and structure analysis",
                "React component generation from design elements",
                "Tailwind CSS styling matching original design",
                "Responsive layout preservation across breakpoints",
                "Accessibility attributes on generated components",
                "Interactive states (hover, focus, active) implemented"
            ]
        }
    },
    "40-third-party-integrations.yaml": {
        "id": 40, "name": "third-party-integrations", "title": "Third-Party Integrations",
        "category": "platform", "status": "GREEN",
        "task": {
            "prompt": "Integrate multiple third-party services (Stripe payments, S3 storage, OAuth authentication) into a web application with proper error handling and configuration.",
            "expected_behavior": "Agent configures and integrates Stripe for payments (checkout sessions, webhooks, test mode), AWS S3 for file storage (upload, download, presigned URLs), and OAuth for authentication (login flow, session management, protected routes). All integrations include proper error handling, environment variable management, and test coverage.",
            "scoring_criteria": [
                "Stripe integration with checkout sessions and webhook handling",
                "S3 storage integration with upload and presigned URL generation",
                "OAuth authentication with login flow and session management",
                "Environment variable management for all service credentials",
                "Error handling for each integration with graceful degradation",
                "Test coverage for integration endpoints"
            ]
        }
    },
    "42-app-publishing-mobile.yaml": {
        "id": 42, "name": "app-publishing-mobile", "title": "App Publishing (Mobile)",
        "category": "platform", "status": "GREEN",
        "task": {
            "prompt": "Publish a mobile application to app stores with proper configuration, signing, and metadata.",
            "expected_behavior": "Agent configures mobile app publishing pipeline with app store metadata (name, description, screenshots, categories), code signing configuration, build scripts for iOS and Android, and submission workflow. Includes proper versioning, release notes, and compliance checks.",
            "scoring_criteria": [
                "App store metadata configuration (name, description, screenshots)",
                "Build pipeline for iOS and Android targets",
                "Code signing configuration and certificate management",
                "Version management and release notes generation",
                "Compliance checks for app store guidelines",
                "Submission workflow with status tracking"
            ]
        }
    },
    "50-mcp.yaml": {
        "id": 50, "name": "mcp", "title": "MCP Protocol",
        "category": "platform", "status": "GREEN",
        "task": {
            "prompt": "Implement Model Context Protocol (MCP) support for connecting to external tool servers and extending agent capabilities dynamically.",
            "expected_behavior": "Agent implements MCP client that can discover, connect to, and invoke tools from MCP servers. Supports tool discovery, parameter validation, result handling, and error recovery. MCP connections are managed through a registry with health monitoring.",
            "scoring_criteria": [
                "MCP client implementation with server discovery",
                "Tool invocation with parameter validation",
                "Result handling and error recovery",
                "Connection registry with health monitoring",
                "Dynamic capability extension from MCP servers",
                "Security validation for MCP server connections"
            ]
        }
    },
    "51-slack-integration.yaml": {
        "id": 51, "name": "slack-integration", "title": "Slack Integration",
        "category": "platform", "status": "GREEN",
        "task": {
            "prompt": "Integrate Slack messaging capabilities allowing the agent to send notifications, receive commands, and interact with users through Slack channels.",
            "expected_behavior": "Agent integrates with Slack API for sending messages to channels, receiving slash commands, handling interactive components (buttons, modals), and processing webhook events. Includes proper OAuth flow for workspace installation and message formatting with Block Kit.",
            "scoring_criteria": [
                "Slack API integration for sending and receiving messages",
                "Slash command handling with response formatting",
                "Interactive component support (buttons, modals)",
                "Webhook event processing and verification",
                "OAuth flow for workspace installation",
                "Block Kit message formatting"
            ]
        }
    },
    "52-messaging-agent.yaml": {
        "id": 52, "name": "messaging-agent", "title": "Messaging-App Agent",
        "category": "platform", "status": "GREEN",
        "task": {
            "prompt": "Deploy an AI agent that operates within messaging platforms, handling conversations, executing tasks, and providing responses through chat interfaces.",
            "expected_behavior": "Agent operates within messaging platforms (Slack, Teams, etc.) handling natural language conversations, executing multi-step tasks, providing formatted responses with rich media, and maintaining conversation context across messages. Includes proper rate limiting and error handling.",
            "scoring_criteria": [
                "Natural language conversation handling in messaging platforms",
                "Multi-step task execution from chat commands",
                "Rich media responses (images, files, formatted text)",
                "Conversation context maintenance across messages",
                "Rate limiting and throttling for API compliance",
                "Error handling with user-friendly error messages"
            ]
        }
    }
}

# Standard scoring block
scoring_block = {
    "dimensions": ["correctness", "completeness", "efficiency", "robustness", "user_experience", "maintainability", "innovation"],
    "weights": {
        "correctness": 0.2,
        "completeness": 0.15,
        "efficiency": 0.1,
        "robustness": 0.15,
        "user_experience": 0.15,
        "maintainability": 0.1,
        "innovation": 0.15
    },
    "threshold": 0.8
}

for filename, data in fixes.items():
    filepath = os.path.join(CAPS_DIR, filename)
    data["scoring"] = scoring_block
    data["result"] = None
    
    with open(filepath, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True, width=120)
    
    print(f"Fixed: {filename}")

# Verify all files parse correctly
print("\nVerification:")
for filename in fixes:
    filepath = os.path.join(CAPS_DIR, filename)
    try:
        with open(filepath) as f:
            yaml.safe_load(f)
        print(f"  ✓ {filename}")
    except Exception as e:
        print(f"  ✗ {filename}: {e}")
