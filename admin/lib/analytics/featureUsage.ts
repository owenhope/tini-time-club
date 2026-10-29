import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { toAdminDataError } from "@/lib/dataErrors";
import { resolveFeatureUsage } from "@/lib/analytics/featureUsageModel.mjs";
import type { DateRange } from "@/lib/range";

export async function fetchFeatureUsage(
  range: DateRange,
  surface: string,
  environment: string
) {
  const { data, error } = await supabaseAdmin().rpc(
    "get_feature_usage_ranking",
    {
      p_since: range.since.toISOString().slice(0, 10),
      p_until: range.until.toISOString().slice(0, 10),
      p_surface: surface,
      p_environment: environment,
    }
  );
  // Missing deployment is distinct from a working tracker with no events.
  if (error && ["PGRST202", "42883", "42P01"].includes(error.code)) return null;
  if (error) throw toAdminDataError(error, "load feature usage");
  return resolveFeatureUsage(data);
}
