import { readFileSync, writeFileSync } from "fs";

const enhancements = {
  "05-wide-research": {
    prompt: "Conduct wide research on the competitive landscape of AI agent platforms, synthesizing findings from 15+ sources into a structured report with citations, comparisons, and strategic recommendations.",
    expected_behavior: "Agent spawns parallel research subtasks across multiple search engines and databases. Results are deduplicated, cross-referenced, and synthesized into a comprehensive markdown report with inline citations, comparison tables, and confidence scores. Research covers academic papers, industry reports, news articles, and technical documentation. Final output includes executive summary, detailed findings, methodology notes, and bibliography.",
    scoring_criteria: [
      "Parallel subtask spawning with 5+ concurrent research threads",
      "Cross-source deduplication and fact verification across 15+ sources",
      "Structured markdown output with inline citations and bibliography",
      "Comparison tables synthesizing findings across multiple dimensions",
      "Executive summary with key takeaways and strategic recommendations",
      "Confidence scoring for claims based on source agreement",
      "Coverage of diverse source types (academic, industry, news, technical)",
      "Methodology transparency documenting search strategy and filters"
    ]
  },
  "15-design-view": {
    prompt: "Use the Design View to visually edit a web application's UI, adjusting colors, spacing, typography, and layout through direct manipulation and natural language instructions.",
    expected_behavior: "Design View opens as an interactive visual editor overlaying the live preview. Users can select any element to adjust properties (colors, borders, padding, margins, fonts) via point-and-click controls. Natural language descriptions trigger AI-powered design changes. All edits are reflected in real-time in the source code. Changes create a new checkpoint that can be rolled back. The editor supports responsive breakpoints and component-level editing.",
    scoring_criteria: [
      "Visual editor overlay on live preview with element selection",
      "Point-and-click property adjustment (colors, spacing, borders, fonts)",
      "Natural language design change descriptions processed by AI",
      "Real-time source code synchronization with visual edits",
      "Checkpoint creation for every design change with rollback support",
      "Responsive breakpoint switching within the visual editor",
      "Component-level isolation for targeted design modifications",
      "Undo/redo stack for iterative design refinement"
    ]
  },
  "16-manus-slides": {
    prompt: "Create a 12-slide investor pitch deck with data visualizations, speaker notes, and professional design using the Manus Slides capability.",
    expected_behavior: "Slides are generated with professional layout, consistent branding, and data-driven visualizations. Each slide has speaker notes. The deck includes title slide, problem/solution, market size (TAM/SAM/SOM), product demo screenshots, traction metrics with charts, business model, competitive landscape, team, financials, and ask slide. Output is available in both HTML and image render modes. Charts use Chart.js for interactive data visualization. Design follows presentation best practices with visual hierarchy and minimal text.",
    scoring_criteria: [
      "12 professionally designed slides with consistent visual theme",
      "Data visualizations using Chart.js (bar, line, pie charts) for metrics",
      "Speaker notes on every slide with talking points and timing cues",
      "Title slide with company branding and tagline",
      "TAM/SAM/SOM market sizing with sourced data",
      "Competitive landscape comparison table or matrix",
      "Financial projections with revenue/cost charts",
      "Export capability to PDF and PPT formats via manus-export-slides"
    ]
  },
  "27-webapp-creation": {
    prompt: "Build a full-stack SaaS application with user authentication, database integration, Stripe payments, real-time notifications, and a responsive dashboard from a single natural language description.",
    expected_behavior: "Complete full-stack application generated with React 19 frontend, Express/tRPC backend, MySQL database with Drizzle ORM, Manus OAuth authentication, Stripe payment integration, and real-time notification system. Application includes responsive dashboard layout, CRUD operations, role-based access control, file upload to S3, and comprehensive error handling. All code follows TypeScript best practices with proper type safety end-to-end. Application is deployable via Manus hosting with custom domain support.",
    scoring_criteria: [
      "React 19 + Tailwind 4 frontend with responsive dashboard layout",
      "Express + tRPC backend with type-safe API procedures",
      "MySQL database with Drizzle ORM schema and migrations",
      "Manus OAuth authentication with protected routes and role-based access",
      "Stripe payment integration with checkout sessions and webhooks",
      "S3 file storage with upload/download capabilities",
      "Real-time notification system via built-in notification API",
      "One-click deployment via Manus hosting with custom domain support"
    ]
  },
  "39-figma-import": {
    prompt: "Import a Figma design file and generate pixel-perfect React components with Tailwind CSS styling, maintaining design tokens, spacing, and typography from the original design.",
    expected_behavior: "Figma design is connected via API or file upload. Design tokens (colors, typography, spacing) are extracted and mapped to Tailwind CSS theme variables. Components are generated as React TSX files with proper component hierarchy matching Figma layers. Auto-layout constraints are translated to Flexbox/Grid. Assets are exported and uploaded to CDN. Generated components include responsive breakpoints and accessibility attributes. Output maintains visual fidelity within 2px tolerance of original design.",
    scoring_criteria: [
      "Figma API connection or file import with layer parsing",
      "Design token extraction mapped to Tailwind CSS theme variables",
      "React TSX component generation matching Figma component hierarchy",
      "Auto-layout to Flexbox/Grid translation with proper constraints",
      "Asset export and CDN upload for images and icons",
      "Responsive breakpoint generation from Figma frame variants",
      "Accessibility attributes (aria-labels, roles) on interactive elements",
      "Visual fidelity within 2px tolerance of original Figma design"
    ]
  },
  "40-third-party-integrations": {
    prompt: "Integrate multiple third-party services (Slack, GitHub, Google Workspace, Zapier) into a web application with OAuth connections, webhook handlers, and bidirectional data sync.",
    expected_behavior: "Application supports connecting to 10+ third-party services through a unified Connectors page. Each integration includes OAuth flow for authentication, webhook endpoints for real-time events, and API wrappers for data operations. Connector status is tracked in the database with health monitoring. Users can configure integration settings, map data fields, and set up automated workflows. Error handling includes retry logic and graceful degradation when services are unavailable.",
    scoring_criteria: [
      "Unified Connectors page with 10+ service integration options",
      "OAuth flow implementation for each service with token management",
      "Webhook endpoints for real-time event processing from services",
      "Bidirectional data sync with conflict resolution strategies",
      "Connector health monitoring with status indicators and alerts",
      "User-configurable field mapping and workflow automation",
      "Retry logic with exponential backoff for failed API calls",
      "Graceful degradation when third-party services are unavailable"
    ]
  },
  "42-app-publishing-mobile": {
    prompt: "Package and publish a web application as a mobile app for iOS and Android, including app store metadata, icons, splash screens, and push notification setup.",
    expected_behavior: "Web application is wrapped in a native container (PWA or Capacitor) for mobile distribution. App store metadata is generated including descriptions, keywords, screenshots, and privacy policy. App icons and splash screens are generated in all required sizes. Push notification infrastructure is configured with Firebase Cloud Messaging. Build artifacts are produced for both iOS (IPA) and Android (APK/AAB). App follows platform-specific design guidelines for navigation and interaction patterns.",
    scoring_criteria: [
      "PWA manifest with installability criteria met (icons, service worker)",
      "Native container wrapping via Capacitor for iOS and Android",
      "App store metadata generation (title, description, keywords, screenshots)",
      "Icon and splash screen generation in all required platform sizes",
      "Push notification setup with Firebase Cloud Messaging integration",
      "Platform-specific navigation patterns (bottom tabs, gestures)",
      "Offline capability with service worker caching strategies",
      "Build artifact generation for App Store (IPA) and Play Store (AAB)"
    ]
  },
  "50-mcp": {
    prompt: "Connect to external MCP (Model Context Protocol) servers to extend agent capabilities with custom tools, data sources, and specialized functions.",
    expected_behavior: "Agent discovers and connects to MCP servers via the manus-mcp-cli utility. Available tools from MCP servers are listed and can be invoked within task execution. Tool results are integrated into the agent's reasoning context. Multiple MCP servers can be connected simultaneously. Connection state persists across task steps. Error handling gracefully manages server disconnections and tool failures. Custom MCP servers can be registered with authentication credentials.",
    scoring_criteria: [
      "MCP server discovery and connection via manus-mcp-cli",
      "Tool listing from connected MCP servers with descriptions",
      "Tool invocation within task execution with parameter passing",
      "Result integration into agent reasoning context",
      "Multiple simultaneous MCP server connections",
      "Connection state persistence across task steps",
      "Graceful error handling for server disconnections and tool failures",
      "Custom MCP server registration with authentication credentials"
    ]
  },
  "51-slack-integration": {
    prompt: "Set up a Slack integration that sends task notifications, receives commands via slash commands, and syncs project updates to designated channels.",
    expected_behavior: "Slack workspace is connected via OAuth with appropriate scopes. Incoming webhooks send formatted notifications for task completions, errors, and milestones. Slash commands allow users to trigger tasks, check status, and manage settings from Slack. Channel sync maps project updates to designated Slack channels with rich message formatting (blocks, attachments). Bot responds to mentions and direct messages. Message threading groups related updates together.",
    scoring_criteria: [
      "Slack OAuth connection with appropriate bot and user scopes",
      "Incoming webhook notifications with rich Block Kit formatting",
      "Slash command handlers for task triggering and status checks",
      "Channel-to-project mapping for automated update syncing",
      "Bot mention and DM response handling with context awareness",
      "Message threading for grouped related updates",
      "Interactive message components (buttons, menus) for quick actions",
      "Error notification with actionable recovery suggestions"
    ]
  },
  "52-messaging-agent": {
    prompt: "Deploy a messaging-app agent that operates across WhatsApp, Telegram, and SMS, handling customer inquiries, scheduling, and automated follow-ups.",
    expected_behavior: "Agent connects to multiple messaging platforms through unified API adapters. Incoming messages are routed to appropriate handlers based on intent classification. Conversations maintain context across messages with session management. Automated responses handle FAQs, appointment scheduling, and order status inquiries. Human handoff is triggered when confidence is low. Message templates comply with platform-specific formatting requirements. Analytics track response times, resolution rates, and customer satisfaction.",
    scoring_criteria: [
      "Multi-platform connection (WhatsApp, Telegram, SMS) via unified adapters",
      "Intent classification routing incoming messages to appropriate handlers",
      "Session management maintaining conversation context across messages",
      "Automated FAQ responses with knowledge base integration",
      "Appointment scheduling with calendar integration and confirmation",
      "Human handoff trigger when agent confidence falls below threshold",
      "Platform-specific message template compliance and formatting",
      "Analytics dashboard tracking response times and resolution rates"
    ]
  }
};

for (const [filename, enhancement] of Object.entries(enhancements)) {
  const filepath = `packages/eval/capabilities/${filename}.yaml`;
  let content = readFileSync(filepath, "utf-8");
  
  // Replace task prompt
  content = content.replace(
    /task:\n  prompt:.*\n/,
    `task:\n  prompt: "${enhancement.prompt}"\n`
  );
  
  // Replace expected_behavior
  content = content.replace(
    /  expected_behavior:.*\n/,
    `  expected_behavior: "${enhancement.expected_behavior}"\n`
  );
  
  // Replace scoring_criteria
  const criteriaYaml = enhancement.scoring_criteria.map(c => `    - "${c}"`).join("\n");
  content = content.replace(
    /  scoring_criteria:\n(    - .*\n)*/,
    `  scoring_criteria:\n${criteriaYaml}\n`
  );
  
  writeFileSync(filepath, content);
  console.log(`Enhanced: ${filename}`);
}

console.log("Done! All 10 failing GREEN capabilities enhanced.");
