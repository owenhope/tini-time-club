import { Alert } from "react-native";
import type { Review } from "@/types/types";
import { warn } from "@/utils/log";
import { supabase } from "@/utils/supabase";
import { TTC_WEB_ORIGIN } from "@/utils/shareUrls";
import {
  copyShareText,
  messageShareUrl,
  openShareUrl,
  shareMessageWithUrl,
  whatsappShareUrl,
} from "@/utils/shareDestinations";

export { TTC_WEB_ORIGIN } from "@/utils/shareUrls";

export const publicReviewUrl = (reviewId: string | number) =>
  `${TTC_WEB_ORIGIN.replace(/\/$/, "")}/r/${encodeURIComponent(String(reviewId))}`;

export type ReviewShareChannel =
  | "sheet"
  | "share_link"
  | "copy_link"
  | "email"
  | "instagram"
  | "instagram_story"
  | "instagram_post"
  | "message"
  | "whatsapp";

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

const reviewShareMessage = (review: Review) =>
  shareMessageWithUrl(reviewShareText(review), publicReviewUrl(review.id));

export const shareReviewViaWhatsApp = async (review: Review) => {
  const opened = await openShareUrl(
    whatsappShareUrl(reviewShareMessage(review)),
    "WhatsApp unavailable",
    "WhatsApp does not appear to be installed on this device.",
    "WhatsApp review share failed:"
  );
  await logReviewShare(
    review.id,
    "whatsapp",
    opened ? "opened" : "unavailable"
  );
};

export const shareReviewViaMessage = async (review: Review) => {
  const opened = await openShareUrl(
    messageShareUrl(reviewShareMessage(review)),
    "Messages unavailable",
    "Messages could not be opened on this device.",
    "Message review share failed:"
  );
  await logReviewShare(review.id, "message", opened ? "opened" : "unavailable");
};

export const copyReviewLink = async (review: Review) => {
  try {
    await copyShareText(publicReviewUrl(review.id));
    Alert.alert("Link copied", "Review link copied to clipboard.");
    await logReviewShare(review.id, "copy_link", "copied");
  } catch (error) {
    warn("Review link copy failed:", error);
    Alert.alert("Copy failed", "The review link could not be copied.");
    await logReviewShare(review.id, "copy_link", "failed");
  }
};
