const GOLD = "#C9A227";

export default function GoldenGlassMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      aria-label="Golden Glass"
      className="shrink-0"
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 24 24"
      width={size}
    >
      <path
        d="M3.5 4.5h17L13 12v5.5h4v2H7v-2h4V12L3.5 4.5Z"
        stroke={GOLD}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M6 8h12" stroke={GOLD} strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
