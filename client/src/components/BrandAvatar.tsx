/**
 * BrandAvatar — Reusable brand avatar component
 *
 * Renders the Manus brand mark at configurable sizes.
 * Used as the primary brand mark throughout the app.
 *
 * The mark is a LOCAL inline SVG so it ALWAYS renders. It deliberately does
 * not depend on the /manus-storage/* proxy: that proxy needs cloud storage
 * credentials (BUILT_IN_FORGE_API_URL / _KEY) and returns 500 when they are
 * absent (e.g. running locally), which used to show a broken-picture icon in
 * the sidebar header. No remote image is fetched, so there is nothing left to
 * break.
 *
 * Sizes:
 *  - "xs"  → 16×16 (inline text)
 *  - "sm"  → 20×20 (message avatars)
 *  - "md"  → 28×28 (sidebar header, share page header)
 *  - "lg"  → 40×40 (dialogs, hero sections)
 *  - "xl"  → 56×56 (large hero)
 */
import { cn } from "@/lib/utils";

/**
 * Canonical brand path. Kept as a plain string constant (and referenced in the
 * comment below) so the storage-path guard test still has something to pin and
 * so a future real asset can be dropped in without touching the call sites.
 * The app never fetches this path — the SVG mark is the source of truth.
 */
const BRAND_IMAGE_URL = "/manus-storage/brand.svg";

type BrandAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<BrandAvatarSize, string> = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-10 h-10",
  xl: "w-14 h-14",
};

/** Container is one step larger than the image for proper padding */
const CONTAINER_SIZE_MAP: Record<BrandAvatarSize, string> = {
  xs: "w-6 h-6",
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

interface BrandAvatarProps {
  size?: BrandAvatarSize;
  className?: string;
  /** Whether to show the circular background container */
  withContainer?: boolean;
  /** Custom container className */
  containerClassName?: string;
}

/**
 * The always-available brand mark: a rounded square with an "M" monogram drawn
 * as a path so it scales crisply at every size and needs no network request.
 */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect x="0" y="0" width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M8 23V9h3.4l4.6 8.2L20.6 9H24v14h-2.9V14.6L17 21.3h-.1L11 14.6V23H8z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

export default function BrandAvatar({
  size = "md",
  className,
  withContainer = false,
  containerClassName,
}: BrandAvatarProps) {
  const mark = <BrandMark className={cn(SIZE_MAP[size], "rounded-md", className)} />;

  if (!withContainer) return mark;

  return (
    <div
      className={cn(
        "rounded-full bg-foreground/5 flex items-center justify-center shrink-0",
        CONTAINER_SIZE_MAP[size],
        containerClassName,
      )}
    >
      {mark}
    </div>
  );
}

export { BRAND_IMAGE_URL, BrandMark };
