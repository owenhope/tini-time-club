import { Linking } from "react-native";
import { LEGAL_URLS } from "@/utils/legalUrls";
import { warn } from "@/utils/log";

export const SUPPORT_EMAIL = "support@hopemediahouse.com";

/**
 * Opens an email to support, or the support page when the phone can't
 * compose mail (no Mail app set up — common for Gmail/Outlook users), which
 * otherwise made the button do nothing at all.
 */
export async function openSupport(
  linking: Pick<typeof Linking, "openURL"> = Linking
) {
  const subject = encodeURIComponent("Tini Time Club support");
  try {
    await linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
    return "email" as const;
  } catch (error) {
    warn("Mail unavailable, opening the support page instead:", error);
  }
  await linking.openURL(LEGAL_URLS.support);
  return "web" as const;
}
