import { View } from "react-native";
import { AppText } from "@/components/shared";
import { RegularsSheetContent } from "@/components/RegularsSlider";
import type { Regular } from "@/services/regularsService";
import { makeStyles } from "@/theme";

interface RegularsIntroductionProps {
  username: string;
  avatarPath?: string | null;
}

export function RegularsIntroduction({
  username,
  avatarPath,
}: RegularsIntroductionProps) {
  const styles = useStyles();
  const regulars: Regular[] = [
    {
      location_id: 1,
      profile_id: "example-you",
      rank: 1,
      username: username || "You",
      avatar_url: avatarPath,
      passport_points: 1050,
      review_count: 12,
    },
    {
      location_id: 1,
      profile_id: "example-olive",
      rank: 2,
      username: "OliveHour",
      passport_points: 640,
      review_count: 9,
    },
    {
      location_id: 1,
      profile_id: "example-last",
      rank: 3,
      username: "LastCall",
      passport_points: 120,
      review_count: 7,
    },
  ];

  return (
    <View style={styles.content}>
      <View style={styles.intro}>
        <AppText variant="heading">Get to know the Regulars.</AppText>
        <AppText tone="secondary">
          The three members with the most published reviews at a bar are its
          Regulars.
        </AppText>
      </View>
      <View style={styles.sheet}>
        <RegularsSheetContent
          regulars={regulars}
          locationName="The Keefer Bar"
        />
      </View>
      <AppText variant="caption" tone="secondary">
        Share reviews from your visits to earn a spot. Your first Regular spot
        also earns a Passport stamp.
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.lg },
  intro: { gap: t.spacing.sm },
  sheet: {
    paddingHorizontal: t.spacing.sheetGutter,
    paddingVertical: t.spacing.lg,
    gap: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
  },
}));
