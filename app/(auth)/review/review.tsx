import {
  View,
  Button,
  StyleSheet,
  Image,
  Text,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router"; // Import useRouter to access URL params
import { supabase } from "@/utils/supabase"; // Make sure supabase is set up correctly

const Review = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Loading state to show ActivityIndicator
  const [review, setReview] = useState<any | null>(null); // Store review data
  const { id } = useLocalSearchParams<{ id: string }>(); // Get reviewId from URL params

  useEffect(() => {
    if (id) {
      loadReview();
    }
  }, [id]);

  const loadReview = async () => {
    try {
      // Fetch the review from Supabase using the reviewId
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("id", id)
        .single(); // Fetch a single review by its ID

      if (error) {
        console.error("Error fetching review:", error);
        return;
      }

      if (data) {
        setReview(data); // Store the review
        loadReviewImage(data.image_url); // Load image based on the image_url field
      }
    } catch (err) {
      console.error("Error fetching review:", err);
    }
  };

  const loadReviewImage = async (imagePath: string) => {
    // Get the signed URL of the image stored in Supabase
    const { data, error } = await supabase.storage
      .from("review_images")
      .createSignedUrl(imagePath, 60 * 60); // Set expiration time (e.g., 1 hour)

    if (error) {
      console.error("Error fetching signed URL:", error);
      setLoading(false);
      return;
    }

    setImage(data.signedUrl); // Set the signed URL of the image
    setLoading(false); // Stop loading once the image is set
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : image ? (
        <Image source={{ uri: image }} style={styles.avatar} />
      ) : (
        <Text>No Image Available</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 20,
  },
  avatar: {
    height: 300,
    objectFit: "contain",
    aspectRatio: 4 / 3,
    alignSelf: "center",
  },
});

export default Review;
