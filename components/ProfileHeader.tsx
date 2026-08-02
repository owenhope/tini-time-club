import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Avatar, StatCard, type Metric } from "@/components/shared";
import { fonts, makeStyles, useTheme } from "@/theme";
import { getRankProgress } from "@/utils/ranking";

interface ProfileHeaderProps {
  profile: {
    id: string;
    username: string;
    name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    review_count?: number | null;
  } | null;
  reviewsCount: number;
  followersCount: number;
  followingCount: number;
  isOwnProfile: boolean;
  onAvatarPress?: () => void;
  avatarLoading?: boolean;
  avatarError?: string | null;
  /** Development-only visual override used by the profile rank preview. */
  rankPreviewCount?: number;
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
  rankPreviewCount,
  onFollowersPress,
  onFollowingPress,
  tags,
  children,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  if (!profile) return null;

  // Ranking is driven by the trigger-maintained count when present; the
  // locally loaded review list (capped by its fetch limit) is the fallback.
  const rankCount = profile.review_count ?? reviewsCount;
  const displayedRankCount = rankPreviewCount ?? rankCount;
  const rank = getRankProgress(displayedRankCount);

  const metrics: Metric[] = [
    {
      key: "reviews",
      value: rankCount,
      label: rankCount === 1 ? "Review" : "Reviews",
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
        <View style={styles.avatarColumn}>
          <Pressable
            onPress={isOwnProfile ? onAvatarPress : undefined}
            disabled={!isOwnProfile}
            accessibilityRole={isOwnProfile ? "button" : undefined}
            accessibilityLabel={
              isOwnProfile ? "Change profile photo" : undefined
            }
            accessibilityState={{ busy: avatarLoading }}
          >
            <Avatar
              avatarPath={profile.avatar_url}
              username={profile.username}
              size={AVATAR_SIZE}
              reviewCount={displayedRankCount}
            />
            {avatarLoading && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="small" color={colors.onAccent} />
              </View>
            )}
          </Pressable>
          {rank.tier ? (
            /* The sheen, not the base tier colour: on the deep-green ground
               bronze and Top land at 3.4–3.7:1, under AA for 11px type. The
               light end of each tier's gradient clears 6:1. */
            <Text style={[styles.rankName, { color: rank.tier.sheen }]}>
              {rank.tier.name}
            </Text>
          ) : null}
          {isOwnProfile && rank.next ? (
            <View style={styles.rankProgress}>
              <View
                style={styles.rankTrack}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: rank.tier?.min ?? 0,
                  max: rank.next.min,
                  now: displayedRankCount,
                }}
              >
                <View
                  style={[
                    styles.rankFill,
                    {
                      width: `${Math.round(rank.fraction * 100)}%`,
                      backgroundColor: rank.next.color,
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}
        </View>
        <View style={styles.metrics}>
          {metrics.map((m) => (
            <StatCard
              key={m.key}
              tone="ink"
              value={m.value}
              label={m.label}
              onPress={m.onPress}
            />
          ))}
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
  // The "club / insider" ground — the system's deep green, which is the
  // strongest brand signal the app has and belongs on the identity block.
  container: {
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.xl,
    gap: t.spacing.lg,
    backgroundColor: t.colors.surfaceInkDeep,
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.lg,
    paddingHorizontal: t.spacing.gutter,
  },
  metrics: {
    flex: 1,
    flexDirection: "row" as const,
    gap: t.spacing.sm,
  },
  avatarColumn: {
    alignItems: "center" as const,
    gap: 6,
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
  rankName: {
    ...t.typography.eyebrow,
    fontFamily: fonts.bold,
    color: t.colors.onInk,
    textAlign: "center" as const,
  },
  rankProgress: {
    width: AVATAR_SIZE,
    alignItems: "center" as const,
    gap: 4,
  },
  rankTrack: {
    width: AVATAR_SIZE,
    height: 4,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.ratingTrack,
    overflow: "hidden" as const,
  },
  rankFill: {
    height: "100%" as const,
    borderRadius: t.radius.pill,
  },
  identityRow: {
    paddingHorizontal: t.spacing.gutter,
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
  // Display weight, lowercase — the wordmark's own voice, per the system's
  // rule that display headlines are lowercase.
  name: {
    ...t.typography.display,
    fontSize: 26,
    lineHeight: 26,
    color: t.colors.onInk,
  },
  bio: {
    ...t.typography.body,
    color: t.colors.onInk,
    lineHeight: 20,
    opacity: 0.85,
  },
  error: {
    ...t.typography.caption,
    // On the deep-green ground the danger red drops below AA, so errors here
    // take the paper ink and lean on placement to read as a problem.
    color: t.colors.onInk,
    paddingHorizontal: t.spacing.gutter,
  },
}));

export default ProfileHeader;
