import React, { useId } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  Text as SvgText,
  TextPath,
} from "react-native-svg";
import { fonts, useTheme } from "@/theme";

export interface StickerBadgeProps {
  /** Set around the top of the circle. */
  topText: string;
  /** Set around the bottom of the circle. */
  bottomText?: string | null;
  size?: number;
  /** Degrees; the motif is always pinned slightly off square. */
  tilt?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The brand's circular sticker: chartreuse disc, text set around the curve,
 * the olive in the middle, pinned at an angle. It is the poster motif the
 * design system uses to give a flat colour block some presence — here, a venue
 * that has no photograph of its own.
 */
const StickerBadge: React.FC<StickerBadgeProps> = ({
  topText,
  bottomText,
  size = 88,
  tilt = -9,
  style,
}) => {
  const { colors } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  // Each arc is about 190 units of the 200-unit viewBox, so the type is sized
  // to fit the longer of the two rather than running off the end of it: at
  // this weight a glyph is ~0.62em wide, plus the 3-unit letterspacing.
  const longest = Math.max(topText.length, bottomText?.length ?? 0);
  const fontSize = Math.max(
    11,
    Math.min(25, Math.round((190 / Math.max(longest, 1) - 3) / 0.62))
  );

  return (
    <View
      style={[{ transform: [{ rotate: `${tilt}deg` }] }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={bottomText ? `${topText}, ${bottomText}` : topText}
    >
      <Svg viewBox="0 0 200 200" width={size} height={size}>
        <Defs>
          <Path
            id={`sticker-top-${id}`}
            d="M100,100 m-72,0 a72,72 0 1,1 144,0"
            fill="none"
          />
          <Path
            id={`sticker-bottom-${id}`}
            d="M100,100 m-64,0 a64,64 0 1,0 128,0"
            fill="none"
          />
        </Defs>
        <Circle cx="100" cy="100" r="100" fill={colors.highlight} />
        <SvgText
          fill={colors.onHighlight}
          fontFamily={fonts.black}
          fontSize={fontSize}
          letterSpacing={3}
          textAnchor="middle"
        >
          <TextPath href={`#sticker-top-${id}`} startOffset="50%">
            {topText}
          </TextPath>
        </SvgText>
        {bottomText ? (
          <SvgText
            fill={colors.onHighlight}
            fontFamily={fonts.black}
            fontSize={fontSize}
            letterSpacing={3}
            textAnchor="middle"
          >
            <TextPath href={`#sticker-bottom-${id}`} startOffset="50%">
              {bottomText}
            </TextPath>
          </SvgText>
        ) : null}
        {/* The olive, same as the wordmark's: green body, pimento off-centre. */}
        <Ellipse cx="100" cy="100" rx="17" ry="21" fill={colors.onHighlight} />
        <Circle cx="106" cy="93" r="7" fill={colors.like} />
      </Svg>
    </View>
  );
};

export default StickerBadge;
