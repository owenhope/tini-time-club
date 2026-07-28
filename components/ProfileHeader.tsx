import React from "react";
import { View } from "react-native";
import {
  ProfileIdentity,
  MetricRow,
  ActionBar,
  type Metric,
  type Action,
} from "@/components/shared";
import { makeStyles } from "@/theme";

interface ProfileHeaderProps {
  profile: {
    id: string;
    username: string;
    name?: string | null;
    avatar_url?: string | null;
  } | null;
  reviewsCount: number;
  followersCount: number;
  followingCount: number;
  isOwnProfile: boolean;
  onAvatarPress?: () => void;
  avatarLoading?: boolean;
  avatarError?: string | null;
  onEditProfilePress?: () => void;
  doesFollow?: boolean;
  followPending?: boolean;
  isBlocked?: boolean;
  onFollowPress?: () => void;
  onBlockPress?: () => void;
  onUnblockPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  isScrolled?: boolean;
  hasBioOrFavs?: boolean;
}

/**
 * Identity block for a person, shared by the signed-in user's own profile and
 * other users' profiles.
 *
 * Now a thin composition of the same primitives the place profile uses
 * (ProfileIdentity + MetricRow + ActionBar) rather than a bespoke layout, so
 * the two profile types line up on spacing, type and button hierarchy.
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
  onEditProfilePress,
  doesFollow = false,
  followPending = false,
  isBlocked = false,
  onFollowPress,
  onBlockPress,
  onUnblockPress,
  onFollowersPress,
  onFollowingPress,
}) => {
  const styles = useStyles();

  if (!profile) return null;

  const who = profile.username ?? "this user";

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

  const actions: Action[] = isOwnProfile
    ? [
        {
          key: "edit",
          title: "Edit Profile",
          emphasis: "primary",
          icon: "create-outline",
          iconPosition: "left",
          accessibilityLabel: "Edit your profile",
          onPress: () => onEditProfilePress?.(),
        },
      ]
    : [
        {
          key: "follow",
          title: doesFollow ? "Following" : "Follow",
          // Following is a toggled-on state, so it drops to tonal rather than
          // shouting as a primary action the user has already taken.
          emphasis: doesFollow ? "secondary" : "primary",
          loading: followPending,
          accessibilityLabel: doesFollow ? `Unfollow ${who}` : `Follow ${who}`,
          onPress: () => onFollowPress?.(),
        },
        {
          key: "block",
          title: isBlocked ? "Unblock" : "Block",
          // Tertiary, not danger: blocking is reversible and low-frequency, so
          // it shouldn't compete with Follow.
          emphasis: "tertiary",
          accessibilityLabel: isBlocked ? `Unblock ${who}` : `Block ${who}`,
          onPress: () => (isBlocked ? onUnblockPress?.() : onBlockPress?.()),
        },
      ];

  return (
    <View style={styles.container}>
      <ProfileIdentity
        kind="person"
        title={profile.name ?? ""}
        subtitle={profile.username ? `@${profile.username}` : null}
        avatarPath={profile.avatar_url}
        username={profile.username}
        onImagePress={isOwnProfile ? onAvatarPress : undefined}
        imageLoading={avatarLoading}
        imageError={avatarError}
        titlePlaceholder={isOwnProfile ? "Add your name" : undefined}
        onTitlePlaceholderPress={onEditProfilePress}
      />

      <View style={styles.metrics}>
        <MetricRow metrics={metrics} />
      </View>

      <View style={styles.actions}>
        <ActionBar actions={actions} />
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.md,
    gap: t.spacing.lg,
    backgroundColor: t.colors.surface,
  },
  metrics: {
    paddingHorizontal: t.spacing.lg,
  },
  actions: {
    paddingHorizontal: t.spacing.lg,
  },
}));

export default ProfileHeader;
