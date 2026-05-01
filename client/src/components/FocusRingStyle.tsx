
import React from 'react';

const focusRingStyles = `
  @layer utilities {
    .focus-ring:focus-visible {
      outline: none;
      box-shadow: none;
      ring-width: 2px;
      --tw-ring-offset-width: 2px;
      --tw-ring-color: hsl(var(--primary) / 0.5);
      --tw-ring-offset-color: hsl(var(--background));
      box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
    }
  }
`;

/**
 * Injects a global CSS style to handle a consistent focus ring appearance.
 * This should be rendered once in the application layout root.
 */
export function FocusRingProvider() {
  return <style>{focusRingStyles}</style>;
}

/**
 * A string of Tailwind CSS classes for manually applying the focus ring style.
 * Useful for components that don't use the global .focus-ring class.
 */
export const focusRing = 'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';

/**
 * A utility component that wraps its children in a div with the focus ring class.
 * This is an alternative to manually adding the class string.
 */
export const FocusRing = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { cn } = require('@/lib/utils'); // Late import to avoid circular dependency issues
  return <div className={cn('focus-ring', className)}>{children}</div>;
};
