import React, { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/shared";
import { makeStyles } from "@/theme";
import { logCelebrationEvent, type Achievement } from "@/utils/celebrations";

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
  previewMode?: boolean;
}

const AVATAR_SIZE = 154;

const copyFor = (achievement: Achievement) =>
  achievement.kind === "rank"
    ? {
        headline: `You made ${achievement.tier.name}`,
        subtitle: "Your ring just leveled up. Wear it well.",
        locationLine: null,
      }
    : {
        headline: "You're a regular!",
        subtitle: "You've earned your seat at",
        locationLine: achievement.locationName,
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
  previewMode = false,
}) => {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
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
    if (!previewMode) void logCelebrationEvent(achievement, "modal", "shown");
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [achievement, fade, previewMode, scale]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!achievement) return null;

  const { headline, subtitle, locationLine } = copyFor(achievement);
  const isLast = index === achievements.length - 1;

  const next = () => {
    if (isLast) {
      onClose();
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <Modal visible animationType="fade" onRequestClose={next}>
      <StatusBar style="light" />
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top + 52, paddingBottom: insets.bottom + 44 },
        ]}
      >
        <View style={styles.centerContent}>
          <Animated.View style={[styles.avatarWell, avatarStyle]}>
            <Avatar
              avatarPath={profile?.avatar_url}
              username={profile?.username ?? undefined}
              size={AVATAR_SIZE - 12}
              reviewCount={reviewCount}
            />
          </Animated.View>
          <Animated.View style={[styles.textBlock, textStyle]}>
            <Text style={styles.headline}>{headline}</Text>
            <View style={styles.subtitleBlock}>
              <Text style={styles.subtitle}>{subtitle}</Text>
              {locationLine ? (
                <Text style={styles.locationLine}>{locationLine}</Text>
              ) : null}
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.actions, textStyle]}>
          <Pressable
            onPress={next}
            accessibilityRole="button"
            accessibilityLabel={isLast ? "Continue" : "Next"}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continuePressed,
            ]}
          >
            <Text style={styles.continueText}>
              {isLast ? "Continue" : "Next"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.colors.surfaceBrand,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
    paddingHorizontal: t.spacing.xxl,
  },
  centerContent: {
    alignItems: "center" as const,
    gap: t.spacing.lg,
    marginTop: 148,
    width: "100%" as const,
  },
  avatarWell: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
    backgroundColor: t.colors.ratingTrack,
  },
  textBlock: {
    alignItems: "center" as const,
    gap: 42,
    width: "100%" as const,
  },
  headline: {
    ...t.typography.display,
    color: t.colors.textOnImage,
    textAlign: "center" as const,
  },
  subtitle: {
    ...t.typography.bodyStrong,
    color: t.colors.accentPressed,
    textAlign: "center" as const,
    maxWidth: 310,
  },
  subtitleBlock: {
    alignItems: "center" as const,
    gap: 4,
  },
  locationLine: {
    ...t.typography.bodyStrong,
    color: t.colors.textOnImage,
    textAlign: "center" as const,
    maxWidth: 310,
  },
  actions: {
    alignSelf: "center" as const,
    width: "80%" as const,
    maxWidth: 328,
    marginTop: 46,
  },
  continueButton: {
    minHeight: 56,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accent,
  },
  continuePressed: {
    opacity: 0.82,
    backgroundColor: t.colors.accentPressed,
  },
  continueText: {
    ...t.typography.bodyStrong,
    color: t.colors.textOnImage,
    textAlign: "center" as const,
  },
}));

export default CelebrationModal;
