import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const avatarPublicUrl = (
  avatarPath: string | null | undefined
): string | null => {
  if (!avatarPath) return null;
  if (/^https?:\/\//i.test(avatarPath)) return avatarPath;

  return supabaseAdmin().storage.from("avatars").getPublicUrl(avatarPath).data
    .publicUrl;
};
