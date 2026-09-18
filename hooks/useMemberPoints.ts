import { useSyncExternalStore } from "react";
import { getMemberPoints, subscribeToMemberPoints } from "@/utils/memberPoints";
import { normalizePassportPoints } from "@/utils/ranking";

export type MemberPointsInput = {
  id?: string | null;
  /** Venue Regulars use profile_id for member identity. */
  profile_id?: string | null;
  passport_points?: number | null;
};

export function useMemberPoints(member?: MemberPointsInput | null) {
  const id = member?.id ?? member?.profile_id;
  const confirmed = useSyncExternalStore(
    subscribeToMemberPoints,
    () => getMemberPoints(id),
    () => null
  );
  return confirmed ?? normalizePassportPoints(member?.passport_points);
}
