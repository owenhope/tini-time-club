import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { supabase } from "@/utils/supabase";
import { Review } from "@/types/types";
import ReviewRating from "./ReviewRating";

const screenWidth = Dimensions.get("window").width;

// Helper function to format the review date relatively
const formatRelativeDate = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30); // approximate
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
};

interface ReviewItemProps {
  review: Review;
  aspectRatio: number;
  onDelete: () => void;
  canDelete: boolean;
}

const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  aspectRatio,
  canDelete,
  onDelete,
}) => {
  const router = useRouter();
  const { profile } = useProfile();

  // Use the same animated value as before for overlay opacity.
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const animateOpacity = (toValue: number) => {
    Animated.timing(overlayOpacity, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Local state for likes – fetched from the Supabase "likes" table.
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Fetch initial likes count and like status.
  useEffect(() => {
    const fetchLikes = async () => {
      const { count, error: countError } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("review_id", review.id);
      if (countError) {
        console.error("Error fetching likes count:", countError);
      } else {
        setLikesCount(count || 0);
      }
      if (profile) {
        const { data, error: likeError } = await supabase
          .from("likes")
          .select("*")
          .eq("review_id", review.id)
          .eq("user_id", profile.id)
          .maybeSingle();
        if (likeError) {
          console.error("Error checking like status:", likeError);
        } else {
          setHasLiked(!!data);
        }
      }
    };
    fetchLikes();
  }, [review.id, profile]);

  const handleToggleLike = async () => {
    if (!profile) return;
    if (hasLiked) {
      // Unlike: remove like record
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("review_id", review.id)
        .eq("user_id", profile.id);
      if (error) {
        console.error("Error unliking:", error);
      } else {
        setHasLiked(false);
        setLikesCount((prev) => prev - 1);
      }
    } else {
      // Like: upsert like record
      const { error } = await supabase
        .from("likes")
        .upsert([{ review_id: review.id, user_id: profile.id }]);
      if (error) {
        console.error("Error liking:", error);
      } else {
        setHasLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    }
  };

  return (
    <Pressable
      onLongPress={() => animateOpacity(0)}
      onPressOut={() => animateOpacity(1)}
    >
      {/* Image Container (exactly as before) */}
      <View style={[styles.imageContainer, { aspectRatio }]}>
        <Image source={{ uri: review.image_url }} style={styles.reviewImage} />
        {canDelete && (
          <Animated.View style={[styles.topBar, { opacity: overlayOpacity }]}>
            <TouchableOpacity onPress={onDelete}>
              <Ionicons name="trash" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        )}
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Text style={styles.locationName}>
            {review.location ? review.location.name : "N/A"}
          </Text>
          {review.location?.address && (
            <Text style={styles.locationAddress}>
              {review.location.address}
            </Text>
          )}
          <Text style={styles.spiritText}>
            Spirit: {review.spirit ? review.spirit.name : "N/A"}
          </Text>
          <Text style={styles.typeText}>
            Type: {review.type ? review.type.name : "N/A"}
          </Text>
          <Text style={styles.ratingLabel}>Taste</Text>
          <ReviewRating value={review.taste} label="taste" />
          <Text style={styles.ratingLabel}>Presentation</Text>
          <ReviewRating value={review.presentation} label="presentation" />
        </Animated.View>
      </View>

      {/* Footer rendered below the image container */}
      <View style={styles.footer}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={{ flexDirection: "row", gap: 5, alignItems: "center" }}
            onPress={handleToggleLike}
          >
            <Ionicons
              name={hasLiked ? "heart" : "heart-outline"}
              size={28}
              color={hasLiked ? "red" : "#000"}
            />
            <Text style={styles.likesCount}>{likesCount} likes</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity onPress={() => {}}>
            <Ionicons name="chatbubble-outline" size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="paper-plane-outline" size={28} color="#000" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="bookmark-outline" size={28} color="#000" />
          </TouchableOpacity> */}
        </View>

        <TouchableOpacity
          style={styles.captionContainer}
          onPress={() =>
            review.profile?.username &&
            router.push(`/profile/${review.profile.username}`)
          }
        >
          <Text style={styles.username}>
            {review.profile?.username || "Unknown"}
          </Text>
          <Text style={styles.captionText}> {review.comment}</Text>
        </TouchableOpacity>
        <Text style={styles.timestamp}>
          {formatRelativeDate(review.inserted_at)}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    width: screenWidth,
    position: "relative",
  },
  reviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  topBar: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 10,
    zIndex: 2,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 20,
    justifyContent: "flex-end",
  },
  locationName: {
    fontWeight: "bold",
    fontSize: 24,
    color: "#fff",
  },
  locationAddress: {
    fontSize: 14,
    color: "#ddd",
    marginBottom: 8,
  },
  ratingLabel: {
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 4,
    color: "#fff",
  },
  spiritText: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "capitalize",
    marginTop: 8,
    color: "#fff",
  },
  typeText: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "capitalize",
    marginTop: 8,
    color: "#fff",
  },
  commentTitle: {
    fontSize: 16,
    marginTop: 8,
    fontWeight: "bold",
    color: "#FFF",
  },
  commentText: {
    fontSize: 16,
    marginTop: 4,
    color: "#fff",
  },
  footer: {
    backgroundColor: "#fff",
    padding: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  likesCount: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
  },
  captionContainer: {
    flexDirection: "row",
    marginBottom: 5,
  },
  username: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
  },
  captionText: {
    fontSize: 16,
    color: "#000",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
});

export default ReviewItem;
