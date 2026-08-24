import { publicContentService } from "@/services/public-content-service";
import type { Comment } from "@/types/types";
import { supabase } from "@/utils/supabase";
import { hydrateCommentMentions } from "@/services/mentionService";
import { warn } from "@/utils/log";

export interface CommentCursor {
  insertedAt: string;
  id: string;
}

export interface CommentPage {
  comments: Comment[];
  nextCursor: CommentCursor | null;
  hasMore: boolean;
  totalCount: number;
}

export interface GetCommentPageOptions {
  reviewId: string | number;
  viewerId?: string;
  cursor?: CommentCursor | null;
  limit?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const identifier = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) return value;
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : null;
};

const decodeCursor = (value: unknown): CommentCursor | null => {
  if (!isRecord(value)) return null;
  const id = identifier(value.id);
  const insertedAt =
    typeof value.insertedAt === "string" && value.insertedAt.length > 0
      ? value.insertedAt
      : null;
  return id && insertedAt ? { insertedAt, id } : null;
};

const decodeComment = (value: unknown): Comment | null => {
  if (!isRecord(value) || typeof value.id !== "number") return null;
  if (typeof value.body !== "string" || typeof value.inserted_at !== "string") {
    return null;
  }
  return value as unknown as Comment;
};

const decodePage = (value: unknown): CommentPage => {
  if (!isRecord(value)) throw new Error("Comments returned an invalid page.");
  const rawComments = Array.isArray(value.comments) ? value.comments : [];
  return {
    comments: rawComments
      .map(decodeComment)
      .filter((comment): comment is Comment => comment !== null),
    nextCursor: decodeCursor(value.nextCursor),
    hasMore: value.hasMore === true,
    totalCount:
      typeof value.totalCount === "number" && Number.isFinite(value.totalCount)
        ? value.totalCount
        : 0,
  };
};

/** Load the latest comment page in ascending display order; cursors load older pages. */
export async function getCommentPage({
  reviewId,
  viewerId,
  cursor = null,
  limit = 20,
}: GetCommentPageOptions): Promise<CommentPage> {
  if (!viewerId) {
    return decodePage(
      await publicContentService.getCommentPage({ reviewId, cursor, limit })
    );
  }

  const { data, error } = await supabase.rpc("get_comment_page_v1", {
    p_cursor_id: cursor ? Number(cursor.id) : null,
    p_cursor_inserted_at: cursor?.insertedAt ?? null,
    p_limit: limit,
    p_review_id: Number(reviewId),
    p_viewer: viewerId,
  });
  if (error) throw error;
  const page = decodePage(data);
  try {
    return { ...page, comments: await hydrateCommentMentions(page.comments) };
  } catch (error) {
    warn("Could not hydrate comment mentions", error);
    return page;
  }
}
