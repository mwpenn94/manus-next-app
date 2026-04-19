#!/usr/bin/env node
/**
 * Generate benchmark evaluation task shells for all 67 capabilities + 5 orchestration tasks.
 * Each shell is a JSON file with: capability metadata, task prompt, expected behavior, scoring criteria.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const EVAL_DIR = join(process.cwd(), 'packages', 'eval');
const CAP_DIR = join(EVAL_DIR, 'capabilities');
const ORCH_DIR = join(EVAL_DIR, 'orchestration');
const RESULTS_DIR = join(EVAL_DIR, 'results');

// Ensure directories exist
[CAP_DIR, ORCH_DIR, RESULTS_DIR].forEach(d => mkdirSync(d, { recursive: true }));

// All 67 capabilities from PARITY_BACKLOG
const capabilities = [
  // 2.1 Agent Core (1-10)
  { id: 1, name: "chat-mode", title: "Chat Mode", category: "agent-core", status: "GREEN",
    prompt: "Say hello and ask me how my day is going.",
    expected: "Agent responds conversationally without using tools. Response is friendly and contextual.",
    criteria: ["Responds without tool calls", "Natural conversational tone", "Under 3 seconds response time"] },
  { id: 2, name: "agent-mode-long-running", title: "Agent Mode Long-Running", category: "agent-core", status: "GREEN",
    prompt: "Research the top 3 programming languages in 2025 and create a comparison table.",
    expected: "Agent uses web_search tool, processes results, and produces a formatted comparison table.",
    criteria: ["Uses web_search tool", "Multiple tool turns", "Produces structured output", "Completes within 60 seconds"] },
  { id: 3, name: "max-tier-routing", title: "Max Tier Routing", category: "agent-core", status: "GREEN",
    prompt: "In Max mode, analyze the competitive landscape of AI agent platforms and produce a detailed report.",
    expected: "Agent uses extended tool turns (up to 12), deeper research, and produces comprehensive output.",
    criteria: ["Uses Max mode routing", "Extended tool turns", "Comprehensive output", "Higher quality than Speed mode"] },
  { id: 4, name: "speed-quality-mode", title: "Speed/Quality Mode Toggle", category: "agent-core", status: "GREEN",
    prompt: "Toggle between Speed and Quality modes and verify each produces different behavior.",
    expected: "Speed mode responds faster with fewer tool turns. Quality mode is more thorough.",
    criteria: ["Mode toggle works", "Speed mode is faster", "Quality mode is more thorough"] },
  { id: 5, name: "wide-research", title: "Wide Research", category: "agent-core", status: "GREEN",
    prompt: "Do wide research on the current state of quantum computing in 2025.",
    expected: "Agent fires parallel web searches, synthesizes results from multiple sources.",
    criteria: ["Uses wide_research tool", "Parallel queries", "Synthesis from multiple sources", "Cited sources"] },
  { id: 6, name: "cross-session-memory", title: "Cross-Session Memory", category: "agent-core", status: "GREEN",
    prompt: "Remember that my favorite color is blue. Then in a new task, ask what my favorite color is.",
    expected: "Agent stores memory entry and retrieves it in subsequent tasks.",
    criteria: ["Memory stored", "Memory retrieved in new context", "Correct recall"] },
  { id: 7, name: "task-sharing", title: "Task Sharing via Signed URL", category: "agent-core", status: "GREEN",
    prompt: "Share this task with a link that expires in 24 hours and requires a password.",
    expected: "Generates a signed share URL with expiry and password protection.",
    criteria: ["Share URL generated", "Expiry set", "Password protection", "Link is accessible"] },
  { id: 8, name: "task-replay", title: "Task Replay with Timeline Scrubber", category: "agent-core", status: "GREEN",
    prompt: "Replay the previous task and scrub to the middle of the timeline.",
    expected: "Replay page loads with timeline scrubber, events are navigable.",
    criteria: ["Replay page loads", "Timeline scrubber works", "Events displayed", "Play/pause/speed controls"] },
  { id: 9, name: "event-notifications", title: "Event Notifications", category: "agent-core", status: "GREEN",
    prompt: "Trigger a notification when a task completes.",
    expected: "Notification appears in NotificationCenter after task completion.",
    criteria: ["Notification created", "Displayed in UI", "Correct content", "Dismissible"] },
  { id: 10, name: "one-shot-success", title: "One-Shot Success Target", category: "agent-core", status: "YELLOW",
    prompt: "Show the estimated cost and success metrics for this task.",
    expected: "Cost visibility indicator shows mode and estimated token cost.",
    criteria: ["Cost displayed", "Mode shown", "Reasonable estimate"] },

  // 2.2 Features (11-21)
  { id: 11, name: "projects", title: "Projects", category: "features", status: "GREEN",
    prompt: "Create a new project called 'AI Research' and add a knowledge base entry.",
    expected: "Project created with CRUD operations, knowledge base entry added.",
    criteria: ["Project created", "Listed in sidebar", "Knowledge base works", "Edit/delete works"] },
  { id: 12, name: "manus-skills", title: "Manus Skills", category: "features", status: "RED",
    prompt: "List available agent skills and activate one.",
    expected: "Skills registry shown, skill can be activated/deactivated.",
    criteria: ["Skills listed", "Activation works", "Skill affects agent behavior"] },
  { id: 13, name: "open-standards-skills", title: "Open-Standards Agent Skills", category: "features", status: "RED",
    prompt: "Import an Agent Skill from a GitHub repository.",
    expected: "Skill imported from external source and available in agent.",
    criteria: ["Import UI exists", "Skill loaded", "Skill functional"] },
  { id: 14, name: "project-skills", title: "Project Skills", category: "features", status: "RED",
    prompt: "Add a custom skill to a project that all team members can use.",
    expected: "Project-scoped skill created and shared with team.",
    criteria: ["Project skill created", "Scoped to project", "Shared access"] },
  { id: 15, name: "design-view", title: "Design View", category: "features", status: "YELLOW",
    prompt: "Open the design view and inspect a generated UI component.",
    expected: "Design view page loads with planned features.",
    criteria: ["Page loads", "Route works", "Planned features listed"] },
  { id: 16, name: "manus-slides", title: "Manus Slides", category: "features", status: "RED",
    prompt: "Generate a 5-slide presentation about AI trends.",
    expected: "Slide deck generated with content and formatting.",
    criteria: ["Slides generated", "Content relevant", "Formatting applied"] },
  { id: 17, name: "scheduled-tasks", title: "Scheduled Tasks", category: "features", status: "GREEN",
    prompt: "Schedule a task to run every day at 9 AM that checks the weather.",
    expected: "Scheduled task created with cron expression, visible in schedule page.",
    criteria: ["Task scheduled", "Cron expression correct", "Listed in UI", "Executes on time"] },
  { id: 18, name: "data-analysis", title: "Data Analysis & Visualization", category: "features", status: "YELLOW",
    prompt: "Analyze this CSV data and create a bar chart: Name,Score\\nAlice,85\\nBob,92\\nCarol,78",
    expected: "Agent analyzes data and produces visualization.",
    criteria: ["Data parsed", "Analysis produced", "Visualization created"] },
  { id: 19, name: "multimedia-processing", title: "Multimedia Processing", category: "features", status: "YELLOW",
    prompt: "Generate an image of a sunset over mountains.",
    expected: "Image generated using generate_image tool and displayed in workspace.",
    criteria: ["Image generated", "Displayed in workspace", "Relevant to prompt"] },
  { id: 20, name: "mail-manus", title: "Mail Manus", category: "features", status: "RED",
    prompt: "Send an email summary of today's tasks to my inbox.",
    expected: "Email composed and sent via email integration.",
    criteria: ["Email composed", "Sent successfully", "Content accurate"] },
  { id: 21, name: "meeting-minutes", title: "Meeting Minutes", category: "features", status: "RED",
    prompt: "Transcribe this meeting recording and generate action items.",
    expected: "Audio transcribed, minutes formatted, action items extracted.",
    criteria: ["Transcription accurate", "Minutes formatted", "Action items listed"] },

  // 2.3 Browser + Computer (22-26)
  { id: 22, name: "cloud-browser", title: "Cloud Browser", category: "browser-computer", status: "RED",
    prompt: "Open a cloud browser and navigate to example.com.",
    expected: "Cloud browser environment launches and navigates to URL.",
    criteria: ["Browser launches", "Navigation works", "Screenshot captured"] },
  { id: 23, name: "browser-operator", title: "Browser Operator", category: "browser-computer", status: "RED",
    prompt: "Use the browser to fill out a form on a test website.",
    expected: "Browser automation fills form fields and submits.",
    criteria: ["Form fields filled", "Submission successful", "Result verified"] },
  { id: 24, name: "screenshot-verification", title: "Screenshot Verification", category: "browser-computer", status: "RED",
    prompt: "Take a screenshot of a webpage and verify it contains a specific element.",
    expected: "Screenshot taken, vision model analyzes content.",
    criteria: ["Screenshot captured", "Vision analysis performed", "Element identified"] },
  { id: 25, name: "computer-use", title: "Computer Use", category: "browser-computer", status: "RED",
    prompt: "Use the computer to create a text file on the desktop.",
    expected: "Desktop OS control creates file.",
    criteria: ["File created", "Content correct", "OS interaction logged"] },
  { id: 26, name: "sandbox-runtime", title: "Sandbox Runtime", category: "browser-computer", status: "YELLOW",
    prompt: "Execute a Python script that calculates fibonacci numbers.",
    expected: "Code executed in sandbox, output returned.",
    criteria: ["Code executed", "Output correct", "Sandbox isolated"] },

  // 2.4 Website Builder Getting Started (27-29)
  { id: 27, name: "webapp-creation", title: "Full-Stack Web-App Creation", category: "website-builder", status: "RED",
    prompt: "Create a todo list web application with a database backend.",
    expected: "Full-stack app scaffolded with frontend, backend, and database.",
    criteria: ["App scaffolded", "Frontend renders", "Backend API works", "Database connected"] },
  { id: 28, name: "live-preview", title: "Live Preview with Direct Editing", category: "website-builder", status: "RED",
    prompt: "Preview the generated app and edit a component inline.",
    expected: "Live preview shows app, inline editing modifies component.",
    criteria: ["Preview loads", "Inline editing works", "Changes persist"] },
  { id: 29, name: "publishing-pipeline", title: "Publishing Pipeline", category: "website-builder", status: "RED",
    prompt: "Publish the generated app to a public URL.",
    expected: "App deployed and accessible at public URL.",
    criteria: ["Deployment triggered", "Public URL generated", "App accessible"] },

  // 2.5 Website Builder Features (30-34, 66-67)
  { id: 30, name: "built-in-ai", title: "Built-in AI Capabilities", category: "website-builder-features", status: "YELLOW",
    prompt: "Use built-in AI to generate content for a landing page.",
    expected: "LLM generates content, image generation creates hero image.",
    criteria: ["LLM content generated", "Image generated", "Integrated into page"] },
  { id: 31, name: "cloud-infrastructure", title: "Cloud Infrastructure", category: "website-builder-features", status: "YELLOW",
    prompt: "Verify the app is hosted on managed cloud infrastructure.",
    expected: "App running on Manus hosting with CDN, SSL.",
    criteria: ["Hosting active", "SSL enabled", "CDN configured"] },
  { id: 32, name: "access-control", title: "Access Control", category: "website-builder-features", status: "GREEN",
    prompt: "Verify that protected routes require authentication.",
    expected: "Unauthenticated users redirected to login. Authenticated users access protected content.",
    criteria: ["Auth check works", "Redirect to login", "Protected content accessible after auth"] },
  { id: 33, name: "creator-notifications", title: "Notifications for Creators", category: "website-builder-features", status: "GREEN",
    prompt: "Trigger a notification to the project owner.",
    expected: "notifyOwner sends notification, owner receives it.",
    criteria: ["Notification sent", "Owner receives", "Content correct"] },
  { id: 34, name: "payments-stripe", title: "Payments (Stripe)", category: "website-builder-features", status: "RED",
    prompt: "Set up Stripe payment processing for a subscription product.",
    expected: "Stripe integration configured, checkout flow works.",
    criteria: ["Stripe configured", "Checkout works", "Payment processed"] },
  { id: 66, name: "maps-in-apps", title: "Maps in Generated Apps", category: "website-builder-features", status: "RED",
    prompt: "Add a Google Maps component to a generated app.",
    expected: "Map component rendered with location data.",
    criteria: ["Map renders", "Location displayed", "Interactive controls"] },
  { id: 67, name: "data-api", title: "Data API Capability", category: "website-builder-features", status: "RED",
    prompt: "Expose a structured data API from the generated app.",
    expected: "REST or tRPC API endpoint returns structured data.",
    criteria: ["API endpoint exists", "Returns structured data", "Authentication works"] },

  // 2.6 Website Builder PM (35-37)
  { id: 35, name: "project-analytics", title: "Project Analytics", category: "website-builder-pm", status: "YELLOW",
    prompt: "View analytics for the published project (page views, visitors).",
    expected: "Analytics dashboard shows traffic metrics.",
    criteria: ["Dashboard loads", "Metrics displayed", "Time range filter works"] },
  { id: 36, name: "custom-domains", title: "Custom Domains", category: "website-builder-pm", status: "RED",
    prompt: "Configure a custom domain for the published project.",
    expected: "Custom domain configured and DNS verified.",
    criteria: ["Domain configured", "DNS verified", "SSL provisioned"] },
  { id: 37, name: "built-in-seo", title: "Built-in SEO", category: "website-builder-pm", status: "GREEN",
    prompt: "Verify SEO meta tags, OG tags, and robots.txt are configured.",
    expected: "All SEO elements present and correctly configured.",
    criteria: ["Meta tags present", "OG tags correct", "robots.txt exists", "JSON-LD structured data"] },

  // 2.7 Developer Tools (38-42)
  { id: 38, name: "code-control", title: "Code Control", category: "developer-tools", status: "YELLOW",
    prompt: "Export the full codebase as a downloadable ZIP file.",
    expected: "Codebase exported and downloadable.",
    criteria: ["Export triggered", "ZIP generated", "Download works"] },
  { id: 39, name: "figma-import", title: "Import from Figma", category: "developer-tools", status: "RED",
    prompt: "Import a Figma design and generate React components.",
    expected: "Figma design imported, components generated.",
    criteria: ["Figma connected", "Design imported", "Components generated"] },
  { id: 40, name: "third-party-integrations", title: "Third-Party Integrations", category: "developer-tools", status: "YELLOW",
    prompt: "Connect an external API (e.g., weather API) to the agent.",
    expected: "External API connected and callable from agent.",
    criteria: ["API configured", "Callable from agent", "Results returned"] },
  { id: 41, name: "github-integration", title: "GitHub Integration", category: "developer-tools", status: "YELLOW",
    prompt: "Sync the project with a GitHub repository.",
    expected: "Code pushed to GitHub, bidirectional sync active.",
    criteria: ["GitHub connected", "Code pushed", "Sync works"] },
  { id: 42, name: "app-publishing-mobile", title: "App Publishing (Mobile)", category: "developer-tools", status: "RED",
    prompt: "Publish the app to a mobile app store.",
    expected: "App packaged and submitted to app store.",
    criteria: ["App packaged", "Store submission", "Listing created"] },

  // 2.8 Mobile (43-45)
  { id: 43, name: "mobile-development", title: "Mobile Development", category: "mobile", status: "RED",
    prompt: "Generate a mobile app from the web application.",
    expected: "Mobile app generated with native components.",
    criteria: ["App generated", "Native components", "Runs on device"] },
  { id: 44, name: "mobile-app-client", title: "Mobile App (Manus Client)", category: "mobile", status: "N/A",
    prompt: "N/A - Out of scope",
    expected: "N/A",
    criteria: ["N/A"] },
  { id: 45, name: "mobile-responsive", title: "Mobile-Responsive Web UI", category: "mobile", status: "GREEN",
    prompt: "Verify the web UI is responsive at 375px viewport width.",
    expected: "All pages render correctly on mobile viewport.",
    criteria: ["Layout adapts", "Touch targets adequate", "No horizontal scroll", "Navigation works"] },

  // 2.9 Desktop (46-48)
  { id: 46, name: "desktop-app", title: "Desktop App", category: "desktop", status: "RED",
    prompt: "Package the web app as a desktop application.",
    expected: "Desktop app built with Electron/Tauri.",
    criteria: ["App packaged", "Launches on desktop", "Native features work"] },
  { id: 47, name: "my-computer", title: "My Computer", category: "desktop", status: "RED",
    prompt: "Access the virtual desktop environment.",
    expected: "Virtual desktop loads with file system access.",
    criteria: ["Desktop loads", "File system accessible", "Applications available"] },
  { id: 48, name: "version-rollback", title: "Version Rollback", category: "desktop", status: "YELLOW",
    prompt: "Roll back to a previous version of the project.",
    expected: "Previous checkpoint restored, app reverts to earlier state.",
    criteria: ["Checkpoints listed", "Rollback works", "State restored"] },

  // 2.10 Integrations (49-55, 65)
  { id: 49, name: "connectors-framework", title: "Connectors Framework", category: "integrations", status: "RED",
    prompt: "Set up a connector to a SaaS service.",
    expected: "Connector configured, data flows between systems.",
    criteria: ["Connector configured", "Authentication works", "Data syncs"] },
  { id: 50, name: "mcp", title: "MCP Protocol", category: "integrations", status: "RED",
    prompt: "Connect an MCP server and use its tools.",
    expected: "MCP server connected, tools available in agent.",
    criteria: ["MCP connected", "Tools listed", "Tool execution works"] },
  { id: 51, name: "slack-integration", title: "Slack Integration", category: "integrations", status: "RED",
    prompt: "Send a message to a Slack channel from the agent.",
    expected: "Slack bot sends message to specified channel.",
    criteria: ["Slack connected", "Message sent", "Channel correct"] },
  { id: 52, name: "messaging-agent", title: "Messaging-App Agent", category: "integrations", status: "RED",
    prompt: "Deploy an agent that responds to messages on a messaging platform.",
    expected: "Agent deployed on messaging platform, responds to messages.",
    criteria: ["Agent deployed", "Responds to messages", "Context maintained"] },
  { id: 53, name: "microsoft-agent365", title: "Microsoft Agent365", category: "integrations", status: "RED",
    prompt: "Integrate with Microsoft 365 services.",
    expected: "Microsoft 365 connected, data accessible.",
    criteria: ["M365 connected", "Data accessible", "Auth works"] },
  { id: 54, name: "gohighlevel", title: "GoHighLevel", category: "integrations", status: "N/A",
    prompt: "N/A - Out of scope",
    expected: "N/A",
    criteria: ["N/A"] },
  { id: 55, name: "meta-ads", title: "Meta Ads Manager", category: "integrations", status: "N/A",
    prompt: "N/A - Out of scope",
    expected: "N/A",
    criteria: ["N/A"] },
  { id: 65, name: "zapier-integration", title: "Zapier Integration", category: "integrations", status: "RED",
    prompt: "Create a Zapier automation that triggers on task completion.",
    expected: "Zapier webhook configured, automation triggers.",
    criteria: ["Webhook configured", "Trigger fires", "Data passed correctly"] },

  // 2.11 Collaboration + Team (56-58)
  { id: 56, name: "manus-collab", title: "Manus Collab", category: "collaboration", status: "RED",
    prompt: "Start a collaborative session with another user.",
    expected: "Real-time collaboration session active.",
    criteria: ["Session created", "Multiple users connected", "Real-time sync"] },
  { id: 57, name: "team-billing", title: "Team Billing + Admin", category: "collaboration", status: "RED",
    prompt: "Set up team billing and add team members.",
    expected: "Team billing configured, members added.",
    criteria: ["Billing configured", "Members added", "Roles assigned"] },
  { id: 58, name: "shared-session", title: "Shared Session", category: "collaboration", status: "RED",
    prompt: "Share a live session with another user.",
    expected: "Session shared, both users see real-time updates.",
    criteria: ["Session shared", "Real-time updates", "Permissions enforced"] },

  // 2.12 Voice + Audio (59-60)
  { id: 59, name: "voice-tts", title: "Voice TTS", category: "voice-audio", status: "GREEN",
    prompt: "Read the agent's response aloud using text-to-speech.",
    expected: "Browser SpeechSynthesis reads the response text.",
    criteria: ["TTS triggers", "Audio plays", "Correct text read"] },
  { id: 60, name: "voice-stt", title: "Voice STT + Hands-Free", category: "voice-audio", status: "GREEN",
    prompt: "Use voice input to dictate a task to the agent.",
    expected: "Voice recorded, transcribed, and submitted as task input.",
    criteria: ["Recording works", "Transcription accurate", "Input submitted"] },

  // 2.13 Content Generation (61-62)
  { id: 61, name: "document-generation", title: "Document Generation", category: "content-generation", status: "GREEN",
    prompt: "Generate a professional report about AI trends and provide a download link.",
    expected: "Document generated, uploaded to S3, download link provided.",
    criteria: ["Document generated", "Uploaded to S3", "Download link works", "Content relevant"] },
  { id: 62, name: "video-generation", title: "Veo3 Video Generation", category: "content-generation", status: "RED",
    prompt: "Generate a short video about a product launch.",
    expected: "Video generated using AI video generation.",
    criteria: ["Video generated", "Content relevant", "Playable format"] },

  // 2.14 Compliance (63-64)
  { id: 63, name: "finra-sec-compliance", title: "FINRA/SEC Compliance", category: "compliance", status: "N/A",
    prompt: "N/A - Stewardly-only",
    expected: "N/A",
    criteria: ["N/A"] },
  { id: 64, name: "rule-17a4-worm", title: "Rule 17a-4 WORM", category: "compliance", status: "N/A",
    prompt: "N/A - Stewardly-only",
    expected: "N/A",
    criteria: ["N/A"] },
];

// 5 orchestration task shells
const orchestrationTasks = [
  { id: "orch-1", name: "multi-tool-chain", title: "Multi-Tool Chain",
    prompt: "Research a topic, generate an image about it, create a document summarizing findings, and share the task.",
    expected: "Agent chains web_search → generate_image → generate_document → share in sequence.",
    criteria: ["All 4 tools used", "Correct sequence", "Output coherent", "Share link generated"] },
  { id: "orch-2", name: "error-recovery", title: "Error Recovery",
    prompt: "Search for a nonexistent website (xyz123nonexistent.com) and gracefully handle the failure.",
    expected: "Agent handles the error gracefully, informs user, and suggests alternatives.",
    criteria: ["Error caught", "User informed", "No crash", "Alternative suggested"] },
  { id: "orch-3", name: "mode-switching", title: "Mode Switching Mid-Task",
    prompt: "Start in Speed mode, then switch to Quality mode mid-conversation.",
    expected: "Mode switch takes effect for subsequent responses.",
    criteria: ["Mode switch works", "Behavior changes", "No context loss"] },
  { id: "orch-4", name: "memory-across-tasks", title: "Memory Across Tasks",
    prompt: "In Task A, tell the agent your name. In Task B, ask the agent what your name is.",
    expected: "Agent recalls information from Task A in Task B via memory system.",
    criteria: ["Memory stored in Task A", "Memory retrieved in Task B", "Correct recall"] },
  { id: "orch-5", name: "concurrent-tools", title: "Concurrent Tool Execution",
    prompt: "Do wide research that requires parallel web searches and synthesize results.",
    expected: "Multiple searches execute in parallel, results synthesized.",
    criteria: ["Parallel execution", "All results collected", "Synthesis coherent", "No data loss"] },
];

// Write capability task shells
let capCount = 0;
for (const cap of capabilities) {
  const filename = `${String(cap.id).padStart(2, '0')}-${cap.name}.json`;
  const shell = {
    id: cap.id,
    name: cap.name,
    title: cap.title,
    category: cap.category,
    status: cap.status,
    task: {
      prompt: cap.prompt,
      expected_behavior: cap.expected,
      scoring_criteria: cap.criteria,
    },
    scoring: {
      dimensions: ["correctness", "completeness", "efficiency", "robustness", "user_experience", "maintainability", "innovation"],
      weights: { correctness: 0.20, completeness: 0.15, efficiency: 0.10, robustness: 0.15, user_experience: 0.15, maintainability: 0.10, innovation: 0.15 },
      threshold: 0.80,
    },
    result: null, // Populated after evaluation
  };
  writeFileSync(join(CAP_DIR, filename), JSON.stringify(shell, null, 2) + '\n');
  capCount++;
}

// Write orchestration task shells
let orchCount = 0;
for (const orch of orchestrationTasks) {
  const filename = `${orch.id}.json`;
  const shell = {
    id: orch.id,
    name: orch.name,
    title: orch.title,
    category: "orchestration",
    task: {
      prompt: orch.prompt,
      expected_behavior: orch.expected,
      scoring_criteria: orch.criteria,
    },
    scoring: {
      dimensions: ["correctness", "completeness", "efficiency", "robustness", "user_experience", "maintainability", "innovation"],
      weights: { correctness: 0.20, completeness: 0.15, efficiency: 0.10, robustness: 0.15, user_experience: 0.15, maintainability: 0.10, innovation: 0.15 },
      threshold: 0.80,
    },
    result: null,
  };
  writeFileSync(join(ORCH_DIR, filename), JSON.stringify(shell, null, 2) + '\n');
  orchCount++;
}

console.log(`Generated ${capCount} capability task shells in ${CAP_DIR}`);
console.log(`Generated ${orchCount} orchestration task shells in ${ORCH_DIR}`);
console.log(`Total: ${capCount + orchCount} task shells`);
