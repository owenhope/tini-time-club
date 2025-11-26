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
import {
  useRouter,
  useLocalSearchParams,
  useNavigation,
  usePathname,
} from "expo-router";
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
          navigation.navigate(
            getNavigationPath("users/[username]/followers"),
            {
              username: displayProfile?.username,
            }
          )
        }
        onFollowingPress={() =>
          navigation.navigate(
            getNavigationPath("users/[username]/following"),
            {
              username: displayProfile?.username,
            }
          )
        }
        isScrolled={isScrolled}
        hasBioOrFavs={!!(displayProfile?.bio || getFavoriteSpirits().length > 0 || getFavoriteTypes().length > 0)}
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
                    <Text style={styles.tagText}>{getSpiritName(spiritId)}</Text>
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
