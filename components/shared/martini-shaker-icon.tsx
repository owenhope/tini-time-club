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
      <Svg width={size * 0.62} height={size} viewBox="0 0 20 32" fill="none">
        <Path
          d="M6.9 6.25c.18-1.4.42-3.55.62-4.75.16-.95.98-1.28 3.05-1.22 1.48.05 2.1.32 2.28 1.18.18.85.4 3.02.55 4.62"
          stroke={color}
          strokeWidth="0.38"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M11.46 1.55c-.05 1.14.02 2.22.25 3.12.15.6.5.85.88.62.3-.2.25-.72.08-1.35-.18-.7-.25-1.35-.28-1.95"
          stroke={color}
          strokeWidth="0.38"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M6.95 6.2c-1.08.45-1.68 1.52-2.05 3.2l-.22.88c-.12.5-.35.7-.78.72-.58.02-.88.32-.8.73.14.75 2.52.98 7.22.96 4.72-.02 6.86-.27 6.98-1 .05-.4-.27-.68-.84-.7-.42-.02-.62-.25-.72-.7l-.25-1.02c-.36-1.48-1.04-2.57-2.2-3.08"
          stroke={color}
          strokeWidth="0.38"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M4.05 14.12c.1 4.35.42 9.35 1.05 13.82.28 1.95 1.08 2.8 2.5 3.1 1.2.24 3.98.2 5.13-.08 1.37-.33 2.1-1.18 2.4-3.1.7-4.4 1.05-9.45 1.18-13.68"
          stroke={color}
          strokeWidth="0.38"
          strokeLinecap="round"
        />
        <Path
          d="M5.12 14.72c.22 4.18.55 8.9 1.1 12.28.26 1.62.72 2.15 1.75 2.38 1.1.25 3.25.18 4.28-.1 1.02-.28 1.45-.83 1.68-2.38.5-3.38.82-8.05 1.02-12.2"
          stroke={color}
          strokeWidth="0.28"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  const strokeWidth = 1.65;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.6 4.15V1.7c0-.55.45-1 1-1h2.8c.55 0 1 .45 1 1v2.45"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m9.6 4.15-2.35 1.5a2.8 2.8 0 0 0-1.1 1.35L5.1 9.65h13.8L17.85 7a2.8 2.8 0 0 0-1.1-1.35l-2.35-1.5H9.6Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Rect
        x="4"
        y="9.1"
        width="16"
        height="2.45"
        rx="0.7"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M5.15 11.55h13.7l-1.15 10.2c-.1.87-.83 1.53-1.7 1.53H8c-.87 0-1.6-.66-1.7-1.53l-1.15-10.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
