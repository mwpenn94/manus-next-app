/**
 * appLifecycleTool.ts — Manus-Aligned App Lifecycle Management
 *
 * Pass 38.3: Deep parity with the Manus App Development Reference.
 * Covers the full SDLC: discovery, design, architecture, implementation,
 * integration, testing, CI/CD, deployment, observability, maintenance,
 * security audit, and growth iteration.
 *
 * Modes:
 *   - discover:    Requirements gathering + feasibility analysis
 *   - design:      Design system + UI/UX specification
 *   - architect:   Architecture selection + data modeling
 *   - implement:   Code generation + CRUD validation
 *   - integrate:   Wire integrations (Stripe, OAuth, APIs)
 *   - test:        Test suite generation (unit/integration/e2e)
 *   - deploy:      Deployment pipeline + production readiness
 *   - observe:     Observability + monitoring setup
 *   - audit:       Security + compliance + performance audit
 *   - iterate:     Growth iteration + analytics-driven improvements
 *   - full:        Run complete lifecycle assessment
 */

import type { ToolResult } from "./agentTools";

// ── Types ──

export type LifecycleMode =
  | "discover"
  | "design"
  | "architect"
  | "implement"
  | "integrate"
  | "test"
  | "deploy"
  | "observe"
  | "audit"
  | "iterate"
  | "full";

export type AppArchetype =
  | "dashboard"
  | "public_site"
  | "ecommerce"
  | "saas"
  | "internal_tool"
  | "api_service"
  | "mobile_app"
  | "community"
  | "portfolio"
  | "custom";

export type TechStack = {
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  hosting: string;
  styling: string;
  testing: string;
};

// ── Lifecycle Phase ──

export interface LifecyclePhase {
  phase: string;
  status: "not_started" | "in_progress" | "completed" | "needs_attention";
  score: number; // 0-10
  findings: string[];
  recommendations: string[];
  blockers: string[];
}

// ── Design System ──

export interface DesignSystem {
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  typography: {
    heading: string;
    body: string;
    mono: string;
  };
  spacing: string;
  borderRadius: string;
  shadows: string;
  theme: "light" | "dark" | "system";
  layoutPattern: string;
  navigationPattern: string;
}

// ── Architecture Decision ──

export interface ArchitectureDecision {
  decision: string;
  rationale: string;
  alternatives: string[];
  tradeoffs: string;
}

// ── Integration Spec ──

export interface IntegrationSpec {
  name: string;
  type: "payment" | "auth" | "email" | "storage" | "analytics" | "api" | "webhook" | "database";
  provider: string;
  secretsRequired: string[];
  setupSteps: string[];
  testingSteps: string[];
}

// ── Test Coverage ──

export interface TestCoverage {
  unit: { count: number; coverage: number; passing: number };
  integration: { count: number; coverage: number; passing: number };
  e2e: { count: number; coverage: number; passing: number };
  overall: number;
}

// ── Lifecycle Report ──

export interface LifecycleReport {
  appName: string;
  mode: LifecycleMode;
  archetype: AppArchetype;
  techStack: TechStack;
  phases: LifecyclePhase[];
  designSystem?: DesignSystem;
  architectureDecisions?: ArchitectureDecision[];
  integrations?: IntegrationSpec[];
  testCoverage?: TestCoverage;
  overallScore: number;
  overallStatus: "healthy" | "needs_work" | "critical";
  summary: string;
}

// ── Archetype Classifier ──

function classifyArchetype(description: string): AppArchetype {
  const d = description.toLowerCase();
  if (d.includes("dashboard") || d.includes("admin") || d.includes("panel") || d.includes("analytics"))
    return "dashboard";
  if (d.includes("ecommerce") || d.includes("shop") || d.includes("store") || d.includes("product") || d.includes("cart"))
    return "ecommerce";
  if (d.includes("saas") || d.includes("subscription") || d.includes("multi-tenant"))
    return "saas";
  if (d.includes("internal") || d.includes("tool") || d.includes("crm") || d.includes("erp"))
    return "internal_tool";
  if (d.includes("api") || d.includes("service") || d.includes("microservice") || d.includes("backend"))
    return "api_service";
  if (d.includes("mobile") || d.includes("app") || d.includes("ios") || d.includes("android"))
    return "mobile_app";
  if (d.includes("community") || d.includes("forum") || d.includes("social"))
    return "community";
  if (d.includes("portfolio") || d.includes("landing") || d.includes("marketing"))
    return "portfolio";
  if (d.includes("public") || d.includes("website") || d.includes("blog"))
    return "public_site";
  return "custom";
}

// ── Tech Stack Resolver ──

function resolveTechStack(archetype: AppArchetype): TechStack {
  const stacks: Record<AppArchetype, TechStack> = {
    dashboard: {
      frontend: "React 19 + Tailwind 4 + shadcn/ui",
      backend: "Express 4 + tRPC 11",
      database: "MySQL/TiDB via Drizzle ORM",
      auth: "Manus OAuth",
      hosting: "Manus Cloud (CloudRun)",
      styling: "Tailwind 4 + CSS variables",
      testing: "Vitest + Playwright",
    },
    public_site: {
      frontend: "React 19 + Tailwind 4",
      backend: "Express 4 + tRPC 11",
      database: "MySQL/TiDB via Drizzle ORM",
      auth: "Manus OAuth (optional)",
      hosting: "Manus Cloud (CloudRun)",
      styling: "Tailwind 4 + custom design system",
      testing: "Vitest + Playwright",
    },
    ecommerce: {
      frontend: "React 19 + Tailwind 4 + shadcn/ui",
      backend: "Express 4 + tRPC 11 + Stripe",
      database: "MySQL/TiDB via Drizzle ORM",
      auth: "Manus OAuth + role-based access",
      hosting: "Manus Cloud (CloudRun)",
      styling: "Tailwind 4 + product-focused design",
      testing: "Vitest + Playwright + Stripe test mode",
    },
    saas: {
      frontend: "React 19 + Tailwind 4 + shadcn/ui",
      backend: "Express 4 + tRPC 11 + Stripe subscriptions",
      database: "MySQL/TiDB via Drizzle ORM",
      auth: "Manus OAuth + role-based access + API keys",
      hosting: "Manus Cloud (CloudRun)",
      styling: "Tailwind 4 + professional design system",
      testing: "Vitest + Playwright + load testing",
    },
    internal_tool: {
      frontend: "React 19 + Tailwind 4 + shadcn/ui + DashboardLayout",
      backend: "Express 4 + tRPC 11",
      database: "MySQL/TiDB via Drizzle ORM",
      auth: "Manus OAuth + admin roles",
      hosting: "Manus Cloud (CloudRun)",
      styling: "Tailwind 4 + compact layout",
      testing: "Vitest",
    },
    api_service: {
      frontend: "Minimal (API docs page)",
      backend: "Express 4 + tRPC 11",
      database: "MySQL/TiDB via Drizzle ORM",
      auth: "API key + JWT",
      hosting: "Manus Cloud (CloudRun)",
      styling: "N/A",
      testing: "Vitest + API integration tests",
    },
    mobile_app: {
      frontend: "React Native / Progressive Web App",
      backend: "Express 4 + tRPC 11",
      database: "MySQL/TiDB via Drizzle ORM",
      auth: "Manus OAuth + biometric",
      hosting: "Manus Cloud (CloudRun)",
      styling: "Tailwind 4 + mobile-first",
      testing: "Vitest + Detox/Playwright",
    },
    community: {
      frontend: "React 19 + Tailwind 4 + shadcn/ui",
      backend: "Express 4 + tRPC 11 + WebSocket",
      database: "MySQL/TiDB via Drizzle ORM",
      auth: "Manus OAuth + social login",
      hosting: "Manus Cloud (CloudRun)",
      styling: "Tailwind 4 + community-focused design",
      testing: "Vitest + Playwright",
    },
    portfolio: {
      frontend: "React 19 + Tailwind 4",
      backend: "Static or Express 4",
      database: "Optional",
      auth: "Optional",
      hosting: "Manus Cloud (CloudRun)",
      styling: "Tailwind 4 + creative design",
      testing: "Vitest",
    },
    custom: {
      frontend: "React 19 + Tailwind 4 + shadcn/ui",
      backend: "Express 4 + tRPC 11",
      database: "MySQL/TiDB via Drizzle ORM",
      auth: "Manus OAuth",
      hosting: "Manus Cloud (CloudRun)",
      styling: "Tailwind 4 + CSS variables",
      testing: "Vitest + Playwright",
    },
  };
  return stacks[archetype];
}

// ── Design System Generator ──

function generateDesignSystem(archetype: AppArchetype): DesignSystem {
  const designs: Record<AppArchetype, DesignSystem> = {
    dashboard: {
      colorPalette: { primary: "oklch(0.65 0.15 250)", secondary: "oklch(0.55 0.1 280)", accent: "oklch(0.75 0.15 160)", background: "oklch(0.15 0.01 260)", foreground: "oklch(0.95 0 0)", muted: "oklch(0.4 0.02 260)" },
      typography: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
      spacing: "4px base unit", borderRadius: "8px", shadows: "soft elevation", theme: "dark",
      layoutPattern: "DashboardLayout with sidebar", navigationPattern: "persistent sidebar + breadcrumbs",
    },
    public_site: {
      colorPalette: { primary: "oklch(0.6 0.2 270)", secondary: "oklch(0.7 0.15 200)", accent: "oklch(0.8 0.2 80)", background: "oklch(0.98 0 0)", foreground: "oklch(0.15 0 0)", muted: "oklch(0.6 0.02 260)" },
      typography: { heading: "Plus Jakarta Sans", body: "Inter", mono: "Fira Code" },
      spacing: "4px base unit", borderRadius: "12px", shadows: "medium elevation", theme: "light",
      layoutPattern: "asymmetric hero + content sections", navigationPattern: "sticky top nav + mobile hamburger",
    },
    ecommerce: {
      colorPalette: { primary: "oklch(0.55 0.2 150)", secondary: "oklch(0.65 0.15 30)", accent: "oklch(0.7 0.2 60)", background: "oklch(0.97 0 0)", foreground: "oklch(0.15 0 0)", muted: "oklch(0.6 0.02 260)" },
      typography: { heading: "DM Sans", body: "Inter", mono: "JetBrains Mono" },
      spacing: "4px base unit", borderRadius: "8px", shadows: "card elevation", theme: "light",
      layoutPattern: "product grid + detail pages", navigationPattern: "top nav + category sidebar + cart",
    },
    saas: {
      colorPalette: { primary: "oklch(0.6 0.18 260)", secondary: "oklch(0.5 0.12 300)", accent: "oklch(0.75 0.15 140)", background: "oklch(0.13 0.01 260)", foreground: "oklch(0.95 0 0)", muted: "oklch(0.4 0.02 260)" },
      typography: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
      spacing: "4px base unit", borderRadius: "10px", shadows: "subtle elevation", theme: "dark",
      layoutPattern: "marketing landing + app dashboard", navigationPattern: "top nav (marketing) + sidebar (app)",
    },
    internal_tool: {
      colorPalette: { primary: "oklch(0.6 0.15 250)", secondary: "oklch(0.55 0.1 280)", accent: "oklch(0.7 0.12 160)", background: "oklch(0.97 0 0)", foreground: "oklch(0.15 0 0)", muted: "oklch(0.6 0.02 260)" },
      typography: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
      spacing: "4px base unit", borderRadius: "6px", shadows: "minimal", theme: "light",
      layoutPattern: "DashboardLayout with sidebar", navigationPattern: "persistent sidebar",
    },
    api_service: {
      colorPalette: { primary: "oklch(0.6 0.15 250)", secondary: "oklch(0.55 0.1 280)", accent: "oklch(0.75 0.15 160)", background: "oklch(0.13 0.01 260)", foreground: "oklch(0.95 0 0)", muted: "oklch(0.4 0.02 260)" },
      typography: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
      spacing: "4px base unit", borderRadius: "8px", shadows: "minimal", theme: "dark",
      layoutPattern: "API documentation layout", navigationPattern: "sidebar + endpoint list",
    },
    mobile_app: {
      colorPalette: { primary: "oklch(0.6 0.2 270)", secondary: "oklch(0.7 0.15 200)", accent: "oklch(0.8 0.2 80)", background: "oklch(0.98 0 0)", foreground: "oklch(0.15 0 0)", muted: "oklch(0.6 0.02 260)" },
      typography: { heading: "SF Pro Display", body: "SF Pro Text", mono: "SF Mono" },
      spacing: "4px base unit", borderRadius: "16px", shadows: "iOS-style elevation", theme: "system",
      layoutPattern: "tab-based navigation", navigationPattern: "bottom tab bar + stack navigation",
    },
    community: {
      colorPalette: { primary: "oklch(0.6 0.18 30)", secondary: "oklch(0.55 0.15 260)", accent: "oklch(0.75 0.2 140)", background: "oklch(0.97 0 0)", foreground: "oklch(0.15 0 0)", muted: "oklch(0.6 0.02 260)" },
      typography: { heading: "Plus Jakarta Sans", body: "Inter", mono: "Fira Code" },
      spacing: "4px base unit", borderRadius: "12px", shadows: "card elevation", theme: "light",
      layoutPattern: "feed + profile + threads", navigationPattern: "top nav + contextual sidebar",
    },
    portfolio: {
      colorPalette: { primary: "oklch(0.6 0.2 270)", secondary: "oklch(0.7 0.15 200)", accent: "oklch(0.8 0.2 80)", background: "oklch(0.05 0 0)", foreground: "oklch(0.95 0 0)", muted: "oklch(0.4 0.02 260)" },
      typography: { heading: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" },
      spacing: "4px base unit", borderRadius: "0px", shadows: "dramatic", theme: "dark",
      layoutPattern: "full-bleed sections + scroll-driven", navigationPattern: "minimal top nav + scroll spy",
    },
    custom: {
      colorPalette: { primary: "oklch(0.6 0.15 250)", secondary: "oklch(0.55 0.1 280)", accent: "oklch(0.75 0.15 160)", background: "oklch(0.15 0.01 260)", foreground: "oklch(0.95 0 0)", muted: "oklch(0.4 0.02 260)" },
      typography: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
      spacing: "4px base unit", borderRadius: "8px", shadows: "soft elevation", theme: "dark",
      layoutPattern: "flexible grid", navigationPattern: "adaptive",
    },
  };
  return designs[archetype];
}

// ── Integration Resolver ──

function resolveIntegrations(archetype: AppArchetype): IntegrationSpec[] {
  const integrations: IntegrationSpec[] = [];

  // All apps get auth
  integrations.push({
    name: "Manus OAuth",
    type: "auth",
    provider: "Manus Platform",
    secretsRequired: ["VITE_APP_ID", "OAUTH_SERVER_URL", "JWT_SECRET"],
    setupSteps: ["Auto-configured by template", "Test login flow", "Verify session persistence"],
    testingSteps: ["Login as test user", "Verify protected routes", "Test logout"],
  });

  if (archetype === "ecommerce" || archetype === "saas") {
    integrations.push({
      name: "Stripe Payments",
      type: "payment",
      provider: "Stripe",
      secretsRequired: ["STRIPE_SECRET_KEY", "VITE_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
      setupSteps: ["Configure products/prices", "Create checkout sessions", "Set up webhook handler at /api/stripe/webhook", "Test with 4242 4242 4242 4242"],
      testingSteps: ["Create test checkout", "Verify webhook delivery", "Check subscription status"],
    });
  }

  // Storage for all non-portfolio apps
  if (archetype !== "portfolio") {
    integrations.push({
      name: "S3 File Storage",
      type: "storage",
      provider: "Manus S3",
      secretsRequired: ["S3_CREDENTIALS (auto-injected)"],
      setupSteps: ["Use storagePut() for uploads", "Store metadata in DB", "Use returned URLs in frontend"],
      testingSteps: ["Upload test file", "Verify URL accessibility", "Check metadata persistence"],
    });
  }

  return integrations;
}

// ── Lifecycle Phase Evaluator ──

function evaluatePhase(phase: string, description: string, archetype: AppArchetype): LifecyclePhase {
  // This produces a baseline evaluation — the LLM will refine it
  const phaseDefaults: Record<string, Partial<LifecyclePhase>> = {
    discovery: { score: 7, findings: ["Requirements identified"], recommendations: ["Validate with user stories"], blockers: [] },
    design: { score: 6, findings: ["Design system needed"], recommendations: ["Establish color palette, typography, spacing"], blockers: [] },
    architecture: { score: 7, findings: ["Tech stack selected"], recommendations: ["Document architecture decisions"], blockers: [] },
    implementation: { score: 5, findings: ["Core features pending"], recommendations: ["Implement CRUD operations first"], blockers: [] },
    integration: { score: 4, findings: ["Integrations not wired"], recommendations: ["Wire auth, then payment, then storage"], blockers: [] },
    testing: { score: 3, findings: ["Test coverage low"], recommendations: ["Write unit tests for all procedures"], blockers: [] },
    deployment: { score: 5, findings: ["Deployment pipeline needed"], recommendations: ["Configure CI/CD, set up staging"], blockers: [] },
    observability: { score: 3, findings: ["No monitoring"], recommendations: ["Add error tracking, performance monitoring"], blockers: [] },
    security: { score: 4, findings: ["Security audit needed"], recommendations: ["Review auth, input validation, CORS"], blockers: [] },
    growth: { score: 2, findings: ["No analytics"], recommendations: ["Add usage analytics, A/B testing framework"], blockers: [] },
  };

  const defaults = phaseDefaults[phase] || { score: 5, findings: [], recommendations: [], blockers: [] };

  return {
    phase,
    status: (defaults.score || 5) >= 7 ? "completed" : (defaults.score || 5) >= 4 ? "in_progress" : "needs_attention",
    score: defaults.score || 5,
    findings: defaults.findings || [],
    recommendations: defaults.recommendations || [],
    blockers: defaults.blockers || [],
  };
}

// ── LLM-Driven Lifecycle Analysis ──

async function executeLifecycleWithLLM(
  archetype: AppArchetype,
  techStack: TechStack,
  mode: LifecycleMode,
  args: Record<string, any>
): Promise<LifecycleReport> {
  const startTime = Date.now();
  const appName = args.name || "Untitled App";
  const designSystem = generateDesignSystem(archetype);
  const integrations = resolveIntegrations(archetype);

  const report: LifecycleReport = {
    appName,
    mode,
    archetype,
    techStack,
    phases: [],
    designSystem,
    integrations,
    overallScore: 0,
    overallStatus: "needs_work",
    summary: "",
  };

  try {
    const { invokeLLM } = await import("./_core/llm");

    const prompt = buildLifecyclePrompt(archetype, techStack, designSystem, integrations, mode, args);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a Manus-aligned app lifecycle manager. You evaluate and guide applications through the full SDLC following the Manus App Development Reference.

Your responsibilities:
1. DISCOVERY: Requirements gathering, user stories, feasibility analysis
2. DESIGN: Design system establishment, UI/UX specification, component library
3. ARCHITECTURE: Tech stack selection, data modeling, API design
4. IMPLEMENTATION: Code generation, CRUD validation, feature development
5. INTEGRATION: Wire Stripe, OAuth, APIs, webhooks, storage
6. TESTING: Unit/integration/e2e test generation, coverage analysis
7. DEPLOYMENT: CI/CD pipeline, staging/production, rollback strategy
8. OBSERVABILITY: Error tracking, performance monitoring, alerting
9. SECURITY: Auth audit, input validation, CORS, secrets management
10. GROWTH: Analytics, A/B testing, performance optimization

For each phase, provide:
- Score (0-10)
- Status (not_started/in_progress/completed/needs_attention)
- Key findings
- Specific recommendations
- Blockers

Respond in JSON format.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lifecycle_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              phases: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    phase: { type: "string" },
                    score: { type: "number" },
                    status: { type: "string" },
                    findings: { type: "array", items: { type: "string" } },
                    recommendations: { type: "array", items: { type: "string" } },
                    blockers: { type: "array", items: { type: "string" } },
                  },
                  required: ["phase", "score", "status", "findings", "recommendations", "blockers"],
                  additionalProperties: false,
                },
              },
              architecture_decisions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    decision: { type: "string" },
                    rationale: { type: "string" },
                    alternatives: { type: "array", items: { type: "string" } },
                    tradeoffs: { type: "string" },
                  },
                  required: ["decision", "rationale", "alternatives", "tradeoffs"],
                  additionalProperties: false,
                },
              },
              test_coverage: {
                type: "object",
                properties: {
                  unit_count: { type: "number" },
                  unit_coverage: { type: "number" },
                  unit_passing: { type: "number" },
                  integration_count: { type: "number" },
                  integration_coverage: { type: "number" },
                  integration_passing: { type: "number" },
                  e2e_count: { type: "number" },
                  e2e_coverage: { type: "number" },
                  e2e_passing: { type: "number" },
                  overall: { type: "number" },
                },
                required: ["unit_count", "unit_coverage", "unit_passing", "integration_count", "integration_coverage", "integration_passing", "e2e_count", "e2e_coverage", "e2e_passing", "overall"],
                additionalProperties: false,
              },
              overall_score: { type: "number" },
              summary: { type: "string" },
            },
            required: ["phases", "architecture_decisions", "test_coverage", "overall_score", "summary"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string" && content) {
      const parsed = JSON.parse(content);

      report.phases = parsed.phases?.map((p: any) => ({
        phase: p.phase,
        status: p.status as LifecyclePhase["status"],
        score: p.score,
        findings: p.findings,
        recommendations: p.recommendations,
        blockers: p.blockers,
      })) || [];

      report.architectureDecisions = parsed.architecture_decisions?.map((a: any) => ({
        decision: a.decision,
        rationale: a.rationale,
        alternatives: a.alternatives,
        tradeoffs: a.tradeoffs,
      }));

      if (parsed.test_coverage) {
        report.testCoverage = {
          unit: { count: parsed.test_coverage.unit_count, coverage: parsed.test_coverage.unit_coverage, passing: parsed.test_coverage.unit_passing },
          integration: { count: parsed.test_coverage.integration_count, coverage: parsed.test_coverage.integration_coverage, passing: parsed.test_coverage.integration_passing },
          e2e: { count: parsed.test_coverage.e2e_count, coverage: parsed.test_coverage.e2e_coverage, passing: parsed.test_coverage.e2e_passing },
          overall: parsed.test_coverage.overall,
        };
      }

      report.overallScore = parsed.overall_score;
      report.summary = parsed.summary;
      report.overallStatus = parsed.overall_score >= 7 ? "healthy" : parsed.overall_score >= 4 ? "needs_work" : "critical";
    }
  } catch (err: any) {
    report.summary = `Lifecycle analysis error: ${err.message}`;
    report.overallStatus = "critical";
  }

  return report;
}

// ── Prompt Builder ──

function buildLifecyclePrompt(
  archetype: AppArchetype,
  techStack: TechStack,
  designSystem: DesignSystem,
  integrations: IntegrationSpec[],
  mode: LifecycleMode,
  args: Record<string, any>
): string {
  const parts: string[] = [];

  parts.push(`# App Lifecycle Analysis: ${args.name || "App"}`);
  parts.push(`Mode: ${mode}`);
  parts.push(`Archetype: ${archetype}`);
  parts.push(`Description: ${args.description || "No description provided"}`);
  parts.push("");

  parts.push("## Tech Stack");
  for (const [key, value] of Object.entries(techStack)) {
    parts.push(`- **${key}:** ${value}`);
  }
  parts.push("");

  parts.push("## Design System");
  parts.push(`- Theme: ${designSystem.theme}`);
  parts.push(`- Layout: ${designSystem.layoutPattern}`);
  parts.push(`- Navigation: ${designSystem.navigationPattern}`);
  parts.push(`- Typography: ${designSystem.typography.heading} / ${designSystem.typography.body}`);
  parts.push("");

  parts.push("## Integrations");
  for (const int of integrations) {
    parts.push(`- ${int.name} (${int.type}) via ${int.provider}`);
  }
  parts.push("");

  if (args.codebase_description) {
    parts.push("## Current Codebase");
    parts.push(args.codebase_description);
    parts.push("");
  }

  if (args.focus_areas) {
    parts.push("## Focus Areas");
    parts.push(args.focus_areas);
    parts.push("");
  }

  const phaseList = mode === "full"
    ? ["discovery", "design", "architecture", "implementation", "integration", "testing", "deployment", "observability", "security", "growth"]
    : [mode];

  parts.push(`Evaluate the following lifecycle phases: ${phaseList.join(", ")}`);
  parts.push("Provide specific, actionable findings and recommendations for each phase.");

  return parts.join("\n");
}

// ── Report Formatter ──

function formatLifecycleReport(report: LifecycleReport): string {
  const lines: string[] = [];

  lines.push(`# 🏗️ App Lifecycle Report: ${report.appName}`);
  lines.push("");
  lines.push(`**Archetype:** ${report.archetype} | **Mode:** ${report.mode} | **Score:** ${report.overallScore}/10 | **Status:** ${report.overallStatus}`);
  lines.push("");

  // Tech Stack
  lines.push("## Tech Stack");
  lines.push("");
  lines.push("| Layer | Technology |");
  lines.push("|-------|-----------|");
  for (const [key, value] of Object.entries(report.techStack)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push("");

  // Design System
  if (report.designSystem) {
    lines.push("## Design System");
    lines.push("");
    lines.push(`**Theme:** ${report.designSystem.theme} | **Layout:** ${report.designSystem.layoutPattern} | **Nav:** ${report.designSystem.navigationPattern}`);
    lines.push("");
    lines.push("| Property | Value |");
    lines.push("|----------|-------|");
    lines.push(`| Primary | ${report.designSystem.colorPalette.primary} |`);
    lines.push(`| Heading Font | ${report.designSystem.typography.heading} |`);
    lines.push(`| Body Font | ${report.designSystem.typography.body} |`);
    lines.push(`| Border Radius | ${report.designSystem.borderRadius} |`);
    lines.push(`| Shadows | ${report.designSystem.shadows} |`);
    lines.push("");
  }

  // Phases
  if (report.phases.length > 0) {
    lines.push("## Lifecycle Phases");
    lines.push("");
    lines.push("| Phase | Score | Status | Findings | Recommendations |");
    lines.push("|-------|-------|--------|----------|-----------------|");
    for (const p of report.phases) {
      const statusIcon = p.status === "completed" ? "✓" : p.status === "in_progress" ? "◐" : p.status === "needs_attention" ? "⚠" : "○";
      lines.push(`| ${p.phase} | ${p.score}/10 | ${statusIcon} ${p.status} | ${p.findings.length} | ${p.recommendations.length} |`);
    }
    lines.push("");

    // Detailed phase findings
    for (const p of report.phases) {
      if (p.findings.length > 0 || p.recommendations.length > 0) {
        lines.push(`### ${p.phase} (${p.score}/10)`);
        if (p.findings.length > 0) {
          lines.push("**Findings:**");
          for (const f of p.findings) lines.push(`- ${f}`);
        }
        if (p.recommendations.length > 0) {
          lines.push("**Recommendations:**");
          for (const r of p.recommendations) lines.push(`- ${r}`);
        }
        if (p.blockers.length > 0) {
          lines.push("**Blockers:**");
          for (const b of p.blockers) lines.push(`- ⛔ ${b}`);
        }
        lines.push("");
      }
    }
  }

  // Architecture Decisions
  if (report.architectureDecisions && report.architectureDecisions.length > 0) {
    lines.push("## Architecture Decisions");
    lines.push("");
    for (const d of report.architectureDecisions) {
      lines.push(`### ${d.decision}`);
      lines.push(`**Rationale:** ${d.rationale}`);
      lines.push(`**Alternatives:** ${d.alternatives.join(", ")}`);
      lines.push(`**Tradeoffs:** ${d.tradeoffs}`);
      lines.push("");
    }
  }

  // Test Coverage
  if (report.testCoverage) {
    lines.push("## Test Coverage");
    lines.push("");
    lines.push("| Type | Tests | Coverage | Passing |");
    lines.push("|------|-------|----------|---------|");
    lines.push(`| Unit | ${report.testCoverage.unit.count} | ${report.testCoverage.unit.coverage}% | ${report.testCoverage.unit.passing} |`);
    lines.push(`| Integration | ${report.testCoverage.integration.count} | ${report.testCoverage.integration.coverage}% | ${report.testCoverage.integration.passing} |`);
    lines.push(`| E2E | ${report.testCoverage.e2e.count} | ${report.testCoverage.e2e.coverage}% | ${report.testCoverage.e2e.passing} |`);
    lines.push(`| **Overall** | | **${report.testCoverage.overall}%** | |`);
    lines.push("");
  }

  // Integrations
  if (report.integrations && report.integrations.length > 0) {
    lines.push("## Integrations");
    lines.push("");
    lines.push("| Name | Type | Provider | Secrets |");
    lines.push("|------|------|----------|---------|");
    for (const i of report.integrations) {
      lines.push(`| ${i.name} | ${i.type} | ${i.provider} | ${i.secretsRequired.length} |`);
    }
    lines.push("");
  }

  // Summary
  if (report.summary) {
    lines.push("## Summary");
    lines.push("");
    lines.push(report.summary);
  }

  return lines.join("\n");
}

// ── Main Executor ──

export async function executeAppLifecycle(
  args: {
    mode: LifecycleMode;
    name?: string;
    description?: string;
    codebase_description?: string;
    focus_areas?: string;
  },
  _context?: { userId?: number; taskExternalId?: string }
): Promise<ToolResult> {
  try {
    const appName = args.name || "Untitled App";
    const description = args.description || "Application lifecycle analysis";
    const archetype = classifyArchetype(description);
    const techStack = resolveTechStack(archetype);

    // If mode is "discover", return quick analysis
    if (args.mode === "discover") {
      const designSystem = generateDesignSystem(archetype);
      const integrations = resolveIntegrations(archetype);
      const phases = ["discovery", "design", "architecture", "implementation", "integration", "testing", "deployment", "observability", "security", "growth"]
        .map((p) => evaluatePhase(p, description, archetype));

      const report: LifecycleReport = {
        appName,
        mode: "discover",
        archetype,
        techStack,
        phases,
        designSystem,
        integrations,
        overallScore: Math.round(phases.reduce((sum, p) => sum + p.score, 0) / phases.length),
        overallStatus: "needs_work",
        summary: `Discovery complete for ${appName} (${archetype}). Tech stack and design system selected. ${integrations.length} integrations identified. Ready for design phase.`,
      };

      return {
        success: true,
        result: formatLifecycleReport(report),
        artifactType: "document" as any,
        artifactLabel: `Lifecycle Discovery: ${appName}`,
      };
    }

    // Full LLM-driven analysis
    const report = await executeLifecycleWithLLM(archetype, techStack, args.mode, args);

    return {
      success: true,
      result: formatLifecycleReport(report),
      artifactType: "document" as any,
      artifactLabel: `Lifecycle ${args.mode}: ${appName}`,
    };
  } catch (err: any) {
    return {
      success: false,
      result: `App lifecycle analysis failed: ${err.message}`,
    };
  }
}

// ── Exports for testing ──

export const _testExports = {
  classifyArchetype,
  resolveTechStack,
  generateDesignSystem,
  resolveIntegrations,
  evaluatePhase,
  formatLifecycleReport,
};
