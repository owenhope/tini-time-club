import { Alert, Linking, Platform, Share } from "react-native";
import type { Profile } from "@/types/types";
import type { Review } from "@/types/types";
import { calculateOverallRating, formatRating } from "@/utils/ratingUtils";
import { warn } from "@/utils/log";
import { supabase } from "@/utils/supabase";

export const TTC_WEB_ORIGIN =
  process.env.EXPO_PUBLIC_TTC_WEB_ORIGIN ?? "https://ttc.hopemediahouse.com";

export const publicReviewUrl = (reviewId: string | number) =>
  `${TTC_WEB_ORIGIN.replace(/\/$/, "")}/r/${encodeURIComponent(String(reviewId))}`;

export const publicProfileUrl = (username: string) =>
  `${TTC_WEB_ORIGIN.replace(/\/$/, "")}/u/${encodeURIComponent(username)}`;

type ShareChannel = "sheet" | "email" | "instagram";

const logReviewShare = async (
  reviewId: string | number,
  channel: ShareChannel,
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

const reviewShareText = (review: Review) => {
  const place = review.location?.name ?? "a Martini spot";
  const username = review.profile?.username
    ? `@${review.profile.username}`
    : "Someone";
  const score = calculateOverallRating(review.taste, review.presentation);
  const scoreText = score == null ? "" : ` ${formatRating(score)}/5.`;
  return `${username} reviewed ${place} on Tini Time Club.${scoreText}`;
};

const logProfileShare = async (
  profileId: string,
  channel: ShareChannel,
  outcome: string
) => {
  const { error } = await supabase.rpc("log_profile_share", {
    p_profile_id: profileId,
    p_channel: channel,
    p_outcome: outcome,
  });
  if (error) warn("Profile share analytics failed:", error);
};

const profileShareText = (profile: Pick<Profile, "username" | "review_count">) => {
  const count = profile.review_count ?? 0;
  const reviewText =
    count > 0
      ? ` ${count} Martini review${count === 1 ? "" : "s"}.`
      : ".";
  return `Check out @${profile.username} on Tini Time Club.${reviewText}`;
};

export const shareProfileViaSheet = async (
  profile: Pick<Profile, "id" | "username" | "review_count">
) => {
  const url = publicProfileUrl(profile.username);
  const text = profileShareText(profile);
  const content =
    Platform.OS === "ios"
      ? {
          title: "Tini Time Club profile",
          message: text,
          url,
        }
      : {
          title: "Tini Time Club profile",
          message: `${text}\n\n${url}`,
        };

  const result = await Share.share(content);
  await logProfileShare(
    profile.id,
    "sheet",
    result.action === Share.sharedAction ? "shared" : "dismissed"
  );
};

export const shareReviewViaSheet = async (review: Review) => {
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
    "sheet",
    result.action === Share.sharedAction ? "shared" : "dismissed"
  );
};

export const shareReviewViaEmail = async (review: Review) => {
  const url = publicReviewUrl(review.id);
  const subject = `Tini Time Club review at ${review.location?.name ?? "a Martini spot"}`;
  const body = `${reviewShareText(review)}\n\nOpen it here:\n${url}`;
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
