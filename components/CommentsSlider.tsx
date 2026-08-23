// CommentsSlider.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { useProfile } from "@/context/profile-context";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { formatRelativeDate } from "@/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import ReportModal from "@/components/ReportModal";
import { Avatar, VerifiedName } from "@/components/shared";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { Comment, Review } from "@/types/types";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";
import { useMembership } from "@/context/membership-context";
import {
  getCommentPage,
  type CommentCursor,
} from "@/services/commentPageService";

const COMMENT_SHEET_LIKE_ICON_SIZE = 16;
const COMMENT_SHEET_RESTING_HEIGHT = 430;
const COMMENT_INPUT_BOTTOM_PADDING = 22;
const COMMENT_LIST_FOOTER_CLEARANCE = 88;

interface CommentsSliderProps {
  review: Pick<Review, "id" | "user_id" | "location">;
  onClose: () => void;
  onCommentDeleted?: (reviewId: string, commentId: number) => void;
  onCommentAdded?: (reviewId: string, newComment: any) => void;
}

interface CommentInputFooterProps extends BottomSheetFooterProps {
  onSubmit: (comment: string) => Promise<boolean>;
  bottomContentInset: number;
}

function CommentInputFooter({
  onSubmit,
  bottomContentInset,
  ...footerProps
}: CommentInputFooterProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [commentText, setCommentText] = useState("");

  const handleSubmit = useCallback(async () => {
    const comment = commentText.trim();
    if (!comment) return;

    if (await onSubmit(comment)) {
      setCommentText("");
    }
  }, [commentText, onSubmit]);

  return (
    <BottomSheetFooter {...footerProps}>
      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom:
              Math.max(bottomContentInset, 12) + COMMENT_INPUT_BOTTOM_PADDING,
          },
        ]}
      >
        <BottomSheetTextInput
          placeholder="Add a comment..."
          placeholderTextColor={colors.textMuted}
          value={commentText}
          onChangeText={setCommentText}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity onPress={handleSubmit} style={styles.sendButtonHit}>
          <Text style={styles.sendButton}>Post</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetFooter>
  );
}

export default function CommentsSlider({
  review,
  onClose,
  onCommentDeleted,
  onCommentAdded,
}: CommentsSliderProps) {
  const { profile } = useProfile();
  const { requireMembership } = useMembership();
  const openProfile = useOpenProfile();
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const bottomContentInset = useNativeTabBarContentInset();
  const snapPoints = React.useMemo(
    () => [COMMENT_SHEET_RESTING_HEIGHT + bottomContentInset, "85%"],
    [bottomContentInset]
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingEarlierComments, setLoadingEarlierComments] = useState(false);
  const nextCommentCursorRef = useRef<CommentCursor | null>(null);
  const loadingEarlierCommentsRef = useRef(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const listRef = useRef<FlatList>(null);
  const pendingLikes = useRef(new Set<number>());

  useEffect(() => {
    let cancelled = false;
    const loadComments = async () => {
      try {
        const page = await getCommentPage({
          reviewId: review.id,
          viewerId: profile?.id,
          limit: 20,
        });
        if (cancelled) return;
        setComments(page.comments);
        nextCommentCursorRef.current = page.nextCursor;
        setHasMoreComments(page.hasMore);
        setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: false });
        }, 100);
      } catch (error) {
        reportError("Error loading comments:", error);
      }
    };
    loadComments();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, review.id]);

  const loadEarlierComments = useCallback(async () => {
    if (
      !hasMoreComments ||
      !nextCommentCursorRef.current ||
      loadingEarlierCommentsRef.current
    ) {
      return;
    }

    loadingEarlierCommentsRef.current = true;
    setLoadingEarlierComments(true);
    try {
      const page = await getCommentPage({
        reviewId: review.id,
        viewerId: profile?.id,
        cursor: nextCommentCursorRef.current,
        limit: 20,
      });
      nextCommentCursorRef.current = page.nextCursor;
      setHasMoreComments(page.hasMore);
      setComments((current) => {
        const loaded = new Set(current.map((comment) => comment.id));
        return [
          ...page.comments.filter((comment) => !loaded.has(comment.id)),
          ...current,
        ];
      });
    } catch (error) {
      reportError("Error loading earlier comments:", error);
    } finally {
      loadingEarlierCommentsRef.current = false;
      setLoadingEarlierComments(false);
    }
  }, [hasMoreComments, profile, review.id]);

  const handleAddComment = useCallback(
    async (comment: string) => {
      if (!profile) {
        requireMembership("comment");
        return false;
      }

      try {
        const data = await databaseService.createComment({
          review_id: review.id,
          user_id: profile.id,
          body: comment,
        });

        setComments((prev) => [...prev, data]);
        listRef.current?.scrollToEnd({ animated: true });
        onCommentAdded?.(review.id, data);

        // Track comment event
        AnalyticService.capture("comment_on_review", {
          reviewId: review.id,
          commentId: data.id,
          locationId: review.location?.id,
          locationName: review.location?.name,
        });

        return true;
      } catch (error) {
        reportError("Error adding comment:", error);
        return false;
      }
    },
    [onCommentAdded, profile, requireMembership, review]
  );

  const deleteComment = useCallback(
    async (id: number) => {
      try {
        await databaseService.deleteComment(id, review.id);
        setComments((prev) => prev.filter((c) => c.id !== id));
        onCommentDeleted?.(review.id, id);
      } catch (error) {
        reportError("Error deleting comment:", error);
      }
    },
    [onCommentDeleted, review.id]
  );

  const confirmDeleteComment = useCallback(
    (id: number) => {
      Alert.alert("Delete Comment", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteComment(id),
        },
      ]);
    },
    [deleteComment]
  );

  const toggleCommentLike = useCallback(
    async (comment: Comment) => {
      if (!profile) {
        requireMembership("like-comment");
        return;
      }
      if (pendingLikes.current.has(comment.id)) return;

      const wasLiked = Boolean(comment.has_liked);
      const previousCount = comment.likes_count ?? 0;
      const nextLiked = !wasLiked;
      pendingLikes.current.add(comment.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                has_liked: nextLiked,
                likes_count: Math.max(0, previousCount + (nextLiked ? 1 : -1)),
              }
            : item
        )
      );

      try {
        await databaseService.setCommentLiked(
          comment.id,
          profile.id,
          nextLiked,
          review.id
        );
        if (nextLiked) {
          AnalyticService.capture("like_comment", {
            reviewId: review.id,
            commentId: comment.id,
            locationId: review.location?.id,
            locationName: review.location?.name,
          });
        }
      } catch (error) {
        setComments((current) =>
          current.map((item) =>
            item.id === comment.id
              ? {
                  ...item,
                  has_liked: wasLiked,
                  likes_count: previousCount,
                }
              : item
          )
        );
        reportError("Error toggling comment like:", error);
      } finally {
        pendingLikes.current.delete(comment.id);
      }
    },
    [profile, requireMembership, review]
  );

  const openReport = useCallback((comment: Comment) => {
    setSelectedComment(comment);
    setReportModalVisible(true);
  }, []);

  const showCommentActions = useCallback(
    (comment: Comment) => {
      if (!profile) {
        requireMembership("report");
        return;
      }
      const isOwnComment = profile?.id === comment.user_id;
      const actionLabel = isOwnComment ? "Delete Comment" : "Report Comment";
      const runAction = () =>
        isOwnComment ? confirmDeleteComment(comment.id) : openReport(comment);

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["Cancel", actionLabel],
            cancelButtonIndex: 0,
            destructiveButtonIndex: isOwnComment ? 1 : undefined,
            userInterfaceStyle: isDark ? "dark" : "light",
          },
          (buttonIndex) => {
            if (buttonIndex === 1) runAction();
          }
        );
        return;
      }

      Alert.alert("Comment Options", undefined, [
        { text: "Cancel", style: "cancel" },
        {
          text: actionLabel,
          style: isOwnComment ? "destructive" : "default",
          onPress: runAction,
        },
      ]);
    },
    [confirmDeleteComment, isDark, openReport, profile, requireMembership]
  );

  const handleReportSubmit = useCallback(
    async (reason: string, customReason?: string) => {
      if (!selectedComment) return;

      try {
        const result = await databaseService.reportComment(
          selectedComment.id,
          customReason || reason
        );
        AnalyticService.capture("report", {
          reviewId: review.id,
          commentId: selectedComment.id,
          reason: customReason || reason,
          targetUserId: selectedComment.user_id,
        });
        Alert.alert(
          result === "created" ? "Report Submitted" : "Already Reported",
          result === "created"
            ? "Thanks. We’ll review this comment."
            : "You already reported this comment."
        );
      } catch (error) {
        reportError("Error reporting comment:", error);
        Alert.alert("Error", "Failed to submit report. Please try again.");
      }
    },
    [review.id, selectedComment]
  );

  const navigateToUserProfile = (username: string, userId?: string) => {
    if (userId) openProfile(username, userId);
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const renderComment = ({ item }: { item: Comment }) => {
    const username = item.profile?.username || "Unknown";
    const relativeDate = formatRelativeDate(item.inserted_at);
    const avatarPath = item.profile?.avatar_url || null;
    const likesCount = item.likes_count ?? 0;
    const hasLiked = Boolean(item.has_liked);

    return (
      <Pressable
        style={styles.commentRow}
        onLongPress={() => showCommentActions(item)}
        delayLongPress={350}
        accessibilityHint="Long press for comment options"
      >
        <View style={styles.commentOuter}>
          <View style={styles.commentInner}>
            <TouchableOpacity
              onPress={() => navigateToUserProfile(username, item.user_id)}
            >
              <Avatar
                avatarPath={avatarPath}
                username={username}
                size={32}
                reviewCount={item.profile?.review_count}
              />
            </TouchableOpacity>
            <View style={styles.commentContent}>
              <View style={styles.commentHeaderRow}>
                <TouchableOpacity
                  onPress={() => navigateToUserProfile(username, item.user_id)}
                  activeOpacity={0.7}
                >
                  <VerifiedName
                    name={username}
                    isVerified={item.profile?.is_verified}
                    badgeSize={14}
                    textStyle={styles.username}
                  />
                </TouchableOpacity>
                <Text style={styles.timestamp}> · {relativeDate}</Text>
              </View>
              <Text style={styles.commentBody}>{item.body}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => void toggleCommentLike(item)}
            style={styles.likeButton}
            accessibilityRole="button"
            accessibilityLabel={hasLiked ? "Unlike comment" : "Like comment"}
            accessibilityState={{ selected: hasLiked }}
          >
            <Ionicons
              name={hasLiked ? "heart" : "heart-outline"}
              size={COMMENT_SHEET_LIKE_ICON_SIZE}
              color={hasLiked ? colors.like : colors.textMuted}
            />
            {likesCount > 0 ? (
              <Text
                style={[styles.likeCount, hasLiked && styles.likeCountActive]}
              >
                {likesCount}
              </Text>
            ) : null}
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <CommentInputFooter
        {...props}
        bottomContentInset={bottomContentInset}
        onSubmit={handleAddComment}
      />
    ),
    [bottomContentInset, handleAddComment]
  );

  return (
    <>
      <BottomSheet
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        onClose={onClose}
        // The sheet grows to its tall snap point while typing, instead of the
        // old hand-rolled height jump.
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
        style={styles.sheetShadow}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetFlatList
          ref={listRef as any}
          data={comments}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderComment}
          ListHeaderComponent={
            hasMoreComments ? (
              <TouchableOpacity
                onPress={() => void loadEarlierComments()}
                disabled={loadingEarlierComments}
                style={styles.loadEarlierButton}
                accessibilityRole="button"
                accessibilityLabel="Load earlier comments"
              >
                <Text style={styles.loadEarlierText}>
                  {loadingEarlierComments ? "Loading…" : "Earlier comments"}
                </Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyTitle}>Say something</Text>
              <Text style={styles.emptySubtitle}>
                Nobody&rsquo;s weighed in yet. Your move.
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: COMMENT_LIST_FOOTER_CLEARANCE + bottomContentInset,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      </BottomSheet>
      <ReportModal
        visible={reportModalVisible}
        title="Report Comment"
        onClose={() => {
          setReportModalVisible(false);
          setSelectedComment(null);
        }}
        onSelect={(option, customReason) =>
          void handleReportSubmit(option, customReason)
        }
      />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  sheetShadow: {
    ...t.elevation.raised,
    shadowOffset: { width: 0, height: -2 },
  },
  sheetBackground: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: t.colors.borderStrong,
  },
  listContent: {
    padding: t.spacing.lg,
    // Keep the last comment clear of the pinned input footer.
    paddingBottom: COMMENT_LIST_FOOTER_CLEARANCE,
  },
  loadEarlierButton: {
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: t.spacing.sm,
  },
  loadEarlierText: {
    ...t.typography.bodyStrong,
    color: t.colors.textSecondary,
  },
  // Fixed offset rather than flex centering: the sheet's scroll container is
  // sized to the tallest snap point, so "centered" would land off-screen at
  // the resting snap.
  emptyStateContainer: {
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.sheetGutter,
    paddingTop: t.spacing.xxl * 2,
  },
  // Was all-caps; the system reserves uppercase for tiny utility type and
  // wants an empty state to read as a nudge, not a shouted instruction.
  emptyTitle: {
    ...t.typography.title,
    color: t.colors.text,
    marginBottom: t.spacing.sm,
  },
  emptySubtitle: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    textAlign: "center" as const,
    paddingHorizontal: t.spacing.xxl,
  },
  commentRow: { marginBottom: t.spacing.md },
  commentOuter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  commentInner: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    flex: 1,
    gap: t.spacing.md,
  },
  commentContent: { flex: 1 },
  commentHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    marginBottom: 2,
    flexWrap: "wrap" as const,
  },
  username: { ...t.typography.bodyStrong, color: t.colors.usernameText },
  timestamp: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  commentBody: {
    ...t.typography.body,
    color: t.colors.postText,
  },
  inputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.sheetGutter,
    paddingTop: t.spacing.md,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderColor: t.colors.border,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.lg,
    marginRight: t.spacing.sm,
    color: t.colors.inputText,
  },
  sendButtonHit: {
    minHeight: 44,
    minWidth: 50,
    alignItems: "flex-end" as const,
    justifyContent: "center" as const,
  },
  sendButton: { ...t.typography.bodyStrong, color: t.colors.text },
  likeButton: {
    minWidth: 40,
    minHeight: 34,
    paddingLeft: t.spacing.sm,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    gap: 1,
  },
  likeCount: {
    ...t.typography.label,
    minWidth: 8,
    color: t.colors.textMuted,
    textAlign: "center" as const,
  },
  likeCountActive: { color: t.colors.like },
}));
