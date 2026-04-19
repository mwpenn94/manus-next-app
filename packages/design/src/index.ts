/**
 * @mwpenn94/manus-next-design
 * Design view and UI generation components for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Design types
export interface DesignPreview {
  html: string;
  css: string;
  js?: string;
  framework?: "react" | "vue" | "svelte" | "html";
}

export interface DesignViewProps {
  preview: DesignPreview;
  editable?: boolean;
  onSave?: (updated: DesignPreview) => void;
}

export const PACKAGE_NAME = "@mwpenn94/manus-next-design";
export const PACKAGE_VERSION = "0.1.0";
