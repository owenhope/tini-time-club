import { count, nullableNumber, record } from "./analytics/model.mjs";

const rows = (value) => (Array.isArray(value) ? value : []);

const profile = (value) => {
  const row = record(value);
  if (Object.keys(row).length === 0) return null;
  return {
    id: String(row.id ?? ""),
    username: row.username ?? null,
    name: row.name ?? null,
    avatar_url: row.avatar_url ?? null,
    is_verified: row.is_verified ?? null,
    deleted: row.deleted ?? null,
    deleted_at: row.deleted_at ?? null,
    review_count: nullableNumber(row.review_count),
    bio: row.bio ?? null,
    ...(row.created_at ? { created_at: String(row.created_at) } : {}),
  };
};

const location = (value) => {
  const row = record(value);
  if (Object.keys(row).length === 0) return null;
  return {
    id: count(row.id),
    name: row.name ?? null,
  };
};

const review = (value) => {
  const row = record(value);
  const engagement = record(row.engagement);
  const likes = count(engagement.likes ?? row.likes);
  const comments = count(engagement.comments ?? row.comments);
  return {
    id: String(row.id ?? ""),
    comment: row.comment ?? null,
    taste: nullableNumber(row.taste),
    presentation: nullableNumber(row.presentation),
    inserted_at: String(row.inserted_at ?? ""),
    state: nullableNumber(row.state),
    location: location(row.location),
    profile: profile(row.profile),
    engagement: { likes, comments, shares: count(engagement.shares) },
    likes,
    comments,
  };
};

const latestLocation = (value) => {
  const row = record(value);
  return {
    id: count(row.id),
    name: row.name ?? null,
    address: row.address ?? null,
    inserted_at: row.inserted_at ?? null,
  };
};

const topLocation = (value) => {
  const row = record(value);
  return {
    id: count(row.id),
    name: row.name ?? null,
    rating: nullableNumber(row.rating),
    total_ratings: count(row.total_ratings),
  };
};

export const resolveDashboardActivityResponse = (value) => {
  const row = record(value);
  const latest = record(row.latest);
  const top = record(row.top);
  return {
    latest: {
      members: rows(latest.members).map(profile).filter(Boolean),
      reviews: rows(latest.reviews).map(review),
      locations: rows(latest.locations).map(latestLocation),
    },
    top: {
      members: rows(top.members).map(profile).filter(Boolean),
      reviews: rows(top.reviews).map(review),
      locations: rows(top.locations).map(topLocation),
    },
  };
};
