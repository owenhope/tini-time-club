import React, { memo } from "react";
import type { ColorValue } from "react-native";
import Svg, { G, Path } from "react-native-svg";

export const OLIVE_ICON_COLOR = "#336654";
export const OLIVE_PIMENTO_COLOR = "#EA6363";
const OLIVE_VIEW_BOX = {
  x: 66.31,
  y: 58.15,
  width: 358.94,
  height: 426.55,
} as const;
const OLIVE_ASPECT_RATIO = OLIVE_VIEW_BOX.width / OLIVE_VIEW_BOX.height;
const OLIVE_CANVAS_PADDING_RATIO = 0.12;
const OLIVE_BODY_PATH =
  "M400.249 341.459C450.677 230.238 422.399 108.719 337.088 70.038C251.777 31.357 141.738 90.1621 91.309 201.383C40.8804 312.604 69.1585 434.123 154.47 472.804C239.781 511.485 349.82 452.68 400.249 341.459Z";
const OLIVE_PIMENTO_PATH =
  "M353.699 265.185C316.951 300.048 266.697 298.792 241.413 262.358C216.13 225.924 225.238 168.132 261.986 133.426C298.734 98.5624 348.988 99.8187 374.272 136.253C399.556 172.687 390.447 230.478 353.699 265.185Z";

export interface OliveIconProps {
  size: number;
  color?: ColorValue;
  pimentoColor?: ColorValue;
  opacity?: number;
  outlineColor?: ColorValue;
}

export const getOliveIconCanvasSize = (size: number) => {
  const padding = size * OLIVE_CANVAS_PADDING_RATIO;

  return {
    width: size * OLIVE_ASPECT_RATIO + padding * 2,
    height: size + padding * 2,
    padding,
  };
};

const OliveIcon = ({
  size,
  color = OLIVE_ICON_COLOR,
  pimentoColor = OLIVE_PIMENTO_COLOR,
  opacity = 1,
  outlineColor,
}: OliveIconProps) => {
  const canvas = getOliveIconCanvasSize(size);
  const scale = size / OLIVE_VIEW_BOX.height;

  return (
    <Svg width={canvas.width} height={canvas.height} fill="none">
      <G
        transform={`matrix(${scale} 0 0 ${scale} ${
          canvas.padding - OLIVE_VIEW_BOX.x * scale
        } ${canvas.padding - OLIVE_VIEW_BOX.y * scale})`}
      >
        <Path
          d={OLIVE_BODY_PATH}
          fill={outlineColor ? "transparent" : color}
          stroke={outlineColor}
          strokeWidth={outlineColor ? 28 : 0}
          opacity={opacity}
        />
        {outlineColor ? null : (
          <Path d={OLIVE_PIMENTO_PATH} fill={pimentoColor} opacity={opacity} />
        )}
      </G>
    </Svg>
  );
};

export default memo(OliveIcon);
