import React, { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Avatar, AppText, Button } from "@/components/shared";
import { makeStyles } from "@/theme";
import {
  logCelebrationEvent,
  type Achievement,
} from "@/utils/celebrations";

interface CelebrationModalProps {
  /** Shown one at a time; dismissing the last one closes the modal. */
  achievements: Achievement[];
  profile: {
    id?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  /** Fresh review count so the celebrated ring matches the new tier. */
  reviewCount: number | null;
  onClose: () => void;
}

const AVATAR_SIZE = 132;

const copyFor = (achievement: Achievement) =>
  achievement.kind === "rank"
    ? {
        headline: `You made ${achievement.tier.name}`,
        subtitle: "Your ring just leveled up. Wear it well.",
      }
    : {
        headline: "You're a Regular",
        subtitle: `You've earned your seat at ${achievement.locationName}.`,
      };

/**
 * Full-screen moment shown right after a review submission crosses a rank
 * threshold or wins a Regular spot. One achievement at a time; the primary
 * action is sharing it.
 */
const CelebrationModal: React.FC<CelebrationModalProps> = ({
  achievements,
  profile,
  reviewCount,
  onClose,
}) => {
  const styles = useStyles();
  const [index, setIndex] = useState(0);
  const scale = useSharedValue(0.4);
  const fade = useSharedValue(0);

  const achievement = achievements[index];

  useEffect(() => {
    if (!achievement) return;
    scale.value = 0.4;
    fade.value = 0;
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    fade.value = withDelay(
      250,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
    );
    void logCelebrationEvent(achievement, "modal", "shown");
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [achievement, fade, scale]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!achievement) return null;

  const { headline, subtitle } = copyFor(achievement);
  const isLast = index === achievements.length - 1;

  const next = () => {
    if (isLast) {
      onClose();
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={next}>
      <View style={styles.backdrop}>
        <Animated.View style={avatarStyle}>
          <Avatar
            avatarPath={profile?.avatar_url}
            username={profile?.username ?? undefined}
            size={AVATAR_SIZE}
            reviewCount={reviewCount}
          />
        </Animated.View>
        <Animated.View style={[styles.textBlock, textStyle]}>
          <AppText variant="title" style={styles.headline}>
            {headline}
          </AppText>
          <AppText variant="body" style={styles.subtitle}>
            {subtitle}
          </AppText>
        </Animated.View>
        <Animated.View style={[styles.actions, textStyle]}>
          <Button
            title={isLast ? "Continue" : "Next"}
            onPress={next}
            variant="primary"
            size="large"
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 14, 0.94)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.xl,
    gap: t.spacing.xl,
  },
  textBlock: {
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  // The backdrop is dark in both themes, so text is fixed light rather than
  // theme-toned.
  headline: {
    color: "#FFFFFF",
    textAlign: "center" as const,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.75)",
    textAlign: "center" as const,
  },
  actions: {
    alignItems: "stretch" as const,
    alignSelf: "stretch" as const,
    gap: t.spacing.sm,
    marginTop: t.spacing.lg,
  },
}));

export default CelebrationModal;
