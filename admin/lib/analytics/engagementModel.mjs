import { channelCounts, count, dayCounts, record } from "./model.mjs";

const actions = (value) => {
  const row = record(value);
  return {
    follows: count(row.follows),
    likes: count(row.likes),
    commentLikes: count(row.commentLikes),
    comments: count(row.comments),
    shares: count(row.shares),
    invites: count(row.invites),
  };
};

const profile = (value) => {
  const row = record(value);
  return {
    id: String(row.id ?? ""),
    username: row.username == null ? null : String(row.username),
    name: row.name == null ? null : String(row.name),
    avatar_url: row.avatar_url == null ? null : String(row.avatar_url),
    is_verified: Boolean(row.is_verified),
    deleted: Boolean(row.deleted),
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at),
    review_count: count(row.review_count),
    bio: row.bio == null ? null : String(row.bio),
  };
};

export const resolveEngagement = (value) => {
  const row = record(value);
  return {
    current: actions(row.current),
    previous: actions(row.previous),
    followsByDay: dayCounts(row.followsByDay),
    likesByDay: dayCounts(row.likesByDay),
    commentLikesByDay: dayCounts(row.commentLikesByDay),
    commentsByDay: dayCounts(row.commentsByDay),
    sharesByDay: dayCounts(row.sharesByDay),
    invitesByDay: dayCounts(row.invitesByDay),
    shareChannels: channelCounts(row.shareChannels),
    inviteChannels: channelCounts(row.inviteChannels),
    topSharers: (Array.isArray(row.topSharers) ? row.topSharers : []).map(
      (value) => {
        const sharer = record(value);
        return {
          ...profile(sharer),
          shareCount: count(sharer.share_count),
          lastSharedAt: String(sharer.last_shared_at ?? ""),
        };
      }
    ),
    recentReviewShares: (
      Array.isArray(row.recentReviewShares) ? row.recentReviewShares : []
    ).map((value) => {
      const share = record(value);
      return {
        id: String(share.id ?? ""),
        reviewId: count(share.reviewId),
        locationName:
          share.locationName == null ? null : String(share.locationName),
        channel: String(share.channel ?? "unknown"),
        outcome: String(share.outcome ?? "unknown"),
        sharedAt: String(share.sharedAt ?? ""),
        profile: profile(share.profile),
      };
    }),
    hasMore: Boolean(row.hasMore),
    nextCursorAt:
      row.nextCursorAt == null ? null : String(row.nextCursorAt),
    nextCursorId:
      row.nextCursorId == null ? null : String(row.nextCursorId),
  };
};
