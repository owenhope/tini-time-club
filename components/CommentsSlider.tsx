// CommentsSlider.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Alert, View, Text, TouchableOpacity, FlatList } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/context/profile-context";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { formatRelativeDate } from "@/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import ReportModal from "@/components/ReportModal";
import { Avatar, VerifiedName } from "@/components/shared";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { Review } from "@/types/types";
import { fonts, makeStyles, useTheme } from "@/theme";
import { log, reportError } from "@/utils/log";

const COMMENT_TEXT_COLOR = "#141A17";

interface CommentsSliderProps {
  review: Pick<Review, "id" | "user_id" | "location">;
  onClose: () => void;
  onCommentDeleted?: (reviewId: string, commentId: number) => void;
  onCommentAdded?: (reviewId: string, newComment: any) => void;
}

interface CommentInputFooterProps extends BottomSheetFooterProps {
  onSubmit: (comment: string) => Promise<boolean>;
}

function CommentInputFooter({
  onSubmit,
  ...footerProps
}: CommentInputFooterProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
          { paddingBottom: Math.max(insets.bottom, 12) + 10 },
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
  const openProfile = useOpenProfile();
  const styles = useStyles();
  const { colors } = useTheme();
  const [comments, setComments] = useState<any[]>([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let cancelled = false;
    const loadComments = async () => {
      const data = await databaseService.getComments(review.id);
      if (cancelled) return;
      setComments(data || []);
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 100);
    };
    loadComments();
    return () => {
      cancelled = true;
    };
  }, [review.id]);

  const handleAddComment = useCallback(
    async (comment: string) => {
      if (!profile) return false;

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
    [onCommentAdded, profile, review]
  );

  const deleteComment = async (id: number) => {
    try {
      await databaseService.deleteComment(id, review.id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      onCommentDeleted?.(review.id, id);
    } catch (error) {
      reportError("Error deleting comment:", error);
    }
  };

  const confirmDeleteComment = (id: number) => {
    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteComment(id),
      },
    ]);
  };

  const navigateToUserProfile = (username: string, userId: string) =>
    openProfile(username, userId);

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

  const renderComment = ({ item }: { item: any }) => {
    const username = item.profile?.username || "Unknown";
    const relativeDate = formatRelativeDate(item.inserted_at);
    const isOwnComment = profile?.id === item.user_id;
    const avatarPath = item.profile?.avatar_url || null;

    return (
      <View style={styles.commentRow}>
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
          {isOwnComment ? (
            <TouchableOpacity
              onPress={() => confirmDeleteComment(item.id)}
              style={styles.deleteIcon}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setReportModalVisible(true)}
              style={styles.deleteIcon}
            >
              <Ionicons
                name="flag-outline"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <CommentInputFooter {...props} onSubmit={handleAddComment} />
    ),
    [handleAddComment]
  );

  return (
    <>
      <BottomSheet
        snapPoints={["45%", "85%"]}
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
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyTitle}>Say something</Text>
              <Text style={styles.emptySubtitle}>
                Nobody&rsquo;s weighed in yet. Your move.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      </BottomSheet>
      <ReportModal
        visible={reportModalVisible}
        title="Report Comment"
        onClose={() => setReportModalVisible(false)}
        onSelect={(option) => log("report pressed", option)}
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
    paddingBottom: 88,
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
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.colors.textMuted,
    textAlign: "center" as const,
    paddingHorizontal: t.spacing.xxl,
  },
  commentRow: { marginBottom: t.spacing.lg },
  commentOuter: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
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
  username: { fontFamily: fonts.bold, color: COMMENT_TEXT_COLOR },
  timestamp: {
    color: t.colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  commentBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: COMMENT_TEXT_COLOR,
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
    color: t.colors.text,
  },
  sendButtonHit: {
    minHeight: 44,
    minWidth: 50,
    alignItems: "flex-end" as const,
    justifyContent: "center" as const,
  },
  sendButton: { color: t.colors.text, fontFamily: fonts.bold },
  deleteIcon: { paddingLeft: t.spacing.sm, paddingTop: 2 },
}));
