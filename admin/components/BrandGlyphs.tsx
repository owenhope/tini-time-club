/**
 * Inline copies of the exact glyphs the app renders for these concepts, so
 * the website and the app agree: MaterialIcons "verified"
 * (LocationVerifiedBadge), Ionicons "wine" (MartiniIcon, filled, award gold
 * for Golden Glass), and Ionicons "ribbon-outline" (the Passport info hero).
 */

interface GlyphProps {
  size?: number;
  className?: string;
}

export function VerifiedGlyph({ size = 24, className }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="m23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z" />
    </svg>
  );
}

export function MartiniGlyph({ size = 24, className }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M414.56 94.92V80a16 16 0 00-16-16H113.44a16 16 0 00-16 16v14.92c-1.46 11.37-9.65 90.74 36.93 144.69 24.87 28.8 60.36 44.85 105.63 47.86V416h-80a16 16 0 000 32h192a16 16 0 000-32h-80V287.47c45.27-3 80.76-19.06 105.63-47.86 46.58-53.95 38.37-133.32 36.93-144.69zm-285.3 3.41a15.14 15.14 0 00.18-2.33h253.12a15.14 15.14 0 00.18 2.33 201.91 201.91 0 010 45.67H129.32a204.29 204.29 0 01-.06-45.67z" />
    </svg>
  );
}

export function PassportGlyph({ size = 24, className }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={32}
      className={className}
      aria-hidden
    >
      <circle cx="256" cy="160" r="128" />
      <path d="M143.65 227.82L48 400l86.86-.42a16 16 0 0113.82 7.8L192 480l88.33-194.32" />
      <path d="M366.54 224L464 400l-86.86-.42a16 16 0 00-13.82 7.8L320 480l-64-140.8" />
      <circle cx="256" cy="160" r="64" />
    </svg>
  );
}
