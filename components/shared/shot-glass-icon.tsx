import React from "react";
import Svg, { Path } from "react-native-svg";

export interface ShotGlassIconProps {
  size?: number;
  color?: string;
}

/** Tall double-ended jigger in the shaker interstitial's single-line style. */
export default function ShotGlassIcon({
  size = 24,
  color = "currentColor",
}: ShotGlassIconProps) {
  return (
    <Svg width={size * 0.62} height={size} viewBox="0 0 20 32" fill="none">
      <Path
        d="M2.45 3.15c1.22-1.65 9.62-1.72 14.48-.52"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
      />
      <Path
        d="M2.75 3.42c2.9.82 10.9.92 14.55.08.65-.15.85-.55.5-.82"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.35 4.05c.92 3.65 2.28 7.48 4.18 11.2 1.22.32 2.52.35 3.78.08 2.05-3.72 3.52-7.58 4.55-11.32"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.53 15.25c1.25.25 2.52.28 3.78.08"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
      />
      <Path
        d="M7.53 15.25c-1.18 3.82-2.68 8.42-4.12 12.92M11.31 15.33c1.15 3.75 2.62 8.3 4.15 12.75"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
      />
      <Path
        d="M3.38 28.22c-1.18.22-1.55.78-.68 1.4 1.52 1.05 11.88 1.18 14.48.08 1.05-.45.42-1.18-.9-1.38-3.28-.48-9.98-.45-12.9-.1"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
