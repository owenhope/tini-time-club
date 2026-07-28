import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import imageCache from "@/utils/imageCache";
import { Review } from "@/types/types";
import ReviewItem from "@/components/ReviewItem";
import CommentsSlider from "@/components/CommentsSlider";
import ProfileHeader from "@/components/ProfileHeader";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";

interface ProfileType {
  id: string;
  username: string;
  name?: string | null;
  bio?: string | null;
  favorite_spirits?: any;
  favorite_types?: any;
  avatar_url?: string | null;
}

const UserProfile = () => {
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(
    null
  );
  const [doesFollow, setDoesFollow] = useState<boolean>(false);
  const [followPending, setFollowPending] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [spirits, setSpirits] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const bioOpacity = useRef(new Animated.Value(1)).current;

  const { profile } = useProfile(); // logged-in user data
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const usernameParam = params.username as string | undefined;

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
    // followPending guards against double-taps, which would otherwise send two
    // writes and adjust the local count twice.
    if (!profile || !displayProfile || followPending) return;

    const wasFollowing = doesFollow;
    setFollowPending(true);

    // Optimistic: the button reflects the new state immediately.
    setDoesFollow(!wasFollowing);
    setFollowersCount((prev) => Math.max(0, prev + (wasFollowing ? -1 : 1)));

    const { error } = wasFollowing
      ? await supabase
          .from("followers")
          .delete()
          .eq("follower_id", profile.id)
          .eq("following_id", displayProfile.id)
      : await supabase
          .from("followers")
          .upsert([
            { follower_id: profile.id, following_id: displayProfile.id },
          ]);

    if (error) {
      console.error(
        wasFollowing ? "Error unfollowing user:" : "Error following user:",
        error
      );
      setDoesFollow(wasFollowing);
      setFollowersCount((prev) => Math.max(0, prev + (wasFollowing ? 1 : -1)));
      Alert.alert(
        "Error",
        `Unable to ${wasFollowing ? "unfollow" : "follow"} user. Please try again.`
      );
    } else if (!wasFollowing) {
      AnalyticService.capture("follow_user", {
        targetUserId: displayProfile.id,
        targetUsername: displayProfile.username,
      });
    }

    setFollowPending(false);
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
    if (usernameParam) {
      fetchSelectedProfile(usernameParam);
    }
  }, [usernameParam]);

  const fetchSelectedProfile = async (username: string) => {
    setProfileError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("deleted", false)
        .single();
      if (error) {
        console.error("Error fetching selected profile:", error);
        // Without this the screen stays blank forever with no way back.
        setProfileError(
          error.code === "PGRST116"
            ? "This profile isn't available."
            : "We couldn't load this profile."
        );
      } else {
        setSelectedProfile(data);
        // Track view profile event (only if not viewing own profile)
        if (profile && data.id !== profile.id) {
          AnalyticService.capture("view_profile", {
            targetUserId: data.id,
            targetUsername: data.username,
          });
        }
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
      setProfileError("We couldn't load this profile.");
    }
  };

  const loadUserReviews = async (userId?: string) => {
    setLoadingReviews(true);
    if (!userId) {
      setLoadingReviews(false);
      return;
    }
    try {
      const reviewsData = await databaseService.getReviews({
        userId,
        currentUserId: userId,
        excludeBlocked: false, // Don't exclude blocked users when viewing their profile
      });

      // Get image URLs using cache
      const imagePaths = reviewsData.map((review: any) => review.image_url);
      const imageUrls = await imageCache.getReviewImageUrls(imagePaths);

      const reviewsWithFullUrl = reviewsData.map((review: any) => ({
        ...review,
        image_url: imageUrls[review.image_url] || review.image_url,
      }));
      setUserReviews(reviewsWithFullUrl);
    } catch (err) {
      console.error("Unexpected error while fetching user reviews:", err);
    } finally {
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

  // Load spirits and types for favorites display
  useEffect(() => {
    loadSpiritsAndTypes();
  }, []);

  const loadSpiritsAndTypes = async () => {
    try {
      const [spiritsData, typesData] = await Promise.all([
        databaseService.getSpirits(),
        databaseService.getTypes(),
      ]);
      setSpirits(spiritsData);
      setTypes(typesData);
    } catch (error) {
      console.error("Error loading spirits and types:", error);
    }
  };

  const getSpiritName = (id: number | string) => {
    const spirit = spirits.find((s) => String(s.id) === String(id));
    return spirit?.name || String(id);
  };

  const getTypeName = (id: number | string) => {
    const type = types.find((t) => String(t.id) === String(id));
    return type?.name || String(id);
  };

  // Helper to get favorite arrays (handle both array and JSON string)
  const getFavoriteSpirits = () => {
    if (!displayProfile?.favorite_spirits) return [];
    if (Array.isArray(displayProfile.favorite_spirits))
      return displayProfile.favorite_spirits;
    try {
      return JSON.parse(displayProfile.favorite_spirits);
    } catch {
      return [];
    }
  };

  const getFavoriteTypes = () => {
    if (!displayProfile?.favorite_types) return [];
    if (Array.isArray(displayProfile.favorite_types))
      return displayProfile.favorite_types;
    try {
      return JSON.parse(displayProfile.favorite_types);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    Animated.timing(bioOpacity, {
      toValue: isScrolled ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isScrolled]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const shouldBeScrolled = offsetY > 50;
        if (shouldBeScrolled !== isScrolled) {
          setIsScrolled(shouldBeScrolled);
        }
      },
    }
  );

  if (profileError) {
    return (
      <View style={[styles.container, styles.errorState]}>
        <Text style={styles.errorTitle}>{profileError}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => {
            if (usernameParam) fetchSelectedProfile(String(usernameParam));
          }}
        >
          <Text style={styles.errorButtonText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <ProfileHeader
        profile={displayProfile}
        reviewsCount={userReviews.length}
        followersCount={followersCount}
        followingCount={followingCount}
        isOwnProfile={profile ? profile.id === displayProfile?.id : false}
        doesFollow={doesFollow}
        isBlocked={isBlocked}
        onFollowPress={toggleFollow}
        onBlockPress={handleBlockUser}
        onUnblockPress={handleUnblockUser}
        onFollowersPress={() =>
          router.push(`/users/${displayProfile?.username}/followers` as never)
        }
        onFollowingPress={() =>
          router.push(`/users/${displayProfile?.username}/following` as never)
        }
        isScrolled={isScrolled}
        hasBioOrFavs={
          !!(
            displayProfile?.bio ||
            getFavoriteSpirits().length > 0 ||
            getFavoriteTypes().length > 0
          )
        }
      />

      {/* Bio Section */}
      <Animated.View
        style={{
          opacity: bioOpacity,
          height: isScrolled ? 0 : undefined,
          overflow: "hidden",
        }}
        pointerEvents={isScrolled ? "none" : "auto"}
      >
        {displayProfile?.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bio}>{displayProfile.bio}</Text>
          </View>
        )}

        {/* Favorites Section */}
        {(getFavoriteSpirits().length > 0 || getFavoriteTypes().length > 0) && (
          <View style={styles.tagsSection}>
            <View style={styles.favoritesTagsContainer}>
              {getFavoriteSpirits().map((spiritId: any) => {
                return (
                  <View key={`spirit-${spiritId}`} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {getSpiritName(spiritId)}
                    </Text>
                  </View>
                );
              })}
              {getFavoriteTypes().map((typeId: any) => {
                return (
                  <View key={`type-${typeId}`} style={styles.tag}>
                    <Text style={styles.tagText}>{getTypeName(typeId)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </Animated.View>

      {/* Reviews List */}
      <View style={styles.reviewsContainer}>
        <FlatList
          data={userReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          onScroll={handleScroll}
          scrollEventThrottle={16}
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
  errorState: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: "#B6A3E2",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  errorButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  errorLink: {
    color: "#666",
    fontSize: 14,
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
  bioSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
    textAlign: "left",
    fontWeight: "600",
    width: "100%",
  },
  tagsSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  favoritesTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    justifyContent: "flex-start",
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#B6A3E2",
  },
  tagText: {
    fontSize: 12,
    color: "#fff",
    textTransform: "capitalize",
  },
});

export default UserProfile;
