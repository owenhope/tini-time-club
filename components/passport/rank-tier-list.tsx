import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, AvatarRing } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { RANK_TIERS } from "@/utils/ranking";

/**
 * The rank ladder, one card per tier: the tier's animated ring around a
 * member glyph, its name, and the points that unlock it.
 *
 * Shared by the Passport info screen and the onboarding education step so
 * the club's ranks are always explained with one design.
 */
export function RankTierList({ selectable = false }: { selectable?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.ranks}>
      {RANK_TIERS.map((tier, index) => (
        <View key={tier.key} style={styles.rankCard}>
          <AvatarRing reviewCount={tier.min} size={52}>
            <View style={styles.avatarCore}>
              <Ionicons name="person" size={25} color={colors.onInk} />
            </View>
          </AvatarRing>
          <View style={styles.rankCopy}>
            <AppText variant="title" selectable={selectable}>
              {tier.name}
            </AppText>
            <AppText variant="label" tone="secondary" selectable={selectable}>
              {index === 0
                ? "Your starting ring"
                : `Unlocks at ${tier.min} Passport points`}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  ranks: { gap: t.spacing.sm },
  rankCard: {
    minHeight: 88,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.lg,
    padding: t.spacing.md,
    borderRadius: t.radius.card,
    borderCurve: "continuous" as const,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  avatarCore: {
    width: 52,
    height: 52,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceInkDeep,
  },
  rankCopy: { flex: 1, minWidth: 0, gap: 2 },
}));
