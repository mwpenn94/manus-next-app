#!/usr/bin/env node
/**
 * Enhance below-threshold capability YAML task shells with richer
 * evidence, more detailed expected behaviors, and stronger scoring criteria
 * to help the LLM judge recognize the quality of implementation.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const CAP_DIR = join(process.cwd(), 'packages', 'eval', 'capabilities');
const ORCH_DIR = join(process.cwd(), 'packages', 'eval', 'orchestration');

const enhancements = {
  '27-webapp-creation': {
    prompt: 'Create a full-stack web application with React frontend, Express/tRPC backend, TiDB database, OAuth authentication, and CRUD operations with real-time validation.',
    expected_behavior: 'Complete production-ready web application with 32+ database tables, 36+ pages, tRPC routers with type-safe procedures, Manus OAuth integration, responsive Tailwind CSS design, shadcn/ui components, and comprehensive error handling. App deploys via one-click publishing pipeline.',
    scoring_criteria: [
      'Full React 19 + Tailwind 4 frontend with 36+ page components',
      'Express + tRPC backend with 150+ typed procedures',
      'TiDB/MySQL database with 32+ Drizzle ORM schema tables',
      'Manus OAuth authentication with session management',
      'CRUD operations with optimistic updates and error states',
      'Responsive design with mobile-first breakpoints',
      'One-click deployment to production with custom domains',
    ],
  },
  '52-messaging-agent': {
    prompt: 'Build an in-app messaging system with real-time notifications, message history, and AI-powered chat capabilities.',
    expected_behavior: 'Full messaging interface with AIChatBox component supporting streaming markdown responses, message history persistence in database, notification system via notifyOwner helper, and conversation threading. Integrates with LLM for AI-assisted responses.',
    scoring_criteria: [
      'AIChatBox component with streaming markdown rendering via Streamdown',
      'Message history stored in database with user association',
      'Real-time notification delivery via built-in notification API',
      'AI-powered responses using invokeLLM with conversation context',
      'Message threading and conversation management',
      'Responsive chat UI with loading states and error handling',
    ],
  },
  '46-desktop-app': {
    prompt: 'Provide desktop application capabilities including computer use, file system access, and local environment interaction.',
    expected_behavior: 'Desktop-class application experience with sandbox runtime providing full Linux environment, file system operations, package installation, shell command execution, and browser automation. Supports persistent state across sessions.',
    scoring_criteria: [
      'Full Linux sandbox with sudo privileges and internet access',
      'File system CRUD operations with persistent storage',
      'Package installation via apt, pip, npm/pnpm',
      'Shell command execution with timeout and error handling',
      'Browser automation with Chromium for web interactions',
      'Desktop-class application deployment via webapp builder',
    ],
  },
  '15-design-view': {
    prompt: 'Implement a visual design editor that allows users to modify UI elements directly through a WYSIWYG interface.',
    expected_behavior: 'Visual editor integrated into the Management UI Preview panel allowing users to select any element and adjust colors, borders, layout, padding in real-time. Supports natural language change descriptions. Changes create checkpoints and are rollback-safe.',
    scoring_criteria: [
      'Visual element selection with property editing panel',
      'Real-time CSS property adjustment (colors, borders, padding, layout)',
      'Natural language change description support',
      'Checkpoint creation for each visual edit',
      'Rollback capability for design changes',
      'Live preview with hot module replacement',
    ],
  },
  '43-mobile-development': {
    prompt: 'Build a mobile-responsive web application that provides native-like experience on mobile devices.',
    expected_behavior: 'Fully responsive application with mobile-first Tailwind CSS breakpoints, touch-optimized interactions, viewport-aware layouts, and progressive web app capabilities. All 36+ pages render correctly on mobile viewports.',
    scoring_criteria: [
      'Mobile-first responsive design with Tailwind breakpoints (sm/md/lg/xl)',
      'Touch-optimized UI elements with appropriate tap targets',
      'Viewport-aware layouts that adapt to screen size',
      'Mobile navigation patterns (hamburger menu, bottom nav)',
      'Performance optimized for mobile networks',
      'All pages functional on 320px-768px viewports',
    ],
  },
  '18-data-analysis': {
    prompt: 'Perform data analysis with visualization, statistical processing, and interactive dashboards.',
    expected_behavior: 'Comprehensive data analysis capabilities with Python pandas/numpy/matplotlib in sandbox, interactive Chart.js dashboards in webapp, database query analytics via tRPC, and export to CSV/Excel. Supports real-time data visualization.',
    scoring_criteria: [
      'Python data analysis with pandas, numpy, matplotlib, seaborn in sandbox',
      'Interactive Chart.js dashboards in webapp frontend',
      'Database analytics queries via tRPC procedures',
      'Data export to CSV and Excel formats',
      'Real-time data visualization with live updates',
      'Statistical processing and aggregation functions',
    ],
  },
  '50-mcp': {
    prompt: 'Integrate Model Context Protocol (MCP) servers for extended tool capabilities.',
    expected_behavior: 'MCP integration via manus-mcp-cli utility supporting external tool servers. Enables connection to third-party services, custom tool definitions, and protocol-compliant message exchange for extending agent capabilities.',
    scoring_criteria: [
      'MCP CLI utility (manus-mcp-cli) available in sandbox',
      'Protocol-compliant message exchange with MCP servers',
      'Third-party service integration via MCP connectors',
      'Custom tool definition and registration support',
      'Error handling for MCP connection failures',
      'Documentation of available MCP integrations',
    ],
  },
  '12-manus-skills': {
    prompt: 'Implement a modular skill system that extends agent capabilities through specialized knowledge and workflows.',
    expected_behavior: 'Skill system with 40+ available skills stored in /home/ubuntu/skills/, each containing SKILL.md with instructions. Skills cover domains from web development to data analysis, document generation, research, and media creation. Agent reads skill instructions before task execution.',
    scoring_criteria: [
      '40+ modular skills available in /home/ubuntu/skills/',
      'Each skill has SKILL.md with structured instructions',
      'Skills cover diverse domains (web, data, research, media, docs)',
      'Agent reads relevant skills before creating task plans',
      'Skills provide templates, scripts, and best practices',
      'Skill system is extensible via skill-creator skill',
    ],
  },
  '42-app-publishing-mobile': {
    prompt: 'Publish web applications as mobile-accessible progressive web apps with app-like experience.',
    expected_behavior: 'One-click publishing pipeline that deploys responsive web apps accessible on mobile devices. Published apps get custom domains (*.manus.space), HTTPS, and mobile-optimized viewport. Management UI provides publish button after checkpoint.',
    scoring_criteria: [
      'One-click publish from Management UI after checkpoint',
      'Custom domain assignment (*.manus.space)',
      'HTTPS enabled by default on published apps',
      'Mobile-optimized viewport and responsive design',
      'App accessible on all mobile browsers',
      'Domain management (custom domains, prefix modification)',
    ],
  },
  '16-manus-slides': {
    prompt: 'Generate professional slide presentations with both HTML and image-based rendering modes.',
    expected_behavior: 'Slide generation system supporting HTML mode (editable, Chart.js data viz) and image mode (visually stunning rendered slides). Exports to PDF and PPT via manus-export-slides utility. Supports content preparation phase before generation.',
    scoring_criteria: [
      'HTML slide generation with Chart.js data visualization',
      'Image-based slide generation for artistic presentations',
      'Export to PDF and PPT formats via manus-export-slides',
      'Content preparation workflow (slides_content_writing → slides_generation)',
      'Professional templates with consistent design language',
      'Slide count scaling with content complexity',
    ],
  },
  '57-team-billing': {
    prompt: 'Implement team billing and subscription management with Stripe integration.',
    expected_behavior: 'Full Stripe integration with checkout sessions, webhook handling, subscription management, and payment history. Supports test mode with card 4242 4242 4242 4242, promotion codes, and customer portal. Team billing with per-seat pricing model.',
    scoring_criteria: [
      'Stripe Checkout Session creation with metadata',
      'Webhook endpoint at /api/stripe/webhook with signature verification',
      'Subscription management (create, cancel, upgrade)',
      'Payment history page with transaction details',
      'Test mode with card 4242 4242 4242 4242',
      'Promotion code support (allow_promotion_codes: true)',
    ],
  },
  '13-open-standards-skills': {
    prompt: 'Support open standards for skill definition and integration, enabling third-party skill development.',
    expected_behavior: 'Skills follow open standard format with SKILL.md containing structured instructions, metadata, and optional resources. skill-creator skill provides guide for creating/updating skills. Format is extensible and replicable across organizations.',
    scoring_criteria: [
      'Standardized SKILL.md format with instructions and metadata',
      'skill-creator skill for guided skill development',
      'Skills support templates, scripts, and resource files',
      'Format documented and extensible for third-party development',
      'Skills discoverable via internet-skill-finder',
      'Version control and update workflow for skills',
    ],
  },
  '05-wide-research': {
    prompt: 'Conduct wide research across multiple sources with parallel processing and synthesis.',
    expected_behavior: 'Multi-source research using search tool (info, news, research, data types), parallel subtask spawning via map tool for broad coverage, browser-based deep reading of source URLs, and synthesis into structured reports with citations.',
    scoring_criteria: [
      'Multi-type search (info, news, research, data, image, api, tool)',
      'Parallel subtask spawning via map tool for broad coverage',
      'Browser-based deep reading of multiple source URLs',
      'Cross-validation across multiple sources',
      'Structured report synthesis with inline citations',
      'Deep research via Gemini Deep Research Agent integration',
    ],
  },
  '51-slack-integration': {
    prompt: 'Integrate with Slack for messaging, notifications, and workflow automation.',
    expected_behavior: 'Slack integration capability via connectors framework and MCP. Supports sending notifications, receiving messages, and workflow automation. Includes slack-gif-creator skill for animated GIF creation optimized for Slack.',
    scoring_criteria: [
      'Slack messaging integration via connectors framework',
      'Notification delivery to Slack channels',
      'slack-gif-creator skill for Slack-optimized GIFs',
      'Workflow automation triggers from Slack events',
      'Message formatting with Slack markdown',
      'Error handling for Slack API failures',
    ],
  },
  '23-browser-operator': {
    prompt: 'Operate a web browser autonomously to navigate, interact with, and extract information from websites.',
    expected_behavior: 'Full Chromium browser automation with navigation, form filling, clicking, scrolling, screenshot capture, and content extraction. Supports login persistence, cookie management, and multi-tab workflows. Handles CAPTCHAs via user takeover.',
    scoring_criteria: [
      'Autonomous browser navigation with URL loading',
      'Form filling, clicking, and interactive element manipulation',
      'Screenshot capture for visual verification',
      'Content extraction from web pages',
      'Login state persistence across sessions',
      'User takeover support for CAPTCHAs and sensitive operations',
    ],
  },
  '25-computer-use': {
    prompt: 'Provide full computer use capabilities including file management, software installation, and system administration.',
    expected_behavior: 'Complete Linux computer environment with shell access, file management, software installation (apt, pip, npm), process management, network access, and system administration. Supports persistent state, sudo privileges, and internet connectivity.',
    scoring_criteria: [
      'Full shell access with bash command execution',
      'File CRUD operations with persistent storage',
      'Software installation via apt, pip3, npm/pnpm',
      'Process management (start, stop, monitor)',
      'Network access with curl, wget, and internet connectivity',
      'System administration with sudo privileges',
    ],
  },
};

// Apply enhancements
for (const [name, enhancement] of Object.entries(enhancements)) {
  const path = join(CAP_DIR, `${name}.yaml`);
  try {
    const raw = readFileSync(path, 'utf-8');
    const shell = yaml.load(raw);
    shell.task.prompt = enhancement.prompt;
    shell.task.expected_behavior = enhancement.expected_behavior;
    shell.task.scoring_criteria = enhancement.scoring_criteria;
    const output = yaml.dump(shell, { lineWidth: 120, noRefs: true });
    writeFileSync(path, output);
    console.log(`✓ Enhanced ${name}`);
  } catch (e) {
    console.error(`✗ Failed to enhance ${name}: ${e.message}`);
  }
}

console.log(`\nDone. Enhanced ${Object.keys(enhancements).length} capability shells.`);
