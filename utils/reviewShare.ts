import { Alert, Linking, Platform, Share } from "react-native";
import type { Review } from "@/types/types";
import { warn } from "@/utils/log";
import { supabase } from "@/utils/supabase";
import { TTC_WEB_ORIGIN } from "@/utils/shareUrls";

export { TTC_WEB_ORIGIN } from "@/utils/shareUrls";

export const publicReviewUrl = (reviewId: string | number) =>
  `${TTC_WEB_ORIGIN.replace(/\/$/, "")}/r/${encodeURIComponent(String(reviewId))}`;

export type ReviewShareChannel =
  | "sheet"
  | "share_link"
  | "email"
  | "instagram"
  | "instagram_story"
  | "instagram_post";

export const logReviewShare = async (
  reviewId: string | number,
  channel: ReviewShareChannel,
  outcome: string
) => {
  const numericReviewId = Number(reviewId);
  if (!Number.isFinite(numericReviewId)) return;

  const { error } = await supabase.rpc("log_review_share", {
    p_review_id: numericReviewId,
    p_channel: channel,
    p_outcome: outcome,
  });
  if (error) warn("Review share analytics failed:", error);
};

export const reviewShareText = (review: Review) =>
  review.profile?.username
    ? `Check out ${review.profile.username}'s review on Tini Time Club.`
    : "Check out this review on Tini Time Club.";

export const shareReviewViaSheet = async (
  review: Review,
  channel: ReviewShareChannel = "sheet"
) => {
  const url = publicReviewUrl(review.id);
  const text = reviewShareText(review);
  const content =
    Platform.OS === "ios"
      ? {
          title: "Tini Time Club review",
          message: text,
          url,
        }
      : {
          title: "Tini Time Club review",
          message: `${text}\n\n${url}`,
        };

  const result = await Share.share(content);
  await logReviewShare(
    review.id,
    channel,
    result.action === Share.sharedAction ? "shared" : "dismissed"
  );
};

export const shareReviewViaEmail = async (review: Review) => {
  const url = publicReviewUrl(review.id);
  const subject = `Tini Time Club review at ${review.location?.name ?? "a Martini spot"}`;
  const body = `${reviewShareText(review)}\n\n${url}`;
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const canOpen = await Linking.canOpenURL(mailto);
  if (!canOpen) {
    await shareReviewViaSheet(review);
    return;
  }
  await Linking.openURL(mailto);
  await logReviewShare(review.id, "email", "opened");
};

export const shareReviewViaInstagram = async (review: Review) => {
  try {
    const instagramUrl = "instagram://app";
    if (await Linking.canOpenURL(instagramUrl)) {
      Alert.alert(
        "Share to Instagram",
        "Instagram does not accept review links directly from this app yet. Open Instagram, then use More to share the public review link.",
        [
          { text: "More", onPress: () => void shareReviewViaSheet(review) },
          {
            text: "Open Instagram",
            onPress: () => {
              void Linking.openURL(instagramUrl);
              void logReviewShare(review.id, "instagram", "opened");
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
  } catch (error) {
    warn("Instagram URL check failed:", error);
  }

  await shareReviewViaSheet(review);
};
