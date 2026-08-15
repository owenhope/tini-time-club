import { warn } from "@/utils/log";
import { supabase } from "@/utils/supabase";

export type MartiniIndexEventKind = "view" | "filter" | "generate";

/**
 * Best-effort production analytics for the Martini Index. Tracking must never
 * interrupt browsing or picking a drink, so failures are reported locally and
 * swallowed after the private RPC completes.
 */
export const logMartiniIndexEvent = async (
  kind: MartiniIndexEventKind,
  value?: string
): Promise<void> => {
  try {
    const { error } = await supabase.rpc("log_martini_index_event", {
      p_kind: kind,
      p_value: value ?? null,
    });
    if (error) warn("Martini Index analytics failed:", error);
  } catch (error) {
    warn("Martini Index analytics failed:", error);
  }
};
