import { supabase } from "@/utils/supabase";

/** Records an opening and returns its total. The server owns deduplication.
 * An unavailable counter must never block the location or show a false zero.
 */
export async function recordLocationView(
  locationId: string | number
): Promise<number | null> {
  const id = String(locationId);
  if (!/^[1-9]\d*$/.test(id)) return null;

  try {
    const { data, error } = await supabase.rpc("record_location_view", {
      p_location_id: id,
    });
    if (error || data == null) return null;
    if (typeof data === "string" && !/^\d+$/.test(data)) return null;
    const count = typeof data === "string" ? Number(data) : data;
    return typeof count === "number" &&
      Number.isSafeInteger(count) &&
      count >= 0
      ? count
      : null;
  } catch {
    return null;
  }
}
