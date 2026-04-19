/**
 * @mwpenn94/manus-next-share
 * Task sharing with signed URLs, password, and expiry for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Share types
export interface ShareOptions {
  taskId: string;
  expiresIn?: number;
  password?: string;
  allowComments?: boolean;
}

export interface ShareLink {
  id: string;
  url: string;
  expiresAt: Date;
  hasPassword: boolean;
}

export const PACKAGE_NAME = "@mwpenn94/manus-next-share";
export const PACKAGE_VERSION = "0.1.0";
