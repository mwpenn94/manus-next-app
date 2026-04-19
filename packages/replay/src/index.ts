/**
 * @mwpenn94/manus-next-replay
 * Task replay with timeline scrubbing for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Replay types
export interface ReplayEvent {
  id: string;
  type: "message" | "tool_call" | "tool_result" | "image" | "document" | "error";
  timestamp: number;
  data: Record<string, unknown>;
}

export interface ReplayOptions {
  taskId: string;
  speed?: number;
  autoPlay?: boolean;
  onEvent?: (event: ReplayEvent) => void;
}

export const PACKAGE_NAME = "@mwpenn94/manus-next-replay";
export const PACKAGE_VERSION = "0.1.0";
