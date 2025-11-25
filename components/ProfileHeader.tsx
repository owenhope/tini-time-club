import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "expo-router";
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
  // For own profile
  onAvatarPress?: () => void;
  avatarLoading?: boolean;
  avatarError?: string | null;
  onEditProfilePress?: () => void;
  // For other user's profile
  doesFollow?: boolean;
  isBlocked?: boolean;
  onFollowPress?: () => void;
  onBlockPress?: () => void;
  onUnblockPress?: () => void;
  // Navigation
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
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
}) => {
  const navigation = useNavigation();

  if (!profile) return null;

  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatarSection}>
        {isOwnProfile ? (
          <TouchableOpacity onPress={onAvatarPress} style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <Avatar
                avatarPath={profile.avatar_url}
                username={profile.username}
                size={100}
                style={styles.avatar}
              />
              {avatarLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color="#336654" />
                </View>
              )}
            </View>
            {avatarError && <Text style={styles.errorText}>{avatarError}</Text>}
          </TouchableOpacity>
        ) : (
          <View style={styles.avatarContainer}>
            <Avatar
              avatarPath={profile.avatar_url}
              username={profile.username}
              size={100}
              style={styles.avatar}
            />
          </View>
        )}
      </View>
      <View style={styles.userInfoContainer}>
        {/* Name - shown above stats */}
        {profile.name ? (
          <Text style={styles.displayName}>{profile.name}</Text>
        ) : isOwnProfile ? (
          <TouchableOpacity onPress={onEditProfilePress}>
            <Text style={[styles.ctaText, { textAlign: "left", marginBottom: 12 }]}>
              Add your name
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Stats */}
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

        {/* Action Buttons - only show if viewing someone else's profile */}
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
    paddingTop: 16,
    paddingRight: 16,
    paddingLeft: 0,
    alignItems: "flex-start",
  },
  avatarSection: {
    marginRight: 16,
    alignItems: "center",
    width: 140,
    justifyContent: "flex-start",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 4,
  },
  avatarWrapper: {
    position: "relative",
    width: 100,
    height: 100,
  },
  avatar: {
    width: 100,
    height: 100,
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
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 24,
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
    textAlign: "left",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
    justifyContent: "space-between",
  },
  followButton: {
    backgroundColor: "#B6A3E2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
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
    justifyContent: "center",
  },
  blockButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
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

