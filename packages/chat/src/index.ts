/**
 * @mwpenn94/manus-next-chat
 * ManusNextChat reusable component for embedding agent chat
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// ManusNextChat component re-export
export { default as ManusNextChat } from "../../client/src/components/ManusNextChat";

export interface ManusNextChatProps {
  apiEndpoint?: string;
  taskId?: string;
  placeholder?: string;
  className?: string;
  onMessage?: (message: { role: string; content: string }) => void;
  onToolCall?: (tool: string, args: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
}

export const PACKAGE_NAME = "@mwpenn94/manus-next-chat";
export const PACKAGE_VERSION = "0.1.0";
