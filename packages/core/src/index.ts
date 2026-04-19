/**
 * @mwpenn94/manus-next-core
 * Core types, utilities, and shared constants for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Core types re-exported from monolith
export type { Message, InvokeParams, InvokeResult, Tool, ToolCall } from "../../server/_core/llm";
export type { ENV as EnvConfig } from "../../server/_core/env";

// Shared constants
export { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG, AXIOS_TIMEOUT_MS } from "../../shared/const";

// Package metadata
export const PACKAGE_NAME = "@mwpenn94/manus-next-core";
export const PACKAGE_VERSION = "0.1.0";

// Utility types
export type TaskStatus = "running" | "completed" | "failed" | "cancelled";
export type CapabilityStatus = "GREEN" | "YELLOW" | "RED" | "N/A";
export type AgentMode = "speed" | "quality" | "max";

export interface ManusNextConfig {
  apiUrl: string;
  appId: string;
  theme?: "light" | "dark";
  locale?: string;
}
