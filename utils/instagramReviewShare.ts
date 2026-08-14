import { Linking, Platform } from "react-native";
import Share, { Social } from "react-native-share";
import type { ReviewShareFormat } from "@/utils/routes";

export type InstagramReviewShareErrorCode =
  "not_installed" | "story_not_configured" | "unsupported_platform";

export class InstagramReviewShareError extends Error {
  constructor(public readonly code: InstagramReviewShareErrorCode) {
    super(code);
    this.name = "InstagramReviewShareError";
  }
}

const instagramSchemeFor = (format: ReviewShareFormat) =>
  format === "story" ? "instagram-stories://share" : "instagram://app";

/**
 * Opens Instagram's composer with a rendered review card. Instagram owns the
 * publishing step: Tini Time Club only supplies the image and returns control
 * to the user to edit and publish inside Instagram.
 */
export const shareReviewImageToInstagram = async ({
  imageUri,
  format,
  attributionUrl,
}: {
  imageUri: string;
  format: ReviewShareFormat;
  attributionUrl: string;
}) => {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new InstagramReviewShareError("unsupported_platform");
  }

  if (!(await Linking.canOpenURL(instagramSchemeFor(format)))) {
    throw new InstagramReviewShareError("not_installed");
  }

  if (format === "story") {
    const appId = process.env.EXPO_PUBLIC_META_APP_ID?.trim();
    if (!appId) {
      throw new InstagramReviewShareError("story_not_configured");
    }

    await Share.shareSingle({
      social: Social.InstagramStories,
      appId,
      stickerImage: imageUri,
      attributionURL: attributionUrl,
    });
    return;
  }

  await Share.shareSingle({
    social: Social.Instagram,
    url: imageUri,
    type: "image/png",
  });
};
