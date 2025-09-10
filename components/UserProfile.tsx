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
import { Review } from "@/types/types";
import ReviewItem from "@/components/ReviewItem";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";

interface ProfileType {
  id: string;
  username: string;
  avatar_url?: string | null;
}

const UserProfile = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(
    null
  );
  const [doesFollow, setDoesFollow] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

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
      }
    } else {
      const { error } = await supabase
        .from("followers")
        .insert(
          [{ follower_id: profile.id, following_id: displayProfile.id }],
          { upsert: true }
        );
      if (error) {
        console.error("Error following user:", error);
        Alert.alert("Error", "Unable to follow user. Please try again.");
      } else {
        setDoesFollow(true);
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

  // Update header with custom title and follow button
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
        headerRight: () => (
          <TouchableOpacity onPress={toggleFollow} style={styles.headerButton}>
            <Text style={styles.friendText}>
              {doesFollow ? "Unfollow" : "Follow"}
            </Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [displayProfile, navigation, doesFollow, followersCount, followingCount]);

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
        .order("inserted_at", { ascending: false });
      if (error) {
        console.error("Error fetching user reviews:", error);
        setLoadingReviews(false);
        return;
      }

      const reviewsWithFullUrl = await Promise.all(
        reviewsData.map(async (review: any) => {
          const { data, error } = await supabase.storage
            .from("review_images")
            .createSignedUrl(review.image_url, 60);
          if (error) {
            console.error("Error creating signed URL:", error);
            return review;
          }
          return { ...review, image_url: data.signedUrl };
        })
      );
      setUserReviews(reviewsWithFullUrl);
      setLoadingReviews(false);
    } catch (err) {
      console.error("Unexpected error while fetching user reviews:", err);
      setLoadingReviews(false);
    }
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <ReviewItem
      review={item}
      aspectRatio={1}
      canDelete={false}
      onDelete={undefined}
    />
  );

  const renderEmpty = () => {
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
          {avatar ? (
            <Image style={styles.avatar} source={{ uri: avatar }} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {displayProfile?.username
                  ? displayProfile.username.charAt(0).toUpperCase()
                  : "?"}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userInfoContainer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userReviews.length}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
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
    backgroundColor: "#ccc",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "bold",
  },
  userInfoContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
    marginRight: 16,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    color: "#777",
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
  },
  headerButtonLeft: {
    marginLeft: 5,
  },
  friendText: {
    fontSize: 16,
    color: "#007aff",
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
});

export default UserProfile;
