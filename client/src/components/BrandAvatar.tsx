/**
 * BrandAvatar — Reusable brand avatar component
 *
 * Renders the Sovereign AI hand+coins brand image at configurable sizes.
 * Replaces all paw emoji (🐾) instances across the app.
 *
 * Sizes:
 *  - "xs"  → 16×16 (inline text)
 *  - "sm"  → 20×20 (message avatars)
 *  - "md"  → 28×28 (sidebar header, share page header)
 *  - "lg"  → 40×40 (dialogs, hero sections)
 *  - "xl"  → 56×56 (large hero)
 */
import { cn } from "@/lib/utils";

const BRAND_IMAGE_URL = "/manus-storage/white_marble_hero_29fc0d2e.png";

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

export default function BrandAvatar({
  size = "md",
  className,
  withContainer = false,
  containerClassName,
}: BrandAvatarProps) {
  const img = (
    <img
      src={BRAND_IMAGE_URL}
      alt="Sovereign AI"
      className={cn(SIZE_MAP[size], "rounded-md object-cover", className)}
      loading="lazy"
    />
  );

  if (!withContainer) return img;

  return (
    <div
      className={cn(
        "rounded-full bg-foreground/5 flex items-center justify-center shrink-0",
        CONTAINER_SIZE_MAP[size],
        containerClassName,
      )}
    >
      {img}
    </div>
  );
}

export { BRAND_IMAGE_URL };
