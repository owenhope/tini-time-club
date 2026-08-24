import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface WebMentionSpan {
  profileId: string | null;
  username: string;
  start: number;
  length: number;
  href: string | null;
}

interface MentionRows {
  reviews: Map<string, WebMentionSpan[]>;
  comments: Map<string, WebMentionSpan[]>;
}

const emptyRows = (): MentionRows => ({
  reviews: new Map(),
  comments: new Map(),
});

const add = (
  target: Map<string, WebMentionSpan[]>,
  sourceId: string | number,
  span: WebMentionSpan
) => {
  const key = String(sourceId);
  target.set(key, [...(target.get(key) ?? []), span]);
};

/**
 * Hydrate identity-bound ranges for server-rendered review surfaces. A
 * pre-migration environment degrades to plain text so web deploys remain
 * compatible during the additive database rollout.
 */
export const fetchWebMentionSpans = async ({
  reviewIds = [],
  commentIds = [],
  audience,
}: {
  reviewIds?: Array<string | number>;
  commentIds?: Array<string | number>;
  audience: "public" | "admin";
}): Promise<MentionRows> => {
  if (!reviewIds.length && !commentIds.length) return emptyRows();

  const database = supabaseAdmin();
  const [reviewResult, commentResult] = await Promise.all([
    reviewIds.length
      ? database
          .from("review_mentions")
          .select(
            "review_id,mentioned_profile_id,username_snapshot,start_offset,token_length"
          )
          .in("review_id", reviewIds)
          .order("start_offset")
      : Promise.resolve({ data: [], error: null }),
    commentIds.length
      ? database
          .from("comment_mentions")
          .select(
            "comment_id,mentioned_profile_id,username_snapshot,start_offset,token_length"
          )
          .in("comment_id", commentIds)
          .order("start_offset")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (reviewResult.error || commentResult.error) {
    console.warn(
      "Mention metadata is unavailable; rendering plain text.",
      reviewResult.error?.message ?? commentResult.error?.message
    );
    return emptyRows();
  }

  const allRows = [...(reviewResult.data ?? []), ...(commentResult.data ?? [])];
  const profileIds = [
    ...new Set(
      allRows
        .map((row) => row.mentioned_profile_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const profilesResult = profileIds.length
    ? await database
        .from("profiles")
        .select("id,is_public,deleted")
        .in("id", profileIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    console.warn(
      "Mention targets are unavailable; rendering plain text.",
      profilesResult.error.message
    );
    return emptyRows();
  }

  const linkable = new Set(
    (profilesResult.data ?? [])
      .filter(
        (profile) =>
          profile.deleted === false &&
          (audience === "admin" || profile.is_public === true)
      )
      .map((profile) => profile.id)
  );
  const result = emptyRows();
  const span = (row: (typeof allRows)[number]): WebMentionSpan | null => {
    if (!row.mentioned_profile_id || !linkable.has(row.mentioned_profile_id)) {
      return null;
    }
    return {
      profileId: row.mentioned_profile_id,
      username: row.username_snapshot,
      start: row.start_offset,
      length: row.token_length,
      // There are no public profile pages — that surface was deliberately
      // removed — so public review pages style mentions without linking.
      href:
        audience === "admin"
          ? `/admin/users/${row.mentioned_profile_id}`
          : null,
    };
  };

  for (const row of reviewResult.data ?? []) {
    const mention = span(row);
    if (mention) add(result.reviews, row.review_id, mention);
  }
  for (const row of commentResult.data ?? []) {
    const mention = span(row);
    if (mention) add(result.comments, row.comment_id, mention);
  }
  return result;
};
