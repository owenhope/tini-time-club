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
import { Link } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { supabase } from "@/utils/supabase";
import { Review } from "@/types/types";
import ReviewRating from "./ReviewRating";
import * as Haptics from "expo-haptics";
import { NOTIFICATION_TYPES } from "@/utils/consts";
import { stripNameFromAddress, formatRelativeDate } from "@/utils/helpers";

const screenWidth = Dimensions.get("window").width;

interface ReviewItemProps {
  review: Review & { _commentPatch?: any };
  aspectRatio: number;
  canDelete: boolean;
  onDelete?: () => void;
  onShowLikes: (reviewId: string) => void;
  onShowComments: (
    reviewId: string,
    onCommentAdded: (reviewId: string, newComment: any) => void,
    onCommentDeleted: (reviewId: string, commentId: number) => void
  ) => void;
  onCommentAdded: (reviewId: string, newComment: any) => void;
  onCommentDeleted: (reviewId: string, commentId: number) => void;
}

export default function ReviewItem({
  review,
  aspectRatio,
  canDelete,
  onDelete,
  onShowLikes,
  onShowComments,
  onCommentAdded,
  onCommentDeleted,
}: ReviewItemProps) {
  const { profile } = useProfile();
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const lastTapRef = useRef<number>(0);
  const DOUBLE_TAP_DELAY = 300;

  useEffect(() => {
    fetchLikes();
    fetchComments();
  }, [review.id]);

  useEffect(() => {
    if (review._commentPatch) {
      if (review._commentPatch.action === "add") {
        setComments((prev) => [...prev, review._commentPatch.data]);
      } else if (review._commentPatch.action === "delete") {
        setComments((prev) =>
          prev.filter((c) => c.id !== review._commentPatch.id)
        );
      }
    }
  }, [review._commentPatch]);

  const fetchLikes = async () => {
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("review_id", review.id);
    setLikesCount(count || 0);

    if (profile) {
      const { data } = await supabase
        .from("likes")
        .select("*")
        .eq("review_id", review.id)
        .eq("user_id", profile.id)
        .maybeSingle();
      setHasLiked(!!data);
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profile:profiles(id, username)")
      .eq("review_id", review.id)
      .order("inserted_at", { ascending: false });
    setComments(data || []);
  };

  const handleToggleLike = async () => {
    if (!profile) return;
    if (hasLiked) {
      await supabase
        .from("likes")
        .delete()
        .eq("review_id", review.id)
        .eq("user_id", profile.id);
      setHasLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      await supabase
        .from("likes")
        .upsert([{ review_id: review.id, user_id: profile.id }]);
      setHasLiked(true);
      setLikesCount((prev) => prev + 1);
      if (review.user_id && profile.id !== review.user_id) {
        const notificationBody = `${profile.username} liked your review from ${
          review.location?.name || "an unknown location"
        }`;
        await supabase.from("notifications").insert({
          user_id: review.user_id,
          body: notificationBody,
          type: NOTIFICATION_TYPES.USER,
        });
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePress = () => {
    const now = Date.now();
    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleToggleLike();
    }
    lastTapRef.current = now;
  };

  const animateOpacity = (toValue: number) => {
    Animated.timing(overlayOpacity, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={() => animateOpacity(0)}
      onPressOut={() => animateOpacity(1)}
    >
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
          <Link href={`/home/locations/${review.location?.id}`} asChild>
            <Text style={styles.locationName}>
              {review.location?.name || "N/A"}
            </Text>
          </Link>
          {review.location?.address && (
            <Text style={styles.locationAddress}>
              {stripNameFromAddress(
                review.location.name,
                review.location.address
              )}
            </Text>
          )}
          <Text style={styles.spiritText}>
            Spirit: {review.spirit?.name || "N/A"}
          </Text>
          <Text style={styles.typeText}>
            Type: {review.type?.name || "N/A"}
          </Text>
          <Text style={styles.ratingLabel}>Taste</Text>
          <ReviewRating value={review.taste} label="taste" />
          <Text style={styles.ratingLabel}>Presentation</Text>
          <ReviewRating value={review.presentation} label="presentation" />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleToggleLike}>
            <Ionicons
              name={hasLiked ? "heart" : "heart-outline"}
              size={28}
              color={hasLiked ? "red" : "#000"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onShowLikes(review.id)}>
            <Text style={styles.likesCount}>{likesCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              onShowComments(review.id, onCommentAdded, onCommentDeleted)
            }
          >
            <Ionicons name="chatbubble-outline" size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              onShowComments(review.id, onCommentAdded, onCommentDeleted)
            }
          >
            <Text style={styles.likesCount}>{comments.length}</Text>
          </TouchableOpacity>
        </View>

        <Link href={`/home/users/${review.profile?.username}`} asChild>
          <TouchableOpacity style={styles.captionContainer}>
            <Text style={styles.username}>
              {review.profile?.username || "Unknown"}
            </Text>
            <Text style={styles.captionText}> {review.comment}</Text>
          </TouchableOpacity>
        </Link>

        {comments.slice(0, 2).map((c) => (
          <View key={c.id} style={styles.commentRow}>
            <Text style={styles.commentUsername}>
              {c.profile?.username || "Unknown"}:
            </Text>
            <Text style={styles.commentText}> {c.body}</Text>
          </View>
        ))}

        {comments.length > 2 && (
          <TouchableOpacity
            onPress={() =>
              onShowComments(review.id, onCommentAdded, onCommentDeleted)
            }
          >
            <Text style={styles.viewAllCommentsText}>
              View all {comments.length} comments
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.timestamp}>
          {formatRelativeDate(review.inserted_at)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageContainer: { width: screenWidth, position: "relative" },
  reviewImage: { width: "100%", height: "100%", resizeMode: "cover" },
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
    fontSize: 22,
    color: "#fff",
    marginBottom: 4,
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
  spiritText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  typeText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  footer: { backgroundColor: "#fff", padding: 10 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  likesCount: { fontWeight: "bold", fontSize: 16, color: "#000" },
  captionContainer: { flexDirection: "row", marginBottom: 5 },
  username: { fontWeight: "bold", fontSize: 16, color: "#000" },
  captionText: { fontSize: 16, color: "#000" },
  timestamp: { fontSize: 12, color: "#999" },
  commentRow: { flexDirection: "row", marginBottom: 4 },
  commentUsername: { fontWeight: "bold", color: "#000" },
  commentText: { color: "#000" },
  viewAllCommentsText: {
    color: "#888",
    fontSize: 14,
    marginBottom: 4,
  },
});
