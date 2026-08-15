import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

export interface MartiniShakerIconProps {
  size?: number;
  color?: string;
  variant?: "compact" | "streamlined";
}

/** Compact cobbler-shaker glyph for controls where a martini glass is vague. */
export default function MartiniShakerIcon({
  size = 20,
  color = "currentColor",
  variant = "compact",
}: MartiniShakerIconProps) {
  if (variant === "streamlined") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M10.25 2.4h3.5c.47 0 .85.38.85.85V5.2H9.4V3.25c0-.47.38-.85.85-.85Z"
          stroke={color}
          strokeWidth="0.28"
          strokeLinejoin="round"
        />
        <Rect
          x="8"
          y="5.2"
          width="8"
          height="2.8"
          rx="1.2"
          stroke={color}
          strokeWidth="0.28"
        />
        <Path
          d="M8.4 8h7.2l-.95 11.2c-.08.9-.83 1.6-1.74 1.6h-1.82c-.91 0-1.66-.7-1.74-1.6L8.4 8Z"
          stroke={color}
          strokeWidth="0.28"
          strokeLinejoin="round"
        />
        <Path
          d="m10.45 10.4.55 7.1"
          stroke={color}
          strokeWidth="0.14"
          strokeLinecap="round"
          opacity="0.55"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="3.5" rx="1.4" fill={color} />
      <Rect
        x="6.5"
        y="5.5"
        width="11"
        height="3"
        rx="1.5"
        stroke={color}
        strokeWidth="1.8"
      />
      <Path
        d="M7 8.5h10l-1.4 11.2c-.1.75-.73 1.3-1.48 1.3H9.88c-.75 0-1.38-.55-1.48-1.3L7 8.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Path
        d="m10 11 1 7"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.72"
      />
    </Svg>
  );
}
