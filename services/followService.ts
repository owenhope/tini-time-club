import { supabase } from "@/utils/supabase";

export async function setFollowing(
  followerId: string,
  followingId: string,
  shouldFollow: boolean
): Promise<void> {
  const result = shouldFollow
    ? await supabase
        .from("followers")
        .upsert([{ follower_id: followerId, following_id: followingId }])
    : await supabase
        .from("followers")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", followingId);
  if (result.error) throw result.error;
}
