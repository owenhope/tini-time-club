import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Button,
  StyleSheet,
  Image,
  FlatList,
  Text,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/utils/supabase";
import { decode } from "base64-arraybuffer";

const screenWidth = Dimensions.get("window").width;
const GRID_GAP = 8;
const GRID_ITEM_SIZE = (screenWidth - GRID_GAP * 3) / 2;

interface Review {
  id: number;
  comment: string;
  image_url: string;
  inserted_at: string;
}

const Profile = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingAvatar, setLoadingAvatar] = useState<boolean>(false);

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
      // Fetch reviews by this user from the "reviews" table
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select("id, comment, image_url, inserted_at")
        .eq("user_id", User.id)
        .order("inserted_at", { ascending: false });

      if (error) {
        console.error("Error fetching user reviews:", error);
        setLoadingReviews(false);
        return;
      }

      // Convert storage paths into public URLs
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

  // Render a grid item for each review.
  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.gridItem}>
      <Image source={{ uri: item.image_url }} style={styles.gridImage} />
      <View style={styles.gridOverlay}>
        <Text style={styles.gridComment} numberOfLines={2}>
          {item.comment}
        </Text>
      </View>
    </View>
  );

  // Render when there are no reviews
  const renderEmpty = () => {
    if (loadingReviews) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No reviews available.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {avatar ? (
          <Image style={styles.avatar} source={{ uri: avatar }} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <Button title="Set Avatar Image" onPress={pickImage} />
      </View>
      <View style={styles.reviewsContainer}>
        {loadingReviews ? (
          <ActivityIndicator size="large" color="#000" />
        ) : (
          <FlatList
            data={userReviews}
            renderItem={renderReviewItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={renderEmpty}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#ccc",
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#ccc",
    marginBottom: 20,
  },
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
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    marginBottom: GRID_GAP,
    borderRadius: 10,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gridOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 4,
  },
  gridComment: {
    color: "#fff",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
  },
});

export default Profile;
