/**
 * Scaffold all 13 upstream package stubs as local workspace packages.
 * Each package re-exports from the monolith source, enabling future npm extraction.
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const PACKAGES = [
  {
    name: "core",
    description: "Core types, utilities, and shared constants for Manus Next",
    exports: ["ManusNextChatProps", "ManusNextChatHandle", "ManusNextChatConfig", "ManusNextChatTheme", "ManusNextChatEvents"],
    source: "shared/ManusNextChat.types.ts",
  },
  {
    name: "chat",
    description: "Chat UI components and message rendering",
    exports: ["AIChatBox"],
    source: "client/src/components/AIChatBox.tsx",
  },
  {
    name: "agent",
    description: "Agent streaming, tool execution, and LLM integration",
    exports: ["streamAgent", "AgentMode"],
    source: "server/agentStream.ts",
  },
  {
    name: "tools",
    description: "Agent tool definitions and executors",
    exports: ["TOOLS", "executeTool"],
    source: "server/agentTools.ts",
  },
  {
    name: "memory",
    description: "Cross-session memory extraction and retrieval",
    exports: ["extractMemories", "searchMemories"],
    source: "server/db.ts",
  },
  {
    name: "scheduler",
    description: "Task scheduling with cron and interval support",
    exports: ["startScheduler", "stopScheduler"],
    source: "server/scheduler.ts",
  },
  {
    name: "bridge",
    description: "Real-time bridge integration for external tool status",
    exports: ["BridgeProvider", "useBridge"],
    source: "client/src/contexts/BridgeContext.tsx",
  },
  {
    name: "storage",
    description: "S3 file storage helpers",
    exports: ["storagePut", "storageGet"],
    source: "server/storage.ts",
  },
  {
    name: "voice",
    description: "Voice STT (Whisper) and TTS (SpeechSynthesis) integration",
    exports: ["useTTS", "transcribeAudio"],
    source: "client/src/hooks/useTTS.ts",
  },
  {
    name: "share",
    description: "Task sharing with password protection and expiration",
    exports: ["ShareDialog"],
    source: "client/src/components/ShareDialog.tsx",
  },
  {
    name: "replay",
    description: "Session replay with timeline scrubber",
    exports: ["ReplayPage"],
    source: "client/src/pages/ReplayPage.tsx",
  },
  {
    name: "design",
    description: "Design view canvas (stub)",
    exports: ["DesignView"],
    source: "client/src/pages/DesignView.tsx",
  },
  {
    name: "projects",
    description: "Project workspace management",
    exports: ["ProjectsPage"],
    source: "client/src/pages/ProjectsPage.tsx",
  },
];

const ROOT = process.cwd();

for (const pkg of PACKAGES) {
  const dir = join(ROOT, "packages", pkg.name);
  const srcDir = join(dir, "src");

  if (!existsSync(srcDir)) mkdirSync(srcDir, { recursive: true });

  // package.json
  const packageJson = {
    name: `@mwpenn94/manus-next-${pkg.name}`,
    version: "0.1.0",
    description: pkg.description,
    main: "src/index.ts",
    types: "src/index.ts",
    license: "MIT",
    publishConfig: {
      access: "public",
    },
    peerDependencies: {
      react: ">=18.0.0",
      "react-dom": ">=18.0.0",
    },
  };

  writeFileSync(join(dir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n");

  // src/index.ts — re-export stub
  const exportLines = pkg.exports.map((e) => `  // ${e}`).join("\n");
  const indexContent = `/**
 * @mwpenn94/manus-next-${pkg.name}
 * ${pkg.description}
 *
 * This package is a local workspace stub that will be extracted
 * from the monolith when published to npm.
 *
 * Source: ${pkg.source}
 *
 * Planned exports:
${exportLines}
 */

// Re-export placeholder — replace with actual imports after extraction
export const PACKAGE_NAME = "@mwpenn94/manus-next-${pkg.name}";
export const PACKAGE_VERSION = "0.1.0";
export const PACKAGE_STATUS = "local-workspace-stub";

// TODO: After npm publish, replace these with actual re-exports:
// export { ${pkg.exports.join(", ")} } from "../../${pkg.source.replace(".ts", "").replace(".tsx", "")}";
`;

  writeFileSync(join(srcDir, "index.ts"), indexContent);

  // README.md
  const readme = `# @mwpenn94/manus-next-${pkg.name}

${pkg.description}

## Status

**Local workspace stub** — This package is part of the Manus Next monorepo and will be extracted for npm publication.

## Planned Exports

${pkg.exports.map((e) => `- \`${e}\``).join("\n")}

## Source

Extracted from: \`${pkg.source}\`
`;

  writeFileSync(join(dir, "README.md"), readme);

  console.log(`✓ @mwpenn94/manus-next-${pkg.name}`);
}

console.log(`\n✓ All ${PACKAGES.length} packages scaffolded`);
