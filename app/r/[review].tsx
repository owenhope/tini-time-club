import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import CommentsSlider from "@/components/CommentsSlider";
import AppHeader from "@/components/nav/AppHeader";
import ReviewItem from "@/components/ReviewItem";
import { AppText, Button } from "@/components/shared";
import databaseService from "@/services/databaseService";
import type { Review } from "@/types/types";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import { useReviewShareMenu } from "@/hooks/useReviewShareMenu";
import { isScreenshotSeed } from "@/utils/screenshotMode";
import { useProfile } from "@/context/profile-context";

export default function SharedReviewScreen() {
  const {
    review: reviewParam,
    screenshotSeed,
    comments,
    comment,
  } = useLocalSearchParams<{
    review?: string;
    screenshotSeed?: string;
    comments?: string;
    comment?: string;
  }>();
  const reviewId = Array.isArray(reviewParam) ? reviewParam[0] : reviewParam;
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const viewerId = profile?.id;
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(
    () => comments === "1" || isScreenshotSeed(screenshotSeed, "comments")
  );

  const shareReview = useReviewShareMenu(review);

  const loadReview = useCallback(async () => {
    if (!reviewId) {
      setError("This review link is missing an id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await databaseService.getReview(reviewId, viewerId);
      setReview(data);
      setError(null);
    } catch (err) {
      reportError("Error loading shared review:", err);
      setError("We couldn't find that review.");
    } finally {
      setLoading(false);
    }
  }, [reviewId, viewerId]);

  useEffect(() => {
    // The route parameter owns the shared review's asynchronous snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <AppHeader
        variant="media"
        title="Review"
        meta={
          review
            ? `From ${review.profile?.username ?? "the club"}`
            : "Shared review"
        }
        ground="brand"
        onBack={goBack}
        actions={
          review
            ? [
                {
                  icon: "share-outline",
                  onPress: shareReview,
                  accessibilityLabel: "Share this review",
                },
              ]
            : []
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <AppText variant="bodyStrong" tone="accent">
            Loading review...
          </AppText>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppText variant="heading" tone="default" style={styles.centerText}>
            Review unavailable
          </AppText>
          <AppText variant="body" tone="secondary" style={styles.centerText}>
            {error}
          </AppText>
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
              initialCommentId={Array.isArray(comment) ? comment[0] : comment}
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
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: t.spacing.xl,
    gap: t.spacing.md,
  },
  centerText: {
    textAlign: "center" as const,
  },
}));
