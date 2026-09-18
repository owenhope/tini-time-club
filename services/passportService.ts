import {
  beginMemberPointsRead,
  commitMemberPoints,
  getMemberPoints,
  isMemberPointsReadCurrent,
} from "@/utils/memberPoints";
import { normalizePassportPoints } from "@/utils/ranking";
import { supabase } from "@/utils/supabase";

export const PASSPORT_STAMP_SHAPES = [
  "locations",
  "martinis",
  "combination",
  "type_reviews",
  "spirit_reviews",
  "regulars",
  "comments",
  "likes_received",
  "shares",
  "profile_photo",
  "favorite_location",
  "taste_profile",
  "bio",
] as const;
export type PassportStampShape = (typeof PASSPORT_STAMP_SHAPES)[number];

export type PassportStampRecord = {
  id: string;
  key: string;
  section: string;
  metric: PassportStampShape;
  threshold: number;
  points: number;
  title: string;
  label: string;
  unit: string;
  hint: string;
  artworkKey: string;
  progress: number;
  earned: boolean;
  awardedAt: string | null;
  subjectA: number | null;
  subjectB: number | null;
};

export type Passport = { points: number | null; stamps: PassportStampRecord[] };
export type PassportTransition = {
  previousPoints: number | null;
  profileId: string;
  points: number | null;
  unlocked: PassportStampRecord[];
};

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === "string" ? value : "");
const number = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const nullableNumber = (value: unknown) =>
  value == null ? null : number(value);
// Unknown metrics fall back to "shares": it renders the generic stamp outline
// and never hijacks a named Passport section.
const stampShape = (value: unknown): PassportStampShape =>
  PASSPORT_STAMP_SHAPES.includes(value as PassportStampShape)
    ? (value as PassportStampShape)
    : "shares";

export function decodePassport(value: unknown): Passport {
  const root = record(value);
  if (!Array.isArray(root.stamps)) throw new Error("Passport data is invalid.");
  return {
    points: normalizePassportPoints(root.points),
    stamps: root.stamps.map(decodePassportStamp),
  };
}

export function decodePassportStamp(raw: unknown): PassportStampRecord {
  const stamp = record(raw);
  const id = text(stamp.id);
  const key = text(stamp.key);
  if (!id || !key) throw new Error("Passport stamp data is invalid.");
  return {
    id,
    key,
    section: text(stamp.series),
    metric: stampShape(stamp.metric),
    threshold: number(stamp.threshold),
    points: number(stamp.points),
    title: text(stamp.title),
    label: text(stamp.label),
    unit: text(stamp.unit),
    hint: text(stamp.hint),
    artworkKey: text(stamp.artwork_key),
    progress: number(stamp.progress),
    earned: stamp.earned === true,
    awardedAt: stamp.awarded_at == null ? null : text(stamp.awarded_at),
    subjectA: nullableNumber(stamp.subject_a),
    subjectB: nullableNumber(stamp.subject_b),
  };
}

/** Bind self-scoped RPC results to the session that started them. */
async function ownPassportRead() {
  const read = beginMemberPointsRead();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user.id || !isMemberPointsReadCurrent(read))
    throw new Error("Passport session changed.");
  return { read, profileId: session.user.id };
}

function confirmPoints(
  read: ReturnType<typeof beginMemberPointsRead>,
  profileId: string,
  points: number | null
) {
  if (!isMemberPointsReadCurrent(read))
    throw new Error("Passport session changed.");
  commitMemberPoints(read, profileId, points);
  return getMemberPoints(profileId) ?? points;
}

export async function getMyPassport(): Promise<Passport> {
  const { read, profileId } = await ownPassportRead();
  const { data, error } = await supabase.rpc("get_my_passport_v1");
  if (error) throw error;
  const passport = decodePassport(data);
  return {
    ...passport,
    points: confirmPoints(read, profileId, passport.points),
  };
}

/** The server validates access and reconciles awards before returning the member's Passport. */
export async function getMemberPassport(profileId: string): Promise<Passport> {
  const read = beginMemberPointsRead();
  const { data, error } = await supabase.rpc("get_member_passport_v1", {
    p_profile_id: profileId,
  });
  if (error) throw error;
  const passport = decodePassport(data);
  return {
    ...passport,
    points: confirmPoints(read, profileId, passport.points),
  };
}

export async function reconcileMyPassport(): Promise<PassportTransition> {
  const { read, profileId } = await ownPassportRead();
  const { data, error } = await supabase.rpc("reconcile_my_passport_v1");
  if (error) throw error;
  const root = record(data);
  const unlocked = Array.isArray(root.unlocked)
    ? root.unlocked.map(decodePassportStamp)
    : [];
  return {
    profileId,
    previousPoints: normalizePassportPoints(root.previousPoints),
    points: confirmPoints(
      read,
      profileId,
      normalizePassportPoints(root.points)
    ),
    unlocked,
  };
}
