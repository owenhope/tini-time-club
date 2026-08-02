import { Platform, Share } from "react-native";
import type { Profile } from "@/types/types";
import { TTC_WEB_ORIGIN } from "@/utils/reviewShare";
import { warn } from "@/utils/log";
import { supabase } from "@/utils/supabase";

type InviteProfile = Pick<Profile, "id" | "username" | "review_count"> | null;

const appUrl = () => TTC_WEB_ORIGIN.replace(/\/$/, "");

/** The club's landing page, tagged with who sent the invite. */
const inviteTargetUrl = (profile: InviteProfile) => {
  if (!profile?.id) return appUrl();
  const url = new URL(appUrl());
  url.searchParams.set("invite", profile.id);
  return url.toString();
};

const inviteText = (profile: InviteProfile) => {
  if (!profile?.username) {
    return "Join me on Tini Time Club.";
  }

  const reviewCount = profile.review_count ?? 0;
  const reviewText =
    reviewCount > 0
      ? ` I've logged ${reviewCount} Martini review${reviewCount === 1 ? "" : "s"}.`
      : "";
  return `Join me on Tini Time Club. I'm @${profile.username}.${reviewText}`;
};

const logInviteShare = async (
  channel: "sheet",
  outcome: "shared" | "dismissed",
  targetUrl: string
) => {
  const { error } = await supabase.rpc("log_invite_share", {
    p_channel: channel,
    p_outcome: outcome,
    p_target_url: targetUrl,
  });
  if (error) warn("Invite share analytics failed:", error);
};

export const shareInviteViaSheet = async (profile: InviteProfile) => {
  const url = inviteTargetUrl(profile);
  const message = inviteText(profile);
  const content =
    Platform.OS === "ios"
      ? {
          title: "Tini Time Club",
          message,
          url,
        }
      : {
          title: "Tini Time Club",
          message: `${message}\n\n${url}`,
        };

  const result = await Share.share(content);
  await logInviteShare(
    "sheet",
    result.action === Share.sharedAction ? "shared" : "dismissed",
    url
  );
};
