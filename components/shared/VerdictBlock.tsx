import React from "react";
import { View } from "react-native";
import { makeStyles, useTheme } from "@/theme";
import AppText from "./AppText";
import RatingPips, { PIPS_MAX } from "./RatingPips";

export type VerdictBlockTone = "brand" | "paper";

export interface VerdictBlockProps {
  /** Uppercase tracked label — "Your verdict", "Presentation". */
  eyebrow?: string;
  /** 0 = not yet rated. */
  value: number;
  onChange: (value: number) => void;
  /** One line per whole rating, 1–5. Shown under the pips as the reader rates. */
  labels: readonly string[];
  /** Shown while nothing is rated yet — each step asks its own question. */
  placeholder: string;
  accessibilityLabel: string;
  /**
   * `brand` is the purple block. One screen never carries two of them, so the
   * second rating on the composer takes `paper`.
   */
  tone?: VerdictBlockTone;
}

/**
 * The composer's rating control, on the brand purple. The system uses purple
 * as a full-bleed background surface, and rating a martini is the one moment
 * in the app that earns a block of it.
 *
 * The olives replace the old slider and select in half-point steps. The
 * descriptive line stays because it carries the brand's voice and does the
 * work a bare number can't.
 */
const VerdictBlock: React.FC<VerdictBlockProps> = ({
  eyebrow,
  value,
  onChange,
  labels,
  placeholder,
  accessibilityLabel,
  tone = "brand",
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const line = value > 0 ? labels[Math.round(value) - 1] : placeholder;
  const onPaper = tone === "paper";
  const ink = onPaper ? styles.inkPaper : styles.ink;

  return (
    <View style={[styles.block, onPaper && styles.blockPaper]}>
      {eyebrow ? (
        <AppText variant="eyebrow" style={onPaper ? styles.eyebrowPaper : ink}>
          {eyebrow}
        </AppText>
      ) : null}
      <RatingPips
        value={value}
        max={PIPS_MAX}
        size={42}
        onRate={onChange}
        showValue={value > 0}
        valueColor={onPaper ? colors.text : colors.onBrand}
        onDark={!onPaper}
        bodyColor={onPaper ? colors.secondary : colors.onBrand}
        emptyColor={onPaper ? colors.ratingPipEmpty : colors.onBrand}
        accessibilityLabel={accessibilityLabel}
      />
      <AppText variant="bodyStrong" style={ink}>
        {line}
      </AppText>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  block: {
    width: "100%" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingVertical: t.spacing.xl,
    paddingHorizontal: t.spacing.gutter,
    borderRadius: t.radius.card,
    backgroundColor: t.colors.surfaceBrand,
  },
  blockPaper: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingVertical: t.spacing.lg + 2,
  },
  // Green on purple is the system's approved lockup pairing but only 2.9:1
  // as text, so the block's ink is `onBrand`: near-black green in light,
  // paper in dark, both clearing 5.5:1.
  ink: {
    color: t.colors.onBrand,
    textAlign: "center" as const,
  },
  inkPaper: {
    color: t.colors.text,
    textAlign: "center" as const,
  },
  eyebrowPaper: {
    color: t.colors.textMuted,
    textAlign: "center" as const,
  },
}));

export default VerdictBlock;
