import type { Profile } from "@/types/types";
import { decodeMemberSummary } from "@/utils/memberSummary";

/** Normalize member display fields without discarding full-profile settings. */
export function normalizeProfile(profile: Profile): Profile {
  const member = decodeMemberSummary(profile);
  if (!member) throw new Error("Invalid profile identity");
  return {
    ...profile,
    ...member,
    // An empty username means onboarding is unfinished, not an Unknown member.
    username: typeof profile.username === "string" ? profile.username : "",
    review_count: member.review_count,
  };
}
