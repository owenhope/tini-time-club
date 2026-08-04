import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import type { ColorValue } from "react-native";

export interface MartiniIconProps {
  size: number;
  color: ColorValue;
  filled?: boolean;
}

/** The app-wide martini glyph used by Feed, map pins, and review prompts. */
const MartiniIcon = ({ size, color, filled = false }: MartiniIconProps) => (
  <Ionicons name={filled ? "wine" : "wine-outline"} size={size} color={color} />
);

export default memo(MartiniIcon);
