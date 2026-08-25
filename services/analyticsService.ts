import Constants from "expo-constants";
import { Platform } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { getInstallationId } from "@/services/installationIdentity";
import { log, warn } from "@/utils/log";
import { supabase } from "@/utils/supabase";
/**
 * Analytics facade.
 *
 * Product events cross one privacy-safe seam: callers name an allowlisted
 * event, while this module owns installation/session metadata, transport, and
 * failure isolation. Arbitrary properties are logged locally for diagnosis but
 * are deliberately not sent to the analytics backend.
 */

export type AnalyticEventType =
  | "login"
  | "create_account"
  | "shared_app"
  | "share_review"
  | "share_location"
  | "new_review"
  | "edit_review"
  | "like_review"
  | "like_comment"
  | "view_location"
  | "comment_on_review"
  | "follow_user"
  | "view_profile"
  | "change_avatar"
  | "report"
  | "delete_review"
  | "logout"
  | "activity_open"
  | "activity_notification_open"
  | "activity_follow_back"
  | "activity_page_load"
  | "activity_load_error"
  | "visitor_preview_started"
  | "membership_gate_opened"
  | "membership_gate_dismissed"
  | "membership_auth_started"
  | "onboarding_completed"
  | "auth_unexpected_sign_out"
  | "auth_session_missing_at_launch"
  | "mention_suggestions_opened"
  | "mention_selected"
  | "mention_submitted";

const SESSION_ID = uuidv4();

const capture = async (
  event: AnalyticEventType,
  properties?: Record<string, unknown>
): Promise<boolean> => {
  log(`[Analytics] ${event}`, properties ?? {});

  try {
    const { error } = await supabase.functions.invoke("app-events", {
      body: {
        id: uuidv4(),
        installationId: await getInstallationId(),
        sessionId: SESSION_ID,
        event,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? null,
        appEnvironment:
          Constants.expoConfig?.extra?.environment ?? "production",
      },
    });
    if (error) throw error;
    return true;
  } catch (error) {
    warn("[Analytics] Event delivery failed:", event, error);
    return false;
  }
};

const AnalyticService = {
  capture,

  identify: (_userId: string, _properties?: Record<string, unknown>) => {},

  reset: () => {},
};

export default AnalyticService;
