import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared";
import { PassportStamp } from "@/components/passport/passport-stamp";
import { RankTierList } from "@/components/passport/rank-tier-list";
import type { PassportStampShape } from "@/services/passportService";
import { RegularsIntroduction } from "./regulars-introduction";
import { GoldenGlassIntroduction } from "./golden-glass-introduction";
import { useProfile } from "@/context/profile-context";
import { makeStyles } from "@/theme";
// Six example stamps at their first milestones for the Passport introduction.
const PREVIEW_STAMPS: {
  shape: PassportStampShape;
  label: string;
  milestone: number;
  points: number;
}[] = [
  { shape: "locations", label: "Location", milestone: 1, points: 10 },
  { shape: "martinis", label: "Martini", milestone: 1, points: 10 },
  { shape: "combination", label: "Vodka Twist", milestone: 1, points: 10 },
  { shape: "type_reviews", label: "Classics", milestone: 10, points: 10 },
  { shape: "regulars", label: "Regular", milestone: 1, points: 10 },
  { shape: "comments", label: "Comment", milestone: 1, points: 10 },
];

export type FeatureIntroduction =
  "passport" | "rankings" | "regulars" | "golden-glass";
export default function FeatureIntroductionScreen({
  feature,
}: {
  feature: FeatureIntroduction;
}) {
  const styles = useStyles();
  const { profile } = useProfile();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      {feature === "passport" ? (
        <>
          <View style={styles.educationIntro}>
            <AppText variant="heading">
              Every discovery builds your Passport.
            </AppText>
            <AppText variant="body" tone="secondary">
              Explore locations, Martini styles, and club milestones to earn
              stamps. Each stamp permanently adds its listed points.
            </AppText>
          </View>
          <View style={styles.educationSection}>
            <AppText variant="eyebrow" tone="secondary">
              Collect stamps
            </AppText>
            <View style={styles.stampRow}>
              {PREVIEW_STAMPS.map((stamp) => (
                <View key={stamp.shape} style={styles.stampCell}>
                  <PassportStamp
                    shape={stamp.shape}
                    milestone={stamp.milestone}
                    pointAward={stamp.points}
                    earned
                    label={stamp.label}
                    accessibilityLabel={`Example stamp: ${stamp.milestone} ${stamp.label.toLowerCase()}, ${stamp.points} points`}
                  />
                </View>
              ))}
            </View>
          </View>
        </>
      ) : feature === "rankings" ? (
        <>
          <View style={styles.educationIntro}>
            <AppText variant="heading">Your points set your rank.</AppText>
            <AppText variant="body" tone="secondary">
              As your Passport point total grows, you rank up and unlock a new
              animated ring around your member avatar.
            </AppText>
          </View>
          <View style={styles.educationSection}>
            <AppText variant="eyebrow" tone="secondary">
              Rings to unlock
            </AppText>
            <RankTierList />
          </View>
        </>
      ) : feature === "regulars" ? (
        <RegularsIntroduction
          username={profile?.username ?? "You"}
          avatarPath={profile?.avatar_url}
        />
      ) : (
        <GoldenGlassIntroduction />
      )}
    </ScrollView>
  );
}
const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: {
    padding: t.spacing.gutter,
    paddingBottom: t.spacing.xxxl,
    gap: t.spacing.xxl,
  },
  educationIntro: {
    gap: t.spacing.sm,
  },
  educationSection: {
    gap: t.spacing.md,
  },
  stampRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between" as const,
    rowGap: t.spacing.lg,
    paddingTop: t.spacing.sm,
  },
  stampCell: {
    width: "33.333%" as const,
    alignItems: "center" as const,
  },
}));
