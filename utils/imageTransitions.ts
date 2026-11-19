import type { ImageTransition } from "expo-image";

/**
 * Fade an image in only when it actually loads from the network. Images
 * already in expo-image's memory or disk cache appear instantly, so scrolling
 * back, switching tabs or remounting a list doesn't re-fade what the member
 * has already seen.
 */
export const fadeIn = (duration: number): ImageTransition => ({
  duration,
  skipOnCacheHit: "all",
});
