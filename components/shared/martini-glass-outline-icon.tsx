import React from "react";
import Svg, { Path } from "react-native-svg";

export interface MartiniGlassOutlineIconProps {
  size?: number;
  color?: string;
}

/** Tall, single-line martini glass used by the shaker interstitial. */
export default function MartiniGlassOutlineIcon({
  size = 24,
  color = "currentColor",
}: MartiniGlassOutlineIconProps) {
  return (
    <Svg width={size * 0.76} height={size} viewBox="0 0 24 32" fill="none">
      <Path
        d="M3.2 7.15c1.2-2.25 5.5-3.15 12.8-2.65"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
      />
      <Path
        d="m4.2 8.25 5.15 5.55c1.45 1.55 2.75 1.55 4.05-.05l4.7-6.85c.45-.65.9-1 1.25-.8.45.27.2.95-.45 1.15-3.7 1.1-10.65 1.1-15.2.05"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11.4 15.15v10.1c0 1.35-.95 1.75-3.1 2.15"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
      />
      <Path
        d="M7.15 27.3c-1.75.35-2.5 1.2-1.2 2.1 1.9 1.3 8.85 1.35 10.8.05 1.1-.75.4-1.55-1.35-1.85-1.55-.25-2.35.05-1.1.5 1.45.5 1.15.95.25 1.2-1.8.5-6.55.45-8.15-.45"
        stroke={color}
        strokeWidth="0.38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
