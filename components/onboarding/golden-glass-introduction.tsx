import { View } from "react-native";
import { AppText, MartiniIcon } from "@/components/shared";
import { GoldenGlassCard } from "@/components/explore/golden-glass-card";
import { makeStyles, useTheme } from "@/theme";

// Public production venue snapshot, verified 2026-09-24. No member data.
const VANCOUVER_PLACES = [
  {
    id: 107,
    name: "Bevel",
    previewInitials: ["A", "J", "M"],
    address: "1165 Mainland St, Vancouver, BC V6B 5P2, Canada",
    neighborhood: null,
    rating: 5,
    total_ratings: 6,
    is_location_verified: false,
    is_golden_glass: true,
  },
  {
    id: 17,
    name: "Dovetail",
    previewInitials: ["S", "R", "T"],
    address: "1079 Mainland St, Vancouver, BC, Canada",
    neighborhood: null,
    rating: 4.9,
    total_ratings: 4,
    is_location_verified: false,
    is_golden_glass: true,
  },
];

export function GoldenGlassIntroduction() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.content}>
      <View style={styles.intro}>
        <AppText variant="eyebrow" style={styles.gold}>
          The Best Martinis in Vancouver
        </AppText>
        <View style={styles.titleRow}>
          <MartiniIcon size={22} color={colors.awardGold} filled />
          <AppText variant="display">Golden Glass</AppText>
        </View>
        <AppText tone="secondary">
          Golden Glass recognizes the top Martini spots in each region, based on
          ratings from club members.
        </AppText>
      </View>
      {VANCOUVER_PLACES.map((place) => (
        <GoldenGlassCard
          key={place.id}
          item={{
            locationId: place.id,
            regionId: 0,
            venueName: place.name,
            address: place.address,
            neighborhood: place.neighborhood,
            rawOverall: place.rating,
            distinctReviewers: 0,
            latestReviewAt: "",
            refreshedAt: "2026-09-24",
            isGoldenGlass: true,
            is_location_verified: place.is_location_verified,
            // Illustrative initials, not real member identities.
            regulars: place.previewInitials.map((initial, index) => ({
              location_id: place.id,
              profile_id: `onboarding-${place.id}-${index}`,
              rank: index + 1,
              username: initial,
              avatar_url: null,
              passport_points: [1050, 640, 120][index],
              review_count: 1,
            })),
          }}
          reviewCount={place.total_ratings}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.md },
  intro: { gap: t.spacing.sm, marginBottom: t.spacing.sm },
  gold: { color: t.colors.awardGold },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
}));
