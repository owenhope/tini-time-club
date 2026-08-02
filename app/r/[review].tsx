import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CommentsSlider from "@/components/CommentsSlider";
import ReviewItem from "@/components/ReviewItem";
import { Button } from "@/components/shared";
import databaseService from "@/services/databaseService";
import type { Review } from "@/types/types";
import { HIT_SLOP, fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import { shareReviewViaSheet } from "@/utils/reviewShare";

export default function SharedReviewScreen() {
  const { review: reviewParam } = useLocalSearchParams<{ review?: string }>();
  const reviewId = Array.isArray(reviewParam) ? reviewParam[0] : reviewParam;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const loadReview = useCallback(async () => {
    if (!reviewId) {
      setError("This review link is missing an id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await databaseService.getReview(reviewId);
      setReview(data);
      setError(null);
    } catch (err) {
      reportError("Error loading shared review:", err);
      setError("We couldn't find that review.");
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(routes.home());
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={goBack}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          Shared review
        </Text>
        <Pressable
          onPress={review ? () => void shareReviewViaSheet(review) : undefined}
          disabled={!review}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Share this review"
          accessibilityState={{ disabled: !review }}
          style={styles.iconButton}
        >
          <Ionicons
            name="share-outline"
            size={22}
            color={review ? colors.text : colors.textMuted}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Review unavailable</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Button
            title="Go to the club"
            onPress={() => router.replace(routes.home())}
          />
        </View>
      ) : review ? (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <ReviewItem
              review={review}
              canDelete={false}
              onShowLikes={() => {}}
              onShowComments={() => setCommentsOpen(true)}
              onCommentAdded={() => {}}
              onCommentDeleted={() => {}}
            />
          </ScrollView>
          {commentsOpen ? (
            <CommentsSlider
              review={review}
              onClose={() => setCommentsOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: {
    flex: 1,
    textAlign: "center" as const,
    color: t.colors.text,
    fontSize: 17,
    fontFamily: fonts.bold,
  },
  content: {
    paddingBottom: t.spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: t.spacing.xl,
    gap: t.spacing.md,
  },
  errorTitle: {
    color: t.colors.text,
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  errorBody: {
    color: t.colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: "center" as const,
  },
}));
