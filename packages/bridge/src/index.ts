/**
 * @mwpenn94/manus-next-bridge
 * Desktop bridge for Manus Next (Electron/Tauri integration)
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Bridge types
export interface BridgeConfig {
  runtime: "electron" | "tauri" | "browser";
  apiUrl: string;
  features: {
    fileSystem: boolean;
    notifications: boolean;
    clipboard: boolean;
    deepLinks: boolean;
  };
}

export interface BridgeAPI {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  showNotification(title: string, body: string): Promise<void>;
  getClipboard(): Promise<string>;
  setClipboard(text: string): Promise<void>;
}

export const PACKAGE_NAME = "@mwpenn94/manus-next-bridge";
export const PACKAGE_VERSION = "0.1.0";

// Bridge is deferred per DEFERRED_CAPABILITIES.md — desktop runtime not in scope for Phase A
