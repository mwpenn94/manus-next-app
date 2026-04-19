/**
 * @mwpenn94/manus-next-tools
 * Tool definitions and executors for Manus Next agent
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Tool types
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolExecutor {
  name: string;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export type ToolResult = {
  success: boolean;
  content: string;
  artifacts?: Array<{ type: string; url: string; filename?: string }>;
};

// Re-export tool definitions
export { TOOL_DEFINITIONS } from "../../server/agentTools";

export const PACKAGE_NAME = "@mwpenn94/manus-next-tools";
export const PACKAGE_VERSION = "0.1.0";
