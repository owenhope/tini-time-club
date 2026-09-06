import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/shared";
import { RankTierList } from "@/components/passport/rank-tier-list";
import { makeStyles, useTheme } from "@/theme";

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
        <RankTierList selectable />
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
}));
