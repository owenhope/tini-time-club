import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Text,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/utils/supabase";
import { decode } from "base64-arraybuffer";
import { useProfile } from "@/context/profile-context";
import { AirbnbRating } from "react-native-ratings";

const screenWidth = Dimensions.get("window").width;
const GRID_GAP = 8;

interface Review {
  id: number;
  comment: string;
  image_url: string;
  inserted_at: string;
  taste: number;
  presentation: number;
  location?: {
    name: string;
  };
  type?: {
    name: string;
  };
  spirit?: {
    name: string;
  };
  profile?: {
    username: string;
  };
}

// A custom rating component using AirbnbRating.
const ReviewRating: React.FC<{
  value: number;
  label: "taste" | "presentation";
}> = ({ value, label }) => {
  const MARTINI_IMAGE = require("@/assets/images/martini_transparent.png");
  const OLIVE_IMAGE = require("@/assets/images/olive_transparent.png");
  const OLIVE_COLOR = "#c3eb78";
  const MARTINI_COLOR = "#f3ffc6";

  return (
    <AirbnbRating
      starImage={label === "taste" ? OLIVE_IMAGE : MARTINI_IMAGE}
      selectedColor={label === "taste" ? OLIVE_COLOR : MARTINI_COLOR}
      count={5}
      size={14}
      reviewSize={16}
      showRating={false}
      ratingContainerStyle={{ alignItems: "flex-start" }}
      defaultRating={value}
    />
  );
};

// The updated ReviewItem component.
const ReviewItem: React.FC<{ review: Review }> = ({ review }) => {
  // Determine the top left triangle color based on TYPE.
  const getTypeColor = () => {
    if (!review.type || !review.type.name) return "transparent";
    const name = review.type.name.toLowerCase();
    if (name === "twist") return "yellow";
    if (name === "dirty") return "olive";
    return "gray";
  };

  // Determine the top right triangle color based on SPIRIT.
  const getSpiritColor = () => {
    if (!review.spirit || !review.spirit.name) return "transparent";
    const name = review.spirit.name.toLowerCase();
    if (name === "vodka") return "silver";
    if (name === "gin") return "blue";
    return "gray";
  };

  return (
    <View style={styles.reviewContainer}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: review.image_url }} style={styles.reviewImage} />
        <View
          style={[styles.topLeftTriangle, { borderTopColor: getTypeColor() }]}
        />
        <View
          style={[styles.topRightTriangle, { borderTopColor: getSpiritColor() }]}
        />
        <View style={styles.overlay}>
          <Text numberOfLines={1} style={styles.locationName}>
            {review.location ? review.location.name : "N/A"}
          </Text>
          <View style={styles.ratingsContainer}>
            <View style={styles.ratingRow}>
              <ReviewRating value={review.taste} label="taste" />
            </View>
            <View style={styles.ratingRow}>
              <ReviewRating value={review.presentation} label="presentation" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const Profile = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingAvatar, setLoadingAvatar] = useState<boolean>(false);
  const { profile } = useProfile(); // Using the context to get the profile

  useEffect(() => {
    loadUserAvatar();
    loadUserReviews();
  }, []);

  const loadUserAvatar = async () => {
    setLoadingAvatar(true);
    const {
      data: { user: User },
    } = await supabase.auth.getUser();
    if (!User) {
      setLoadingAvatar(false);
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(`${User.id}/avatar.png`);
      if (error) {
        if (error.message.includes("The resource was not found")) {
          setLoadingAvatar(false);
          return;
        }
        console.error("Avatar download error:", error);
        setLoadingAvatar(false);
        return;
      }
      if (data) {
        const fr = new FileReader();
        fr.readAsDataURL(data);
        fr.onload = () => {
          setAvatar(fr.result as string);
          setLoadingAvatar(false);
        };
      }
    } catch (err) {
      console.error(err);
      setLoadingAvatar(false);
    }
  };

  const loadUserReviews = async () => {
    setLoadingReviews(true);
    const {
      data: { user: User },
    } = await supabase.auth.getUser();
    if (!User) {
      setLoadingReviews(false);
      return;
    }
    try {
      // Query to fetch additional fields required by ReviewItem.
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
          profile:profiles(username)
        `
        )
        .eq("user_id", User.id)
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
      console.error(err);
      setLoadingReviews(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      const {
        data: { user: User },
      } = await supabase.auth.getUser();
      if (!User) return;
      const img = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(img.uri, {
        encoding: "base64",
      });
      const filePath = `${User.id}/avatar.png`;
      const contentType = "image/png";
      try {
        const { error } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), { contentType, upsert: true });
        if (error) {
          console.error("Error uploading avatar:", error);
        } else {
          console.log("Avatar uploaded successfully");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <ReviewItem review={item} />
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

  return (
    <View style={styles.container}>
      {/* Instagram-style Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          {avatar ? (
            <Image style={styles.avatar} source={{ uri: avatar }} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </TouchableOpacity>
        <View style={styles.userInfoContainer}>
          <Text style={styles.usernameText}>
            {profile?.username || "Username"}
          </Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {userReviews.length}
              </Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
          <Text style={styles.bioText}>This is a bio placeholder.</Text>
        </View>
      </View>

      {/* Reviews List with pull-to-refresh and two-column grid */}
      <View style={styles.reviewsContainer}>
        <FlatList
          data={userReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          onRefresh={loadUserReviews}
          refreshing={loadingReviews}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Profile Header Styles
  profileHeader: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
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
  },
  userInfoContainer: {
    flex: 1,
  },
  usernameText: {
    fontSize: 20,
    fontWeight: "bold",
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
  bioText: {
    marginTop: 8,
    fontSize: 14,
  },
  // Reviews List Styles
  reviewsContainer: {
    flex: 1,
    paddingHorizontal: GRID_GAP,
  },
  gridContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: GRID_GAP,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
  },
  // ReviewItem Styles
  reviewContainer: {
    marginBottom: 16,
    flex: 1 / 2, // Ensures two items per row
  },
  imageContainer: {
    width: "100%",
    height: 300, // Adjust as needed
    position: "relative",
  },
  reviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  // Diagonal triangle for top left (TYPE)
  topLeftTriangle: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 40,
    borderRightWidth: 40,
    borderTopColor: "transparent", // will be overridden
    borderRightColor: "transparent",
  },
  // Diagonal triangle for top right (SPIRIT)
  topRightTriangle: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 40,
    borderLeftWidth: 40,
    borderTopColor: "transparent", // will be overridden
    borderLeftColor: "transparent",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
  },
  locationName: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#fff",
    
  },
  ratingsContainer: {
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  commentText: {
    marginTop: 4,
    color: "#fff",
  },
});

export default Profile;
