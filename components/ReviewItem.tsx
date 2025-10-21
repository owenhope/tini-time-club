import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Animated,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { supabase } from "@/utils/supabase";
import { isDevelopmentMode } from "@/utils/helpers";
import imageCache from "@/utils/imageCache";
import { Avatar } from "@/components/shared";
import { Review } from "@/types/types";
import ReviewRating from "./ReviewRating";
import * as Haptics from "expo-haptics";
import { NOTIFICATION_TYPES } from "@/utils/consts";
import { stripNameFromAddress, formatRelativeDate } from "@/utils/helpers";
import ReportModal from "@/components/ReportModal";

// Constants
const SCREEN_WIDTH = Dimensions.get("window").width;
const DOUBLE_TAP_DELAY = 300;
const ANIMATION_DURATION = 300;

const COLORS = {
  white: "#fff",
  black: "#000",
  red: "red",
  gray: "#999",
  lightGray: "#888",
  overlay: "rgba(0,0,0,0.3)",
} as const;

const ICON_SIZES = {
  small: 20,
  medium: 28,
} as const;

// Expandable Text Component for Instagram-style captions
const ExpandableText = ({
  username,
  text,
  maxLines = 2,
}: {
  username?: string;
  text: string;
  maxLines?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowMore, setShouldShowMore] = useState(false);

  const onTextLayout = useCallback(
    (event: any) => {
      const { lines } = event.nativeEvent;
      setShouldShowMore(lines.length > maxLines);
    },
    [maxLines]
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  return (
    <Text style={styles.expandableText}>
      {username && <Text style={styles.username}>{username} </Text>}
      <Text
        numberOfLines={isExpanded ? undefined : maxLines}
        onTextLayout={onTextLayout}
      >
        {text}
      </Text>
      {shouldShowMore && (
        <Text>
          {" "}
          <Text style={styles.moreText} onPress={toggleExpanded}>
            {isExpanded ? "less" : "more"}
          </Text>
        </Text>
      )}
    </Text>
  );
};

interface ReviewItemProps {
  review: Review & { _commentPatch?: any };
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
  hideHeader?: boolean;
  hideFooter?: boolean;
  previewMode?: boolean;
}

// Custom hook for avatar loading
const useAvatar = (avatarUrl: string | null | undefined) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!avatarUrl) {
        setUrl(null);
        return;
      }

      setLoading(true);
      try {
        const avatarUrlResult = await imageCache.getAvatarUrl(avatarUrl);
        setUrl(avatarUrlResult);
      } catch (error) {
        console.error("Error loading avatar:", error);
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };

    loadAvatar();
  }, [avatarUrl]);

  return { url, loading };
};

// Custom hook for likes management
const useLikes = (reviewId: string, userId: string | null) => {
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchLikes = useCallback(async () => {
    try {
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("review_id", reviewId);
      setLikesCount(count || 0);

      if (userId) {
        const { data } = await supabase
          .from("likes")
          .select("*")
          .eq("review_id", reviewId)
          .eq("user_id", userId)
          .maybeSingle();
        setHasLiked(!!data);
      }
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  }, [reviewId, userId]);

  const toggleLike = useCallback(async () => {
    if (!userId || loading) return;

    setLoading(true);
    try {
      if (hasLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("review_id", reviewId)
          .eq("user_id", userId);
        setHasLiked(false);
        setLikesCount((prev) => prev - 1);
      } else {
        await supabase
          .from("likes")
          .upsert([{ review_id: reviewId, user_id: userId }]);
        setHasLiked(true);
        setLikesCount((prev) => prev + 1);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLoading(false);
    }
  }, [reviewId, userId, hasLiked, loading]);

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  return { hasLiked, likesCount, toggleLike, loading };
};

// Custom hook for comments management
const useComments = (reviewId: string) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("comments")
        .select("*, profile:profiles(id, username, avatar_url)")
        .eq("review_id", reviewId)
        .order("inserted_at", { ascending: false });
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  const addComment = useCallback((newComment: any) => {
    setComments((prev) => [newComment, ...prev]);
  }, []);

  const removeComment = useCallback((commentId: number) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return { comments, loading, addComment, removeComment };
};

// Reusable UI Components
const AvatarWrapper = memo(
  ({
    avatarUrl,
    username,
    isOwnReview,
  }: {
    avatarUrl: string | null;
    username?: string;
    isOwnReview: boolean;
  }) => {
    const router = useRouter();

    const handlePress = useCallback(() => {
      if (!isOwnReview && username) {
        router.push(`/home/users/${username}`);
      }
    }, [isOwnReview, username, router]);

    const content = (
      <View style={styles.headerProfile}>
        <Avatar
          avatarPath={avatarUrl}
          username={username}
          size={40}
          style={styles.avatar}
        />
        <Text style={styles.headerUsername}>{username || "Unknown"}</Text>
      </View>
    );

    if (isOwnReview) {
      return content;
    }

    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
);

const ActionButton = memo(
  ({
    onPress,
    icon,
    color = COLORS.black,
  }: {
    onPress: () => void;
    icon: string;
    color?: string;
  }) => (
    <TouchableOpacity onPress={onPress} style={styles.actionButton}>
      <Ionicons name={icon as any} size={ICON_SIZES.small} color={color} />
    </TouchableOpacity>
  )
);

const MenuModal = memo(
  ({
    visible,
    onClose,
    onDelete,
    onReport,
    isOwnReview,
  }: {
    visible: boolean;
    onClose: () => void;
    onDelete?: () => void;
    onReport?: () => void;
    isOwnReview: boolean;
  }) => (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.menuModal}>
          {isOwnReview ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onDelete?.();
              }}
            >
              <Ionicons name="trash" size={20} color="#ff4444" />
              <Text style={[styles.menuItemText, { color: "#ff4444" }]}>
                Delete
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onReport?.();
              }}
            >
              <Ionicons name="flag" size={20} color="#ff4444" />
              <Text style={[styles.menuItemText, { color: "#ff4444" }]}>
                Report
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  )
);

const LikeButton = memo(
  ({
    hasLiked,
    onPress,
    disabled = false,
  }: {
    hasLiked: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Ionicons
        name={hasLiked ? "heart" : "heart-outline"}
        size={ICON_SIZES.medium}
        color={hasLiked ? COLORS.red : COLORS.black}
      />
    </TouchableOpacity>
  )
);

const CommentButton = memo(
  ({ onPress, count }: { onPress: () => void; count: number }) => (
    <TouchableOpacity onPress={onPress}>
      <Ionicons name="chatbubble-outline" size={ICON_SIZES.medium} />
    </TouchableOpacity>
  )
);

const CommentCount = memo(({ count }: { count: number }) => (
  <Text style={styles.likesCount}>{count}</Text>
));

const ReviewOverlay = memo(
  ({
    review,
    overlayOpacity,
  }: {
    review: Review;
    overlayOpacity: Animated.Value;
  }) => (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      <Link href={`/home/locations/${review.location?.id}`} asChild>
        <Text style={styles.locationName}>
          {review.location?.name || "N/A"}
        </Text>
      </Link>
      {review.location?.address && (
        <Text style={styles.locationAddress}>
          {stripNameFromAddress(review.location.name, review.location.address)}
        </Text>
      )}
      <Text style={styles.spiritText}>
        {review.spirit?.name || "N/A"}, {review.type?.name || "N/A"}
      </Text>
      <Text style={styles.ratingLabel}>Taste</Text>
      <ReviewRating value={review.taste} label="taste" />
      <Text style={styles.ratingLabel}>Presentation</Text>
      <ReviewRating value={review.presentation} label="presentation" />
    </Animated.View>
  )
);

const ReviewFooter = memo(
  ({
    review,
    hasLiked,
    likesCount,
    comments,
    onToggleLike,
    onShowLikes,
    onShowComments,
    onCommentAdded,
    onCommentDeleted,
  }: {
    review: Review;
    hasLiked: boolean;
    likesCount: number;
    comments: any[];
    onToggleLike: () => void;
    onShowLikes: (reviewId: string) => void;
    onShowComments: (
      reviewId: string,
      onCommentAdded: any,
      onCommentDeleted: any
    ) => void;
    onCommentAdded: (reviewId: string, newComment: any) => void;
    onCommentDeleted: (reviewId: string, commentId: number) => void;
  }) => {
    const handleShowComments = useCallback(() => {
      onShowComments(review.id, onCommentAdded, onCommentDeleted);
    }, [review.id, onShowComments, onCommentAdded, onCommentDeleted]);

    const handleShowLikes = useCallback(() => {
      onShowLikes(review.id);
    }, [review.id, onShowLikes]);

    return (
      <View style={styles.footer}>
        <View style={styles.actionRow}>
          <LikeButton hasLiked={hasLiked} onPress={onToggleLike} />
          <TouchableOpacity onPress={handleShowLikes}>
            <CommentCount count={likesCount} />
          </TouchableOpacity>
          <CommentButton onPress={handleShowComments} count={comments.length} />
          <TouchableOpacity onPress={handleShowComments}>
            <CommentCount count={comments.length} />
          </TouchableOpacity>
        </View>

        <Link href={`/home/users/${review.profile?.username}`} asChild>
          <TouchableOpacity style={styles.captionContainer}>
            <ExpandableText
              username={review.profile?.username || "Unknown"}
              text={review.comment}
            />
          </TouchableOpacity>
        </Link>

        {comments.slice(0, 2).map((c) => (
          <View key={c.id} style={styles.commentRow}>
            <ExpandableText
              username={c.profile?.username || "Unknown"}
              text={c.body}
            />
          </View>
        ))}

        {comments.length > 2 && (
          <TouchableOpacity onPress={handleShowComments}>
            <Text style={styles.viewAllCommentsText}>
              View all {comments.length} comments
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.timestamp}>
          {formatRelativeDate(review.inserted_at)}
        </Text>
      </View>
    );
  }
);

const ReviewItem = memo(
  ({
    review,
    canDelete,
    onDelete,
    onShowLikes,
    onShowComments,
    onCommentAdded,
    onCommentDeleted,
    hideHeader = false,
    hideFooter = false,
    previewMode = false,
  }: ReviewItemProps) => {
    const { profile } = useProfile();
    const overlayOpacity = useRef(new Animated.Value(1)).current;
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [menuModalVisible, setMenuModalVisible] = useState(false);
    const lastTapRef = useRef<number>(0);
    const isOwnReview = String(profile?.id) === String(review.profile?.id);

    // Use custom hooks for data management
    const { hasLiked, likesCount, toggleLike } = useLikes(
      review.id,
      profile?.id || null
    );
    const { comments, addComment, removeComment } = useComments(review.id);

    // Handle comment patches
    useEffect(() => {
      if (review._commentPatch) {
        if (review._commentPatch.action === "add") {
          addComment(review._commentPatch.data);
        } else if (review._commentPatch.action === "delete") {
          removeComment(review._commentPatch.id);
        }
      }
    }, [review._commentPatch, addComment, removeComment]);

    // Enhanced like handler with notifications
    const handleToggleLike = useCallback(async () => {
      if (!profile) return;

      const wasLiked = hasLiked;
      await toggleLike();

      // Send notification if user just liked someone else's review
      if (!wasLiked && review.user_id && profile.id !== review.user_id) {
        // Only send notifications if not in development mode
        if (!isDevelopmentMode()) {
          const notificationBody = `${
            profile.username
          } liked your review from ${
            review.location?.name || "an unknown location"
          }`;
          try {
            await supabase.from("notifications").insert({
              user_id: review.user_id,
              body: notificationBody,
              type: NOTIFICATION_TYPES.USER,
            });
          } catch (error) {
            console.error("Error sending notification:", error);
          }
        } else {
          console.log("🚧 Development mode - skipping like notification");
        }
      }
    }, [profile, hasLiked, toggleLike, review.user_id, review.location?.name]);

    const handlePress = useCallback(() => {
      const now = Date.now();
      if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        handleToggleLike();
      }
      lastTapRef.current = now;
    }, [handleToggleLike]);

    const animateOpacity = useCallback(
      (toValue: number) => {
        Animated.timing(overlayOpacity, {
          toValue,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }).start();
      },
      [overlayOpacity]
    );

    const handleLongPress = useCallback(
      () => animateOpacity(0),
      [animateOpacity]
    );
    const handlePressOut = useCallback(
      () => animateOpacity(1),
      [animateOpacity]
    );

    const handleReportSubmit = useCallback(
      async (reason: string, customReason?: string) => {
        if (!profile) return;

        try {
          const reportData = {
            reporter_id: profile.id,
            review_id: review.id,
            creator_id: review.profile?.id,
            reason: customReason || reason,
            created_at: new Date().toISOString(),
          };

          const { error } = await supabase.from("reports").insert([reportData]);

          if (error) {
            console.error("Error submitting report:", error);
            Alert.alert("Error", "Failed to submit report. Please try again.");
          } else {
            Alert.alert(
              "Report Submitted",
              "Thank you for your report. We will review it shortly."
            );
          }
        } catch (error) {
          console.error("Unexpected error submitting report:", error);
          Alert.alert(
            "Error",
            "An unexpected error occurred. Please try again."
          );
        }
      },
      [profile, review.id, review.profile?.id]
    );

    if (previewMode) {
      return (
        <View style={styles.previewContainer}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: review.image_url }}
              style={styles.reviewImage}
            />
            <ReviewOverlay review={review} overlayOpacity={overlayOpacity} />
          </View>

          <ReviewFooter
            review={review}
            hasLiked={false}
            likesCount={0}
            comments={[]}
            onToggleLike={() => {}}
            onShowLikes={() => {}}
            onShowComments={() => {}}
            onCommentAdded={() => {}}
            onCommentDeleted={() => {}}
          />
        </View>
      );
    }

    return (
      <>
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
        >
          {!hideHeader && (
            <View style={styles.header}>
              <AvatarWrapper
                avatarUrl={review.profile?.avatar_url || null}
                username={review.profile?.username}
                isOwnReview={isOwnReview}
              />
              <View style={styles.headerActions}>
                <ActionButton
                  onPress={() => setMenuModalVisible(true)}
                  icon="ellipsis-horizontal"
                />
              </View>
            </View>
          )}

          <View style={styles.imageContainer}>
            <Image
              source={{ uri: review.image_url }}
              style={styles.reviewImage}
            />
            <ReviewOverlay review={review} overlayOpacity={overlayOpacity} />
          </View>

          {!hideFooter && (
            <ReviewFooter
              review={review}
              hasLiked={hasLiked}
              likesCount={likesCount}
              comments={comments}
              onToggleLike={handleToggleLike}
              onShowLikes={onShowLikes}
              onShowComments={onShowComments}
              onCommentAdded={onCommentAdded}
              onCommentDeleted={onCommentDeleted}
            />
          )}
        </Pressable>

        <MenuModal
          visible={menuModalVisible}
          onClose={() => setMenuModalVisible(false)}
          onDelete={onDelete}
          onReport={() => setReportModalVisible(true)}
          isOwnReview={isOwnReview}
        />

        <ReportModal
          visible={reportModalVisible}
          title="Report Review"
          onClose={() => setReportModalVisible(false)}
          onSelect={handleReportSubmit}
        />
      </>
    );
  }
);

export default ReviewItem;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  headerUsername: {
    fontWeight: "bold",
    fontSize: 16,
    color: COLORS.black,
  },
  headerProfile: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#336654",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH, // Instagram-style 1:1 aspect ratio
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
    flexDirection: "row",
    gap: 8,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    padding: 20,
    justifyContent: "flex-end",
  },
  locationName: {
    fontWeight: "bold",
    fontSize: 22,
    color: COLORS.white,
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
    color: COLORS.white,
  },
  spiritText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
    textTransform: "capitalize",
  },
  typeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
    textTransform: "capitalize",
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  likesCount: {
    fontWeight: "bold",
    fontSize: 16,
    color: COLORS.black,
  },
  captionContainer: {
    marginBottom: 5,
  },
  username: {
    fontWeight: "bold",
    fontSize: 16,
    color: COLORS.black,
  },
  expandableText: {
    fontSize: 16,
    color: COLORS.black,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.gray,
  },
  commentRow: {
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: "bold",
    color: COLORS.black,
  },
  moreText: {
    color: COLORS.lightGray,
    fontSize: 14,
    marginTop: 2,
  },
  viewAllCommentsText: {
    color: COLORS.lightGray,
    fontSize: 14,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuModal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  previewContainer: {
    backgroundColor: COLORS.white,
  },
  previewFooter: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  previewUsername: {
    fontWeight: "bold",
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 4,
  },
  previewComment: {
    fontSize: 14,
    color: COLORS.black,
    lineHeight: 18,
  },
});
