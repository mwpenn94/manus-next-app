/**
 * @mwpenn94/manus-next-agent
 * Agent streaming, tool dispatch, and mode routing for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Agent types
export type AgentMode = "speed" | "quality" | "max";
export type ToolName = "web_search" | "wide_research" | "generate_image" | "generate_document" | "execute_code" | "analyze_data" | "analyze_image" | "memory_search";

export interface AgentStreamOptions {
  taskId: string;
  message: string;
  mode: AgentMode;
  onToken: (token: string) => void;
  onToolCall: (tool: string, args: Record<string, unknown>) => void;
  onToolResult: (tool: string, result: string) => void;
  onImage: (url: string) => void;
  onDocument: (url: string, filename: string) => void;
  onDone: (content: string) => void;
  onError: (error: Error) => void;
}

export interface AgentConfig {
  maxToolTurns: number;
  systemPrompt: string;
  tools: ToolName[];
}

// Re-export tool definitions
export { TOOL_DEFINITIONS } from "../../server/agentTools";

export const PACKAGE_NAME = "@mwpenn94/manus-next-agent";
export const PACKAGE_VERSION = "0.1.0";
