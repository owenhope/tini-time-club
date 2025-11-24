import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import imageCache from "@/utils/imageCache";
import { Avatar } from "@/components/shared";
import { Review } from "@/types/types";
import ReviewItem from "@/components/ReviewItem";
import CommentsSlider from "@/components/CommentsSlider";
import { Ionicons } from "@expo/vector-icons";
import {
  useRouter,
  useLocalSearchParams,
  useNavigation,
  usePathname,
} from "expo-router";
import AnalyticService from "@/services/analyticsService";

interface ProfileType {
  id: string;
  username: string;
  avatar_url?: string | null;
}

const UserProfile = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(
    null
  );
  const [doesFollow, setDoesFollow] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  const { profile } = useProfile(); // logged-in user data
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const usernameParam = params.username as string | undefined;

  // Determine the correct navigation path based on current context
  const getNavigationPath = (route: string) => {
    if (pathname?.includes("/discover/")) {
      return route; // For discover tab, use the route as-is
    } else {
      return route; // For home tab, use the route as-is
    }
  };

  // For this screen, we always show the other user's profile.
  const displayProfile = selectedProfile;

  // Check follow status for the selected user
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (displayProfile && profile) {
        const { data, error } = await supabase
          .from("followers")
          .select("*")
          .eq("follower_id", profile.id)
          .eq("following_id", displayProfile.id)
          .maybeSingle();
        if (error) {
          console.error("Error checking follow status:", error);
        } else {
          setDoesFollow(!!data);
        }
      }
    };
    checkFollowStatus();
  }, [displayProfile, profile]);

  // Check block status for the selected user
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (displayProfile && profile) {
        const { data, error } = await supabase
          .from("blocks")
          .select("*")
          .eq("blocker_id", profile.id)
          .eq("blocked_id", displayProfile.id)
          .maybeSingle();
        if (error) {
          console.error("Error checking block status:", error);
        } else {
          setIsBlocked(!!data);
        }
      }
    };
    checkBlockStatus();
  }, [displayProfile, profile]);

  const toggleFollow = async () => {
    if (!profile || !displayProfile) return;

    if (doesFollow) {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", profile.id)
        .eq("following_id", displayProfile.id);
      if (error) {
        console.error("Error unfollowing user:", error);
        Alert.alert("Error", "Unable to unfollow user. Please try again.");
      } else {
        setDoesFollow(false);
        // Update follower count after unfollowing
        setFollowersCount((prev) => Math.max(0, prev - 1));
      }
    } else {
      const { error } = await supabase
        .from("followers")
        .upsert([{ follower_id: profile.id, following_id: displayProfile.id }]);
      if (error) {
        console.error("Error following user:", error);
        Alert.alert("Error", "Unable to follow user. Please try again.");
      } else {
        setDoesFollow(true);
        // Update follower count after following
        setFollowersCount((prev) => prev + 1);
        // Track follow event
        AnalyticService.capture('follow_user', {
          targetUserId: displayProfile.id,
          targetUsername: displayProfile.username,
        });
      }
    }
  };

  // Fetch follower and following counts from the database
  useEffect(() => {
    const fetchFollowCounts = async () => {
      if (displayProfile) {
        const { count: followers, error: errorFollowers } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", displayProfile.id);
        if (errorFollowers) {
          console.error("Error fetching followers count:", errorFollowers);
        } else {
          setFollowersCount(followers || 0);
        }
        const { count: following, error: errorFollowing } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", displayProfile.id);
        if (errorFollowing) {
          console.error("Error fetching following count:", errorFollowing);
        } else {
          setFollowingCount(following || 0);
        }
      }
    };

    fetchFollowCounts();
  }, [displayProfile]);

  // Update header with custom title
  useEffect(() => {
    if (displayProfile) {
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{displayProfile.username}</Text>
          </View>
        ),
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButtonLeft}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        ),
      });
    }
  }, [displayProfile, navigation]);

  // Fetch the selected profile when usernameParam is provided
  useEffect(() => {
    setAvatar(null);
    if (usernameParam) {
      fetchSelectedProfile(usernameParam);
    }
  }, [usernameParam]);

  const fetchSelectedProfile = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("deleted", false)
        .single();
      if (error) {
        console.error("Error fetching selected profile:", error);
      } else {
        if (data.avatar_url) {
          const { data: avatarUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(data.avatar_url);
          setAvatar(avatarUrlData?.publicUrl ?? null);
        } else {
          setAvatar(null);
        }
        setSelectedProfile(data);
        // Track view profile event (only if not viewing own profile)
        if (profile && data.id !== profile.id) {
          AnalyticService.capture('view_profile', {
            targetUserId: data.id,
            targetUsername: data.username,
          });
        }
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
    }
  };

  const loadUserReviews = async (userId?: string) => {
    setLoadingReviews(true);
    if (!userId) {
      setLoadingReviews(false);
      return;
    }
    try {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          comment,
          image_url,
          inserted_at,
          taste,
          presentation,
          location:locations!reviews_location_fkey(name),
          spirit:spirit(name),
          type:type(name),
          profile:profiles!reviews_user_id_fkey1(id, username, avatar_url)
          `
        )
        .eq("user_id", userId)
        .eq("state", 1)
        .not("profile.deleted", "eq", true)
        .order("inserted_at", { ascending: false });
      if (error) {
        console.error("Error fetching user reviews:", error);
        setLoadingReviews(false);
        return;
      }

      // Get image URLs using cache
      const imagePaths = reviewsData.map((review: any) => review.image_url);
      const imageUrls = await imageCache.getReviewImageUrls(imagePaths);

      const reviewsWithFullUrl = reviewsData.map((review: any) => ({
        ...review,
        image_url: imageUrls[review.image_url] || review.image_url,
      }));
      setUserReviews(reviewsWithFullUrl);
      setLoadingReviews(false);
    } catch (err) {
      console.error("Unexpected error while fetching user reviews:", err);
      setLoadingReviews(false);
    }
  };

  const handleShowComments = (
    reviewId: string,
    onCommentAdded: any,
    onCommentDeleted: any
  ) => {
    const review = userReviews.find((r) => r.id === reviewId);
    if (review) {
      setSelectedCommentReview(review);
    }
  };

  const handleCommentAdded = (reviewId: string, newComment: any) => {
    setUserReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, _commentPatch: { action: "add", data: newComment } }
          : r
      )
    );
  };

  const handleCommentDeleted = (reviewId: string, commentId: number) => {
    setUserReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, _commentPatch: { action: "delete", id: commentId } }
          : r
      )
    );
  };

  const handleBlockUser = async () => {
    if (!profile || !displayProfile) return;

    Alert.alert(
      "Block User",
      `Are you sure you want to block ${displayProfile.username}? You won't see their content and they won't be able to see yours.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              // Insert block record
              const { error } = await supabase.from("blocks").insert([
                {
                  blocker_id: profile.id,
                  blocked_id: displayProfile.id,
                },
              ]);

              if (error) {
                console.error("Error blocking user:", error);
                Alert.alert("Error", "Unable to block user. Please try again.");
                return;
              }

              // Also unfollow if currently following
              if (doesFollow) {
                await supabase
                  .from("followers")
                  .delete()
                  .eq("follower_id", profile.id)
                  .eq("following_id", displayProfile.id);
                setDoesFollow(false);
              }

              setIsBlocked(true);
            } catch (err) {
              console.error("Unexpected error blocking user:", err);
              Alert.alert(
                "Error",
                "An unexpected error occurred. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleUnblockUser = async () => {
    if (!profile || !displayProfile) return;

    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${displayProfile.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("blocks")
                .delete()
                .eq("blocker_id", profile.id)
                .eq("blocked_id", displayProfile.id);

              if (error) {
                console.error("Error unblocking user:", error);
                Alert.alert(
                  "Error",
                  "Unable to unblock user. Please try again."
                );
                return;
              }

              setIsBlocked(false);
            } catch (err) {
              console.error("Unexpected error unblocking user:", err);
              Alert.alert(
                "Error",
                "An unexpected error occurred. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const renderReviewItem = ({ item }: { item: Review }) => {
    const isOwnReview = profile && String(profile.id) === String(item.user_id);
    return (
      <ReviewItem
        review={item}
        canDelete={false}
        onDelete={undefined}
        onEdit={
          isOwnReview
            ? () => router.push(`/profile/edit-caption?reviewId=${item.id}`)
            : undefined
        }
        onShowLikes={() => {}} // Empty function since we don't need likes functionality here
        onShowComments={handleShowComments}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
      />
    );
  };

  const renderEmpty = () => {
    if (loadingReviews) {
      return null; // Don't show empty state while loading
    }
    if (userReviews.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No reviews available.</Text>
        </View>
      );
    }
    return null;
  };

  useEffect(() => {
    if (displayProfile && displayProfile.id) {
      loadUserReviews(displayProfile.id);
    }
  }, [displayProfile]);

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Avatar
            avatarPath={displayProfile?.avatar_url}
            username={displayProfile?.username}
            size={100}
            style={styles.avatar}
          />
        </View>
        <View style={styles.userInfoContainer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userReviews.length}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                navigation.navigate(
                  getNavigationPath("users/[username]/followers"),
                  {
                    username: displayProfile?.username,
                  }
                )
              }
            >
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                navigation.navigate(
                  getNavigationPath("users/[username]/following"),
                  {
                    username: displayProfile?.username,
                  }
                )
              }
            >
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
          {/* Action Buttons - only show if not viewing own profile */}
          {profile && displayProfile && profile.id !== displayProfile.id && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                onPress={toggleFollow}
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
                onPress={isBlocked ? handleUnblockUser : handleBlockUser}
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
      {/* Reviews List */}
      <View style={styles.reviewsContainer}>
        <FlatList
          data={userReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          onRefresh={() => {
            if (displayProfile && displayProfile.id) {
              loadUserReviews(displayProfile.id);
            }
          }}
          refreshing={loadingReviews}
        />
      </View>

      {selectedCommentReview && (
        <CommentsSlider
          review={selectedCommentReview}
          onClose={() => setSelectedCommentReview(null)}
          onCommentAdded={handleCommentAdded}
          onCommentDeleted={handleCommentDeleted}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 16,
    alignItems: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  userInfoContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    marginTop: 8,
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    textAlign: "center",
  },
  reviewsContainer: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
  },
  headerButton: {
    marginRight: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonLeft: {
    marginLeft: 5,
  },
  friendText: {
    fontSize: 16,
    color: "#fff", // White text on purple background
    fontWeight: "600",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#777",
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

export default UserProfile;
