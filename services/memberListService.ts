import { supabase } from "@/utils/supabase";
import { decodeMemberSummary, type MemberSummary } from "@/utils/memberSummary";

export type FollowDirection = "followers" | "following";

const decodeMembers = (rows: unknown): MemberSummary[] =>
  Array.isArray(rows)
    ? rows.flatMap((row: unknown) => {
        const member = decodeMemberSummary(
          typeof row === "object" && row !== null && "profiles" in row
            ? row.profiles
            : null
        );
        return member ? [member] : [];
      })
    : [];

export async function getReviewLikers(
  reviewId: string
): Promise<MemberSummary[]> {
  const { data, error } = await supabase
    .from("likes")
    .select(
      "profiles(id, username, avatar_url, is_verified, review_count, passport_points)"
    )
    .eq("review_id", reviewId)
    .limit(200);
  if (error) throw error;
  return decodeMembers(data);
}

export async function getFollowProfiles(
  username: string,
  direction: FollowDirection
): Promise<MemberSummary[]> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .eq("deleted", false)
    .single();
  if (profileError) throw profileError;
  if (!profile) throw new Error("This profile isn't available.");
  const followers = direction === "followers";
  const join = followers
    ? "profiles!followers_follower_id_fkey(id, username, avatar_url, is_verified, review_count, passport_points)"
    : "profiles!followers_following_id_fkey(id, username, avatar_url, is_verified, review_count, passport_points)";
  const { data, error } = await supabase
    .from("followers")
    .select(join)
    .eq(followers ? "following_id" : "follower_id", profile.id)
    .limit(200);
  if (error) throw error;
  return decodeMembers(data);
}
