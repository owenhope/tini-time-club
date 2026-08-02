import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { makeStyles, useTheme } from "@/theme";
import AppText from "./AppText";

export type BadgeTone = "chartreuse" | "green" | "muted" | "pimento";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

/**
 * Small pill label — rank names, "Regular", flavour tags. Non-interactive; a
 * tappable pill is a Chip.
 */
const Badge: React.FC<BadgeProps> = ({ label, tone = "green", style }) => {
  const styles = useStyles();
  const { colors } = useTheme();

  const fills: Record<BadgeTone, string> = {
    chartreuse: colors.highlight,
    green: colors.accent,
    muted: colors.accentTonal,
    pimento: colors.warning,
  };
  const inks: Record<BadgeTone, string> = {
    chartreuse: colors.onHighlight,
    green: colors.onAccent,
    muted: colors.onAccentTonal,
    pimento: colors.textOnImage,
  };

  return (
    <View style={[styles.badge, { backgroundColor: fills[tone] }, style]}>
      <AppText variant="eyebrow" style={{ color: inks[tone] }}>
        {label}
      </AppText>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  badge: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: t.spacing.sm + 2,
    paddingVertical: t.spacing.xs + 1,
    borderRadius: t.radius.pill,
  },
}));

export default Badge;
