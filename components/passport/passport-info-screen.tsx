import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, AvatarRing } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { RANK_TIERS } from "@/utils/ranking";

export default function PassportInfoScreen() {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <AppText variant="eyebrow" tone="accent" selectable>
          Passport ranks
        </AppText>
        <View style={styles.titleRow}>
          <Ionicons name="ribbon-outline" size={28} color={colors.accent} />
          <AppText variant="display" style={styles.title} selectable>
            How It Works
          </AppText>
        </View>
        <AppText tone="secondary" selectable>
          Complete Passport milestones to earn points. As your point total
          grows, you rank up and unlock a new animated ring around your member
          avatar.
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="eyebrow" tone="secondary" selectable>
          Rings to unlock
        </AppText>
        <View style={styles.ranks}>
          {RANK_TIERS.map((tier, index) => (
            <View key={tier.key} style={styles.rankCard}>
              <AvatarRing reviewCount={tier.min} size={52}>
                <View style={styles.avatarCore}>
                  <Ionicons name="person" size={25} color={colors.onInk} />
                </View>
              </AvatarRing>
              <View style={styles.rankCopy}>
                <AppText variant="title" selectable>
                  {tier.name}
                </AppText>
                <AppText variant="label" tone="secondary" selectable>
                  {index === 0
                    ? "Your starting ring"
                    : `Unlocks at ${tier.min} Passport points`}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: {
    padding: t.spacing.gutter,
    paddingBottom: t.spacing.xxxl,
    gap: t.spacing.xl,
  },
  hero: { gap: t.spacing.sm },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  title: { flex: 1 },
  section: { gap: t.spacing.sm },
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
