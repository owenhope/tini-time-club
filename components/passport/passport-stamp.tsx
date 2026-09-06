import { View } from "react-native";
import Svg, { Circle, Polygon, Text as SvgText, TSpan } from "react-native-svg";
import type { PassportStampShape } from "@/services/passportService";
import { makeStyles, useTheme } from "@/theme";

export type { PassportStampShape };

type PassportStampProps = {
  shape: PassportStampShape;
  milestone: number;
  pointAward: number;
  earned: boolean;
  label: string;
  appearance?: "default" | "profile";
  accessibilityLabel?: string;
};

type StampGeometry =
  { kind: "circle" } | { kind: "polygon"; sides: number; notched?: boolean };

const STAMP_GEOMETRY: Record<PassportStampShape, StampGeometry> = {
  locations: { kind: "circle" },
  martinis: { kind: "circle" },
  combination: { kind: "circle" },
  type_reviews: { kind: "circle" },
  regulars: { kind: "polygon", sides: 18, notched: true },
  comments: { kind: "polygon", sides: 8 },
  likes_received: { kind: "polygon", sides: 18, notched: true },
  shares: { kind: "polygon", sides: 8 },
};

const polygonPoints = (sides: number, outer = 45, inner?: number) => {
  const count = inner ? sides * 2 : sides;
  return Array.from({ length: count }, (_, index) => {
    const radius = inner && index % 2 ? inner : outer;
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(" ");
};

// Keep each piece of stamp copy in a fixed vertical band. Wrapped labels begin
// at the same position as single-line labels and only grow downward, ensuring
// the count-to-label spacing never changes with the number of label lines.
const POINTS_BASELINE_Y = 27;
const MILESTONE_BASELINE_Y = 55;
const LABEL_BASELINE_Y = 69;
const LABEL_LINE_HEIGHT = 8;

function StampOutline({
  shape,
  earned,
  milestone,
  pointAward,
  label,
  onProfile,
}: {
  shape: PassportStampShape;
  earned: boolean;
  milestone: number;
  pointAward: number;
  label: string;
  onProfile: boolean;
}) {
  const { colors, typography } = useTheme();
  const displayLabel = label.replace(" · ", " ").toUpperCase();
  const words = displayLabel.split(/\s+/);
  const splitAt = Math.ceil(words.length / 2);
  const labelLines =
    displayLabel.length <= 10 || words.length === 1
      ? [displayLabel]
      : [words.slice(0, splitAt).join(" "), words.slice(splitAt).join(" ")];
  const isCombination = shape === "combination";
  const textColor = onProfile ? colors.onHeaderBrand : colors.text;
  // Profile stamps sit on the purple brand surface, so their rings stay white
  // in both color schemes. The full Passport keeps the theme accent treatment.
  const outlineColor = onProfile ? colors.onHeaderBrand : colors.accent;
  const common = {
    fill: "transparent",
    stroke: outlineColor,
    strokeWidth: 1.8,
  };
  const inner = {
    fill: "transparent",
    stroke: common.stroke,
    strokeWidth: 0.7,
    opacity: 0.45,
  };

  const geometry = (
    inset: boolean,
    props: {
      fill: string;
      stroke: string;
      strokeWidth: number;
      opacity?: number;
    }
  ) => {
    const spec = STAMP_GEOMETRY[shape];
    if (spec.kind === "circle") {
      return <Circle cx="50" cy="50" r={inset ? 40 : 45} {...props} />;
    }
    return (
      <Polygon
        points={polygonPoints(
          spec.sides,
          inset ? 40 : 46,
          spec.notched ? (inset ? 36 : 41) : undefined
        )}
        {...props}
      />
    );
  };

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      opacity={earned ? 1 : 0.42}
    >
      {geometry(false, common)}
      {geometry(true, inner)}
      <SvgText
        x="50"
        y={POINTS_BASELINE_Y}
        fill={textColor}
        fontFamily={typography.label.fontFamily}
        fontSize="8"
        textAnchor="middle"
      >
        {`+${pointAward} pts`}
      </SvgText>
      {!isCombination ? (
        <SvgText
          x="50"
          y={MILESTONE_BASELINE_Y}
          fill={textColor}
          fontFamily={typography.title.fontFamily}
          fontSize="22"
          textAnchor="middle"
        >
          {milestone}
        </SvgText>
      ) : null}
      <SvgText
        x="50"
        y={
          isCombination ? (labelLines.length === 1 ? 59 : 54) : LABEL_BASELINE_Y
        }
        fill={textColor}
        fontFamily={typography.eyebrow.fontFamily}
        fontSize={isCombination ? "10" : "7"}
        letterSpacing={isCombination ? "0.5" : "0.7"}
        textAnchor="middle"
      >
        {labelLines.map((line, index) => (
          <TSpan
            key={`${line}-${index}`}
            x="50"
            dy={index === 0 ? 0 : isCombination ? 11 : LABEL_LINE_HEIGHT}
          >
            {line}
          </TSpan>
        ))}
      </SvgText>
    </Svg>
  );
}

export function PassportStamp({
  shape,
  milestone,
  pointAward,
  earned,
  label,
  appearance = "default",
  accessibilityLabel,
}: PassportStampProps) {
  const styles = useStyles();
  const onProfile = appearance === "profile";

  return (
    <View
      style={styles.container}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.stamp, onProfile && styles.profileStamp]}>
        <View style={styles.outline}>
          <StampOutline
            shape={shape}
            earned={earned}
            milestone={milestone}
            pointAward={pointAward}
            label={label}
            onProfile={onProfile}
          />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  container: { width: "100%" as const, alignItems: "center" as const },
  stamp: {
    width: "100%" as const,
    maxWidth: 84,
    aspectRatio: 1,
    position: "relative" as const,
  },
  profileStamp: { maxWidth: 78 },
  outline: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
}));
