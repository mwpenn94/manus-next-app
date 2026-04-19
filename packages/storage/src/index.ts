/**
 * @mwpenn94/manus-next-storage
 * S3 storage helpers for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Storage types
export interface StoragePutResult {
  key: string;
  url: string;
}

export interface StorageGetResult {
  key: string;
  url: string;
}

export type { storagePut, storageGet } from "../../server/storage";

export const PACKAGE_NAME = "@mwpenn94/manus-next-storage";
export const PACKAGE_VERSION = "0.1.0";
