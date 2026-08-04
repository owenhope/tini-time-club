import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Avatar, StatCard } from "@/components/shared";
import AppHeader, { type HeaderAction } from "@/components/nav/AppHeader";
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
  /**
   * Development-only escape hatch: long-pressing the avatar reveals the rank
   * swatches, which are no longer part of the shipped layout.
   */
  onAvatarLongPress?: () => void;
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
  /**
   * The one thing you can do to this person — Follow, on someone else's
   * profile. It sits in the block rather than the nav bar: iOS 26 wraps
   * adjacent header items in a single grey glass capsule, which reads as
   * disabled chrome around a chartreuse button.
   */
  action?: React.ReactNode;
  /** Variant A's single trailing control — settings, on your own profile. */
  titleAction?: HeaderAction;
  /**
   * Which header the block wears. Your own profile is a tab root, so it takes
   * variant A; someone else's is a pushed detail screen, so it takes C.
   */
  variant?: "large" | "media";
  /** Variant C: the leading control, and the controls on the right. */
  onBack?: () => void;
  actions?: HeaderAction[];
}

/** One of the three stat tiles under the identity block. */
interface Metric {
  key: string;
  value: number | string;
  label: string;
  onPress?: () => void;
}

const AVATAR_SIZE = 84;

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
  onAvatarLongPress,
  avatarLoading = false,
  avatarError = null,
  rankPreviewCount,
  onFollowersPress,
  onFollowingPress,
  tags,
  children,
  action,
  titleAction,
  variant = "large",
  onBack,
  actions,
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
    <View style={styles.ground}>
      {/* The header names the screen with the handle — variant A on your own
          profile, C on someone else's, both continuing the deep green the
          block below sits on. A handle keeps its owner's capitalisation, and
          scales to fit rather than truncating. */}
      {variant === "media" ? (
        <AppHeader
          variant="media"
          title={profile.username}
          meta={profile.name ?? undefined}
          onBack={onBack}
          actions={actions}
        />
      ) : (
        <AppHeader
          variant="large"
          ground="inkDeep"
          preserveCase
          title={profile.username}
          trailing={titleAction}
        />
      )}

      <View style={styles.container}>
        {/* Then the face, the name and the tier the member holds. */}
        <View style={styles.topRow}>
          <Pressable
            onPress={isOwnProfile ? onAvatarPress : undefined}
            onLongPress={onAvatarLongPress}
            disabled={!isOwnProfile && !onAvatarLongPress}
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
              onInk
            />
            {avatarLoading && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="small" color={colors.onAccent} />
              </View>
            )}
          </Pressable>

          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name || profile.username}
            </Text>
            <View style={styles.identityFoot}>
              {rank.tier ? (
                /* The tier's own hex, like a medal — it reads the same in both
                 schemes. Near-black green ink on all four. */
                <View
                  style={[
                    styles.tierBadge,
                    { backgroundColor: rank.tier.color },
                  ]}
                >
                  <Text style={styles.tierBadgeText}>{rank.tier.name}</Text>
                </View>
              ) : null}
              {action}
            </View>
          </View>
        </View>

        {isOwnProfile && rank.next ? (
          <View style={styles.rankProgress}>
            <View style={styles.rankLabels}>
              <Text style={styles.rankCount}>
                {rankCount} {rankCount === 1 ? "review" : "reviews"}
              </Text>
              <Text style={styles.rankRemaining}>
                {rank.remaining} to {rank.next.name}
              </Text>
            </View>
            <View
              style={styles.rankTrack}
              accessibilityRole="progressbar"
              accessibilityLabel={`${rank.remaining} reviews to ${rank.next.name}`}
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

        {(profile.bio || tags) && (
          <View style={styles.identityRow}>
            {profile.bio ? (
              <Text style={styles.bio} numberOfLines={3}>
                {profile.bio}
              </Text>
            ) : null}
            {tags ? <View style={styles.identityTags}>{tags}</View> : null}
          </View>
        )}

        {children}

        {avatarError ? <Text style={styles.error}>{avatarError}</Text> : null}
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  // The "club / insider" ground — the system's deep green, which is the
  // strongest brand signal the app has and belongs on the identity block. The
  // header above sits on the same green, so the two read as one block.
  ground: {
    backgroundColor: t.colors.surfaceInkDeep,
  },
  container: {
    paddingBottom: t.spacing.xl,
    paddingHorizontal: t.spacing.gutter,
    gap: t.spacing.lg,
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.lg,
  },
  metrics: {
    flexDirection: "row" as const,
    gap: 9,
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
  identityFoot: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
    marginTop: 2,
  },
  tierBadge: {
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.md - 1,
    paddingVertical: 6,
  },
  tierBadgeText: {
    ...t.typography.eyebrow,
    fontSize: 10,
    color: t.colors.surfaceInkDeep,
  },
  // Full width, and labelled at both ends: a bare 4px sliver under the
  // avatar never said what it was counting towards.
  rankProgress: {
    gap: 7,
  },
  rankLabels: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "baseline" as const,
    gap: t.spacing.sm,
  },
  rankCount: {
    ...t.typography.label,
    fontFamily: fonts.semibold,
    color: t.colors.accentOnImage,
  },
  rankRemaining: {
    ...t.typography.label,
    fontFamily: fonts.semibold,
    color: t.colors.highlight,
  },
  rankTrack: {
    height: 8,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.ratingTrackOnInk,
    overflow: "hidden" as const,
  },
  rankFill: {
    height: "100%" as const,
    borderRadius: t.radius.pill,
  },
  identityRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: t.spacing.md,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  identityTags: {
    flexShrink: 1,
    maxWidth: "65%" as const,
    alignItems: "flex-end" as const,
  },
  name: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: fonts.black,
    letterSpacing: -0.7,
    color: t.colors.onInk,
  },
  // Handles are data — they set in mono, like every other identifier.
  handle: {
    ...t.typography.mono,
    color: t.colors.accentOnImage,
  },
  bio: {
    ...t.typography.body,
    flex: 1,
    color: t.colors.onInk,
    lineHeight: 20,
    opacity: 0.85,
  },
  error: {
    ...t.typography.caption,
    // On the deep-green ground the danger red drops below AA, so errors here
    // take the paper ink and lean on placement to read as a problem.
    color: t.colors.onInk,
  },
}));

export default ProfileHeader;
