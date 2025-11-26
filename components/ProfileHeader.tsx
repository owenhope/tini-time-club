import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Avatar } from "@/components/shared";

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
  isBlocked = false,
  onFollowPress,
  onBlockPress,
  onUnblockPress,
  onFollowersPress,
  onFollowingPress,
  isScrolled = false,
  hasBioOrFavs = true,
}) => {
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
                  <ActivityIndicator size="small" color="#336654" />
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
              style={[
                styles.followButton,
                doesFollow && styles.followingButton,
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

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: "flex-start",
  },
  avatarSection: {
    marginRight: 16,
  },
  avatar: {
    width: 75,
    height: 75,
    borderRadius: 50,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  userInfoContainer: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  ctaText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "flex-start",
  },
  statItem: {
    alignItems: "flex-start",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  followButton: {
    backgroundColor: "#B6A3E2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 1,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#B6A3E2",
  },
  followButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  followingButtonText: {
    color: "#B6A3E2",
  },
  blockButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 1,
    alignItems: "center",
  },
  blockButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  unblockButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ff6b6b",
  },
  unblockButtonText: {
    color: "#ff6b6b",
  },
});

export default ProfileHeader;
