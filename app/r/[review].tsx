import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import CommentsSlider from "@/components/CommentsSlider";
import AppHeader from "@/components/nav/AppHeader";
import ReviewItem from "@/components/ReviewItem";
import { Button } from "@/components/shared";
import databaseService from "@/services/databaseService";
import type { Review } from "@/types/types";
import { fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import { shareReviewViaSheet } from "@/utils/reviewShare";

export default function SharedReviewScreen() {
  const { review: reviewParam } = useLocalSearchParams<{ review?: string }>();
  const reviewId = Array.isArray(reviewParam) ? reviewParam[0] : reviewParam;
  const router = useRouter();
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
      {/* Variant B: a deep link lands here on one card, and the photo the
          card owns is the card's, not the header's. */}
      <AppHeader
        variant="compact"
        title="Shared review"
        onBack={goBack}
        actions={
          review
            ? [
                {
                  icon: "share-outline",
                  onPress: () => void shareReviewViaSheet(review),
                  accessibilityLabel: "Share this review",
                },
              ]
            : []
        }
      />

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
