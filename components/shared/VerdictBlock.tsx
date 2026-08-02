import React from "react";
import { View } from "react-native";
import { makeStyles, useTheme } from "@/theme";
import AppText from "./AppText";
import RatingPips, { PIPS_MAX } from "./RatingPips";

export interface VerdictBlockProps {
  /** Uppercase tracked label — "Your verdict", "Presentation". */
  eyebrow: string;
  /** 0 = not yet rated. */
  value: number;
  onChange: (value: number) => void;
  /** One line per rating, 1–5. Shown under the pips as the reader rates. */
  labels: readonly string[];
  /** Shown while nothing is rated yet. */
  placeholder?: string;
  accessibilityLabel: string;
}

/**
 * The composer's rating control, on the brand purple. The system uses purple
 * as a full-bleed background surface, and rating a martini is the one moment
 * in the app that earns a block of it.
 *
 * The olives replace the old slider — both snap to whole numbers, so nothing
 * is lost — but the slider's descriptive line stays, because it carries the
 * brand's voice and does the work a bare number can't.
 */
const VerdictBlock: React.FC<VerdictBlockProps> = ({
  eyebrow,
  value,
  onChange,
  labels,
  placeholder = "Taste. Presentation. Judgment.",
  accessibilityLabel,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const line = value >= 1 ? labels[Math.round(value) - 1] : placeholder;

  return (
    <View style={styles.block}>
      <AppText variant="eyebrow" style={styles.ink}>
        {eyebrow}
      </AppText>
      <RatingPips
        value={value}
        max={PIPS_MAX}
        size={34}
        onRate={onChange}
        bodyColor={colors.onBrand}
        accessibilityLabel={accessibilityLabel}
      />
      <AppText variant="bodyStrong" style={styles.ink}>
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
  // Green on purple is the system's approved lockup pairing but only 2.9:1
  // as text, so the block's ink is `onBrand`: near-black green in light,
  // paper in dark, both clearing 5.5:1.
  ink: {
    color: t.colors.onBrand,
    textAlign: "center" as const,
  },
}));

export default VerdictBlock;
