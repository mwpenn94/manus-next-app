/**
 * @mwpenn94/manus-next-projects
 * Project management and organization for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  taskIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCreateOptions {
  name: string;
  description?: string;
}

export const PACKAGE_NAME = "@mwpenn94/manus-next-projects";
export const PACKAGE_VERSION = "0.1.0";
