import Svg, { Path } from "react-native-svg";

export interface PassportIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Slightly open passport cover, intentionally free of interior ornament. */
export default function PassportIcon({
  size = 22,
  color = "currentColor",
  strokeWidth = 1.8,
}: PassportIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5.2 16.7 2.1c1.9-.5 3.1.45 3.1 2.25"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 5.2h10.9c2.35 0 4.1 1.8 4.1 4.15v8.05c0 2.55-1.95 4.6-4.5 4.6H5V5.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
