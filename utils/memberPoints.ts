import { normalizePassportPoints } from "@/utils/ranking";

// Explicit Passport reads supersede points embedded in cached member projections.
// Request order, not numeric maximum, decides freshness: awards can be revoked.
type Read = { generation: number; sequence: number };
let generation = 0;
let sequence = 0;
const snapshots = new Map<string, { points: number; sequence: number }>();
const listeners = new Set<() => void>();

export const beginMemberPointsRead = (): Read => ({
  generation,
  sequence: ++sequence,
});
export const isMemberPointsReadCurrent = (read: Read) =>
  read.generation === generation;
export const getMemberPoints = (profileId?: string | null): number | null =>
  profileId ? (snapshots.get(profileId)?.points ?? null) : null;

export function commitMemberPoints(
  read: Read,
  profileId: string,
  value: unknown
) {
  const points = normalizePassportPoints(value);
  if (!isMemberPointsReadCurrent(read) || !profileId.trim() || points === null)
    return;
  const current = snapshots.get(profileId);
  if (current && current.sequence > read.sequence) return;
  snapshots.set(profileId, { points, sequence: read.sequence });
  if (current?.points !== points) listeners.forEach((listener) => listener());
}

export function clearMemberPoints() {
  generation++;
  snapshots.clear();
  listeners.forEach((listener) => listener());
}

export function subscribeToMemberPoints(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
