import React from "react";
import {
  Animated,
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
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
  /**
   * The screen's scroll value. The block's header fades out on it while the
   * screen's own compact bar fades in, so the two are always the same gesture.
   */
  progress?: Animated.Value;
  collapsed?: boolean;
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
  progress,
  collapsed,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  if (!profile) return null;

  // Ranking is driven by the trigger-maintained count when present; the
  // locally loaded review list (capped by its fetch limit) is the fallback.
  const rankCount = profile.review_count ?? reviewsCount;
  const displayedRankCount = rankPreviewCount ?? rankCount;
  const rank = getRankProgress(displayedRankCount);
  const canPressAvatar = Boolean(onAvatarPress);

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
          profile, C on someone else's, both continuing the purple the
          block below sits on. A handle keeps its owner's capitalisation, and
          scales to fit rather than truncating. */}
      {variant === "media" ? (
        <AppHeader
          variant="media"
          ground="brand"
          title={profile.username}
          preserveCase
          // No meta line: the name is the identity row's job, and setting it
          // here printed it twice, eight points apart.
          onBack={onBack}
          actions={actions}
          progress={progress}
          collapsed={collapsed}
          // The screen's compact bar speaks for the status bar; two headers
          // both claiming it is a race.
          statusBar="none"
        />
      ) : (
        <AppHeader
          variant="large"
          ground="brand"
          preserveCase
          title={profile.username}
          trailing={titleAction}
          progress={progress}
          collapsed={collapsed}
          statusBar="none"
        />
      )}

      <View style={styles.container}>
        {/* Then the face, the name and the tier the member holds. */}
        <View style={styles.topRow}>
          <View style={styles.avatarColumn}>
            <Pressable
              onPress={onAvatarPress}
              onLongPress={onAvatarLongPress}
              disabled={!canPressAvatar && !onAvatarLongPress}
              accessibilityRole={canPressAvatar ? "button" : undefined}
              accessibilityLabel={
                canPressAvatar
                  ? isOwnProfile
                    ? "Change profile photo"
                    : `View ${profile.username}'s profile photo`
                  : undefined
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
            {rank.tier ? (
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>{rank.tier.name}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.identity}>
            <Text
              style={styles.name}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              {profile.name || profile.username}
            </Text>
            {action ? (
              <View style={styles.identityFoot}>
                {action}
              </View>
            ) : null}
            <View style={styles.compactMetrics}>
              {metrics.map((m) => (
                <StatCard
                  key={m.key}
                  tone="ink"
                  size="compact"
                  value={m.value}
                  label={m.label}
                  onPress={m.onPress}
                />
              ))}
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

        {profile.bio ? (
          <Text style={styles.bio} numberOfLines={3}>
            {profile.bio}
          </Text>
        ) : null}

        {(children || tags) && (
          <View style={styles.favoritesRow}>
            {children ? (
              <View style={styles.favoritesMain}>{children}</View>
            ) : null}
            {tags ? <View style={styles.favoriteTags}>{tags}</View> : null}
          </View>
        )}

        {avatarError ? <Text style={styles.error}>{avatarError}</Text> : null}
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  // The profile identity block wears the app's purple header ground.
  ground: {
    backgroundColor: t.colors.headerBrand,
  },
  container: {
    paddingBottom: t.spacing.xl,
    paddingHorizontal: t.spacing.gutter,
    gap: t.spacing.lg,
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: t.spacing.lg,
  },
  avatarColumn: {
    width: AVATAR_SIZE + 18,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  compactMetrics: {
    flexDirection: "row" as const,
    gap: 5,
    marginTop: t.spacing.xs,
    alignSelf: "stretch" as const,
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
    backgroundColor: "rgba(250,249,246,0.18)",
  },
  tierBadgeText: {
    ...t.typography.eyebrow,
    fontSize: 10,
    color: t.colors.textOnImage,
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
    color: t.colors.onHeaderBrand,
  },
  rankRemaining: {
    ...t.typography.label,
    fontFamily: fonts.semibold,
    color: t.colors.onHeaderBrand,
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
  favoritesRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.lg,
  },
  favoritesMain: {
    flex: 1,
    minWidth: 0,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  favoriteTags: {
    flexShrink: 1,
    maxWidth: "58%" as const,
    alignItems: "flex-end" as const,
  },
  name: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: fonts.black,
    letterSpacing: 0,
    color: t.colors.onHeaderBrand,
  },
  // Handles are data — they set in mono, like every other identifier.
  handle: {
    ...t.typography.mono,
    color: t.colors.onHeaderBrand,
  },
  bio: {
    ...t.typography.body,
    width: "100%" as const,
    color: t.colors.onHeaderBrand,
    lineHeight: 20,
    opacity: 0.85,
  },
  error: {
    ...t.typography.caption,
    // On the deep-green ground the danger red drops below AA, so errors here
    // take the paper ink and lean on placement to read as a problem.
    color: t.colors.onHeaderBrand,
  },
}));

export default ProfileHeader;
