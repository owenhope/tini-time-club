import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Avatar, VerifiedName } from "@/components/shared";
import type { Regular } from "@/services/regularsService";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { makeStyles } from "@/theme";

interface RegularsProps {
  regulars?: Regular[] | null;
  variant?: "default" | "compact" | "rail";
  compactAvatarSize?: number;
  showLabel?: boolean;
  interactive?: boolean;
  /** Rendered on a green ground, where the default greys disappear. */
  onInk?: boolean;
}

type DisplayRegular = Regular & { isPreview?: boolean };

const Regulars: React.FC<RegularsProps> = ({
  regulars,
  variant = "default",
  compactAvatarSize = 28,
  onInk = false,
  showLabel = true,
  interactive = true,
}) => {
  const styles = useStyles();
  const openProfile = useOpenProfile();

  const openRegular = (regular: DisplayRegular) =>
    openProfile(regular.username, regular.profile_id);

  if (!regulars?.length) return null;

  const displayRegulars: DisplayRegular[] =
    __DEV__ && regulars.length === 1
      ? [
          regulars[0],
          {
            ...regulars[0],
            profile_id: "preview-regular-2",
            rank: 2,
            username: "NorthShoreSips",
            avatar_url: null,
            is_verified: false,
            profile_review_count: undefined,
            review_count: 1,
            isPreview: true,
          },
          {
            ...regulars[0],
            profile_id: "preview-regular-3",
            rank: 3,
            username: "MartiniMaven",
            avatar_url: null,
            is_verified: false,
            profile_review_count: undefined,
            review_count: 1,
            isPreview: true,
          },
        ]
      : regulars;

  if (variant === "compact") {
    return (
      <View
        style={[
          styles.compactSection,
          !showLabel && styles.compactSectionUnlabeled,
        ]}
      >
        {showLabel ? <Text style={styles.eyebrow}>Regulars</Text> : null}
        <View style={styles.compactRow}>
          <View style={styles.avatarStack}>
            {displayRegulars.map((regular, index) => (
              <Pressable
                key={regular.profile_id}
                onPress={
                  !interactive || regular.isPreview
                    ? undefined
                    : () => openRegular(regular)
                }
                style={[
                  styles.stackedAvatar,
                  index > 0 && styles.avatarOverlap,
                ]}
                accessibilityRole={
                  !interactive || regular.isPreview ? "text" : "link"
                }
                accessibilityLabel={
                  regular.isPreview
                    ? `${regular.username}, preview regular`
                    : `View ${regular.username}'s profile`
                }
              >
                <Avatar
                  avatarPath={regular.avatar_url}
                  username={regular.username}
                  size={compactAvatarSize}
                  reviewCount={regular.profile_review_count}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  /**
   * The venue header's rail: name under the face, scrolling sideways past the
   * third, so a busy venue costs the header no extra height.
   */
  if (variant === "rail") {
    return (
      <View style={styles.railSection}>
        {showLabel ? (
          <Text style={[styles.eyebrow, onInk && styles.eyebrowOnInk]}>
            Regulars
          </Text>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railRow}
        >
          {displayRegulars.map((regular) => (
            <Pressable
              key={regular.profile_id}
              onPress={
                !interactive || regular.isPreview
                  ? undefined
                  : () => openRegular(regular)
              }
              style={({ pressed }) => [
                styles.railPerson,
                pressed && styles.pressed,
              ]}
              accessibilityRole={
                !interactive || regular.isPreview ? "text" : "link"
              }
              accessibilityLabel={`${regular.username}, regular with ${regular.review_count} reviews`}
            >
              <Avatar
                avatarPath={regular.avatar_url}
                username={regular.username}
                size={42}
                reviewCount={regular.profile_review_count}
                onInk={onInk}
              />
              <Text
                style={[styles.railUsername, onInk && styles.onInkText]}
                numberOfLines={1}
              >
                {regular.username}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Regulars</Text>
      {displayRegulars.map((regular) => (
        <Pressable
          key={regular.profile_id}
          onPress={
            !interactive || regular.isPreview
              ? undefined
              : () => openRegular(regular)
          }
          style={({ pressed }) => [styles.person, pressed && styles.pressed]}
          accessibilityRole={
            !interactive || regular.isPreview ? "text" : "link"
          }
          accessibilityLabel={`${regular.username}, number ${regular.rank} regular with ${regular.review_count} reviews`}
        >
          <Text style={styles.rank}>#{regular.rank}</Text>
          <Avatar
            avatarPath={regular.avatar_url}
            username={regular.username}
            size={34}
            reviewCount={regular.profile_review_count}
          />
          <View style={styles.identity}>
            <VerifiedName
              name={regular.username}
              isVerified={regular.is_verified}
              textStyle={styles.username}
            />
            <Text style={styles.reviewCount}>
              {regular.review_count}{" "}
              {regular.review_count === 1 ? "review" : "reviews"}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  section: {
    gap: t.spacing.sm,
  },
  compactSection: {
    marginTop: t.spacing.sm,
    gap: t.spacing.xs,
  },
  compactSectionUnlabeled: {
    marginTop: 0,
    gap: 0,
  },
  label: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  railSection: {
    gap: 9,
  },
  eyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.textMuted,
  },
  eyebrowOnInk: {
    color: t.colors.accentOnImage,
  },
  railRow: {
    flexDirection: "row" as const,
    gap: t.spacing.lg - 2,
    paddingRight: t.spacing.gutter,
  },
  railPerson: {
    width: 60,
    alignItems: "center" as const,
    gap: 5,
  },
  railUsername: {
    ...t.typography.label,
    color: t.colors.usernameText,
    maxWidth: 60,
  },
  person: {
    minHeight: 42,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  rank: {
    width: 22,
    ...t.typography.label,
    color: t.colors.accent,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    ...t.typography.bodyStrong,
    color: t.colors.usernameText,
  },
  reviewCount: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  onInkText: {
    color: t.colors.onInk,
  },
  compactRow: {
    minHeight: 30,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  avatarStack: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  stackedAvatar: {
    borderWidth: 2,
    borderColor: t.colors.surface,
    borderRadius: t.radius.pill,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
}));

export default Regulars;
