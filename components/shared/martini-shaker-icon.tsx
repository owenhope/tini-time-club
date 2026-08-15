import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

export interface MartiniShakerIconProps {
  size?: number;
  color?: string;
}

/** Compact cobbler-shaker glyph for controls where a martini glass is vague. */
export default function MartiniShakerIcon({
  size = 20,
  color = "currentColor",
}: MartiniShakerIconProps) {
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
