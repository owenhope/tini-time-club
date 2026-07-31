import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import {
  Avatar,
  MetricRow,
  type Metric,
} from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";

interface ProfileHeaderProps {
  profile: {
    id: string;
    username: string;
    name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
  } | null;
  reviewsCount: number;
  followersCount: number;
  followingCount: number;
  isOwnProfile: boolean;
  onAvatarPress?: () => void;
  avatarLoading?: boolean;
  avatarError?: string | null;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  /** Spirit/type chips; rendered to the right of the name and bio so they
      don't cost the header an extra row. */
  tags?: React.ReactNode;
  /** Rendered between the bio and the action row (favourite location, etc.). */
  children?: React.ReactNode;
}

const AVATAR_SIZE = 80;

/**
 * Person identity block, in the familiar social-profile arrangement: avatar
 * and counts share the top row, then name and bio.
 *
 * The username is deliberately not repeated here — it is already the
 * navigation title on both the own-profile and other-user screens.
 */
const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  reviewsCount,
  followersCount,
  followingCount,
  isOwnProfile,
  onAvatarPress,
  avatarLoading = false,
  avatarError = null,
  onFollowersPress,
  onFollowingPress,
  tags,
  children,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  if (!profile) return null;

  const metrics: Metric[] = [
    {
      key: "reviews",
      value: reviewsCount,
      label: reviewsCount === 1 ? "Review" : "Reviews",
    },
    {
      key: "followers",
      value: followersCount,
      label: followersCount === 1 ? "Follower" : "Followers",
      onPress: onFollowersPress,
    },
    {
      key: "following",
      value: followingCount,
      label: "Following",
      onPress: onFollowingPress,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          onPress={isOwnProfile ? onAvatarPress : undefined}
          disabled={!isOwnProfile}
          accessibilityRole={isOwnProfile ? "button" : undefined}
          accessibilityLabel={isOwnProfile ? "Change profile photo" : undefined}
          accessibilityState={{ busy: avatarLoading }}
        >
          <Avatar
            avatarPath={profile.avatar_url}
            username={profile.username}
            size={AVATAR_SIZE}
          />
          {avatarLoading && (
            <View style={styles.avatarLoading}>
              <ActivityIndicator size="small" color={colors.onAccent} />
            </View>
          )}
        </Pressable>
        <View style={styles.metrics}>
          <MetricRow metrics={metrics} align="center" />
        </View>
      </View>

      {(profile.name || profile.bio || tags) && (
        <View style={styles.identityRow}>
          <View style={styles.identity}>
            {profile.name ? (
              <Text style={styles.name} numberOfLines={1}>
                {profile.name}
              </Text>
            ) : null}
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          </View>
          {tags ? <View style={styles.identityTags}>{tags}</View> : null}
        </View>
      )}

      {children}

      {avatarError ? <Text style={styles.error}>{avatarError}</Text> : null}

    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.md,
    gap: t.spacing.md,
    backgroundColor: t.colors.surface,
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xl,
    paddingHorizontal: t.spacing.lg,
  },
  metrics: {
    flex: 1,
  },
  avatarLoading: {
    ...({ position: "absolute" } as const),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.scrim,
    borderRadius: AVATAR_SIZE / 2,
  },
  identityRow: {
    paddingHorizontal: t.spacing.lg,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: t.spacing.md,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  identityTags: {
    flexShrink: 1,
    maxWidth: "65%" as const,
    alignItems: "flex-end" as const,
  },
  name: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  bio: {
    ...t.typography.body,
    color: t.colors.text,
    lineHeight: 20,
  },
  error: {
    ...t.typography.caption,
    color: t.colors.danger,
    paddingHorizontal: t.spacing.lg,
  },
}));

export default ProfileHeader;
