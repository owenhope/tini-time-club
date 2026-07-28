import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Avatar } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";

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
  isScrolled = false,
  hasBioOrFavs = true,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  if (!profile) return null;

  // Add bottom padding when scrolled OR when there's no bio/favs
  const shouldHaveBottomPadding = isScrolled || !hasBioOrFavs;

  return (
    <View
      style={[
        styles.profileHeader,
        { paddingBottom: shouldHaveBottomPadding ? 16 : 0 },
      ]}
    >
      <View style={styles.avatarSection}>
        {isOwnProfile ? (
          <TouchableOpacity onPress={onAvatarPress}>
            <View>
              <Avatar
                avatarPath={profile.avatar_url}
                username={profile.username}
                size={75}
                style={styles.avatar}
              />
              {avatarLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={colors.secondary} />
                </View>
              )}
              {avatarError && (
                <Text style={styles.errorText}>{avatarError}</Text>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <View>
            <Avatar
              avatarPath={profile.avatar_url}
              username={profile.username}
              size={75}
              style={styles.avatar}
            />
          </View>
        )}
      </View>

      <View style={styles.userInfoContainer}>
        {profile.name ? (
          <Text style={styles.displayName}>{profile.name}</Text>
        ) : isOwnProfile ? (
          <TouchableOpacity onPress={onEditProfilePress}>
            <Text style={styles.ctaText}>Add your name</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{reviewsCount}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <TouchableOpacity style={styles.statItem} onPress={onFollowersPress}>
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={onFollowingPress}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {!isOwnProfile && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              onPress={onFollowPress}
              disabled={followPending}
              accessibilityRole="button"
              accessibilityLabel={
                doesFollow
                  ? `Unfollow ${profile?.username ?? "this user"}`
                  : `Follow ${profile?.username ?? "this user"}`
              }
              accessibilityState={{ selected: doesFollow, busy: followPending }}
              style={[
                styles.followButton,
                doesFollow && styles.followingButton,
                followPending && styles.buttonPending,
              ]}
            >
              <Text
                style={[
                  styles.followButtonText,
                  doesFollow && styles.followingButtonText,
                ]}
              >
                {doesFollow ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={isBlocked ? onUnblockPress : onBlockPress}
              accessibilityRole="button"
              accessibilityLabel={
                isBlocked ? "Unblock this user" : "Block this user"
              }
              style={[styles.blockButton, isBlocked && styles.unblockButton]}
            >
              <Text
                style={[
                  styles.blockButtonText,
                  isBlocked && styles.unblockButtonText,
                ]}
              >
                {isBlocked ? "Unblock" : "Block"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  buttonPending: {
    opacity: 0.6,
  },
  profileHeader: {
    flexDirection: "row" as const,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg,
    alignItems: "flex-start" as const,
  },
  avatarSection: {
    marginRight: t.spacing.lg,
  },
  avatar: {
    width: 75,
    height: 75,
    borderRadius: 50,
  },
  loadingOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.scrim,
    borderRadius: 50,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  errorText: {
    color: t.colors.danger,
    fontSize: 12,
    textAlign: "center" as const,
    marginTop: t.spacing.xs,
  },
  userInfoContainer: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: t.colors.text,
    marginBottom: t.spacing.md,
  },
  ctaText: {
    fontSize: 14,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.md,
  },
  statsContainer: {
    flexDirection: "row" as const,
    gap: t.spacing.xl,
    justifyContent: "flex-start" as const,
  },
  statItem: {
    alignItems: "flex-start" as const,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: t.colors.text,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "bold" as const,
    color: t.colors.textSecondary,
  },
  actionButtonsContainer: {
    flexDirection: "row" as const,
    marginTop: t.spacing.md,
    gap: t.spacing.md,
  },
  followButton: {
    backgroundColor: t.colors.accent,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 1,
    alignItems: "center" as const,
  },
  followingButton: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.accent,
  },
  followButtonText: {
    color: t.colors.onAccent,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  followingButtonText: {
    color: t.colors.accent,
  },
  blockButton: {
    backgroundColor: t.colors.danger,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 1,
    alignItems: "center" as const,
  },
  blockButtonText: {
    color: t.colors.textOnAccent,
    fontSize: 14,
    fontWeight: "500" as const,
  },
  unblockButton: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.danger,
  },
  unblockButtonText: {
    color: t.colors.danger,
  },
}));

export default ProfileHeader;
