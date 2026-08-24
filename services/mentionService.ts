import type {
  Comment,
  MentionCandidate,
  MentionRelationship,
  MentionSpan,
  Review,
} from "@/types/types";
import { supabase } from "@/utils/supabase";

const SEARCH_CACHE_MS = 30_000;
const searchCache = new Map<
  string,
  { expiresAt: number; value: MentionCandidate[] }
>();
const pendingSearches = new Map<string, Promise<MentionCandidate[]>>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const numberValue = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const relationships = new Set<MentionRelationship>([
  "mutual",
  "following",
  "follows_you",
  "recent",
  "everyone",
]);

const decodeCandidate = (value: unknown): MentionCandidate | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.username !== "string") {
    return null;
  }
  const relationship = relationships.has(
    value.relationship as MentionRelationship
  )
    ? (value.relationship as MentionRelationship)
    : "everyone";
  return {
    id: value.id,
    username: value.username,
    name: typeof value.name === "string" ? value.name : null,
    avatarUrl: typeof value.avatarUrl === "string" ? value.avatarUrl : null,
    isVerified: value.isVerified === true,
    reviewCount: numberValue(value.reviewCount),
    relationship,
  };
};

export const searchMentionCandidates = async (
  query: string
): Promise<MentionCandidate[]> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const viewerId = session?.user.id;
  if (!viewerId) return [];

  // Candidate order and visibility are viewer-specific: relationships and
  // blocks must never leak across an account switch on the same installation.
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = `${viewerId}:${normalizedQuery}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = pendingSearches.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const { data, error } = await supabase.rpc("search_mention_candidates_v1", {
      p_limit: 5,
      p_query: normalizedQuery,
    });
    if (error) throw error;
    const candidates = (Array.isArray(data) ? data : [])
      .map(decodeCandidate)
      .filter((candidate): candidate is MentionCandidate => candidate !== null);
    const { data: currentAuth } = await supabase.auth.getSession();
    if (currentAuth.session?.user.id !== viewerId) return [];
    searchCache.set(cacheKey, {
      expiresAt: Date.now() + SEARCH_CACHE_MS,
      value: candidates,
    });
    return candidates;
  })().finally(() => pendingSearches.delete(cacheKey));

  pendingSearches.set(cacheKey, request);
  return request;
};

interface MentionRow extends MentionSpan {
  sourceKind: "review" | "comment";
  sourceId: string;
}

const decodeMentionRow = (value: unknown): MentionRow | null => {
  if (!isRecord(value)) return null;
  const sourceKind = value.sourceKind;
  const sourceId =
    typeof value.sourceId === "string"
      ? value.sourceId
      : typeof value.sourceId === "number"
        ? String(value.sourceId)
        : null;
  if (
    (sourceKind !== "review" && sourceKind !== "comment") ||
    !sourceId ||
    typeof value.profileId !== "string" ||
    typeof value.username !== "string" ||
    typeof value.start !== "number" ||
    typeof value.length !== "number"
  ) {
    return null;
  }
  return {
    sourceKind,
    sourceId,
    profileId: value.profileId,
    username: value.username,
    start: value.start,
    length: value.length,
  };
};

export const fetchMentionSpans = async ({
  reviewIds = [],
  commentIds = [],
}: {
  reviewIds?: Array<string | number>;
  commentIds?: Array<string | number>;
}): Promise<MentionRow[]> => {
  if (!reviewIds.length && !commentIds.length) return [];
  const { data, error } = await supabase.rpc("get_mention_spans_v1", {
    p_review_ids: reviewIds.map(Number).filter(Number.isFinite).slice(0, 50),
    p_comment_ids: commentIds.map(Number).filter(Number.isFinite).slice(0, 100),
  });
  if (error) throw error;
  const rows =
    isRecord(data) && Array.isArray(data.mentions) ? data.mentions : [];
  return rows
    .map(decodeMentionRow)
    .filter((row): row is MentionRow => row !== null);
};

export const hydrateReviewMentions = async (
  reviews: Review[]
): Promise<Review[]> => {
  if (!reviews.length) return reviews;
  const comments = reviews.flatMap((review) => review.recent_comments ?? []);
  const rows = await fetchMentionSpans({
    reviewIds: reviews.map((review) => review.id),
    commentIds: comments.map((comment) => comment.id),
  });
  const reviewMentions = new Map<string, MentionSpan[]>();
  const commentMentions = new Map<string, MentionSpan[]>();
  for (const row of rows) {
    const map = row.sourceKind === "review" ? reviewMentions : commentMentions;
    const current = map.get(row.sourceId) ?? [];
    current.push(row);
    map.set(row.sourceId, current);
  }
  return reviews.map((review) => ({
    ...review,
    mentions: reviewMentions.get(String(review.id)) ?? [],
    recent_comments: review.recent_comments?.map((comment) => ({
      ...comment,
      mentions: commentMentions.get(String(comment.id)) ?? [],
    })),
  }));
};

export const hydrateCommentMentions = async (
  comments: Comment[]
): Promise<Comment[]> => {
  if (!comments.length) return comments;
  const rows = await fetchMentionSpans({
    commentIds: comments.map((comment) => comment.id),
  });
  const mentions = new Map<string, MentionSpan[]>();
  for (const row of rows) {
    if (row.sourceKind !== "comment") continue;
    const current = mentions.get(row.sourceId) ?? [];
    current.push(row);
    mentions.set(row.sourceId, current);
  }
  return comments.map((comment) => ({
    ...comment,
    mentions: mentions.get(String(comment.id)) ?? [],
  }));
};

/**
 * A mention stores the username shown at selection time, but profile routes
 * resolve by CURRENT username — so a tap on a since-renamed member must look
 * the live handle up by the identity the mention is actually bound to.
 */
export const resolveMentionUsername = async (
  profileId: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", profileId)
    .eq("deleted", false)
    .maybeSingle();
  if (error) throw error;
  return typeof data?.username === "string" && data.username
    ? data.username
    : null;
};

export const clearMentionSearchCache = () => {
  searchCache.clear();
  pendingSearches.clear();
};
