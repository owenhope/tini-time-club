import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bucketByDay } from "@/components/BarChart";

export interface AdminProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  deleted: boolean | null;
  deleted_at: string | null;
  review_count: number | null;
  bio: string | null;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalReviews: number;
  totalLocations: number;
  reviewsLast30Days: { day: string; count: number }[];
  topLocations: {
    id: number;
    name: string;
    rating: number;
    total_ratings: number;
  }[];
  newestUsers: AdminProfile[];
}

const db = supabaseAdmin;

/** auth.users rows keyed by id — email + signup date live there. */
export const fetchAuthUsers = async (): Promise<
  Map<string, { email?: string; created_at?: string; last_sign_in_at?: string }>
> => {
  const users = new Map();
  let page = 1;
  // Paginate defensively; fine at current scale, revisit past ~10k users.
  for (;;) {
    const { data, error } = await db().auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);
    for (const user of data.users) {
      users.set(user.id, {
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      });
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  return users;
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [users, reviews, locations, recentReviews, topLocations, authUsers] =
    await Promise.all([
      db()
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("deleted", false),
      db()
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("state", 1),
      db().from("locations").select("id", { count: "exact", head: true }),
      db()
        .from("reviews")
        .select("inserted_at")
        .eq("state", 1)
        .gte("inserted_at", since.toISOString()),
      db()
        .from("location_ratings")
        .select("id,name,rating,total_ratings")
        .gt("total_ratings", 0)
        .order("total_ratings", { ascending: false })
        .order("rating", { ascending: false })
        .limit(5),
      fetchAuthUsers(),
    ]);

  // Bucket the last 30 days, zero-filled so the chart has no gaps.
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of recentReviews.data ?? []) {
    const day = String(row.inserted_at).slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const newestIds = [...authUsers.entries()]
    .sort(
      (a, b) =>
        new Date(b[1].created_at ?? 0).getTime() -
        new Date(a[1].created_at ?? 0).getTime()
    )
    .slice(0, 5)
    .map(([id]) => id);
  const { data: newestProfiles } = await db()
    .from("profiles")
    .select(
      "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
    )
    .in("id", newestIds);
  const newestUsers = newestIds
    .map((id) => {
      const profile = (newestProfiles ?? []).find((p) => p.id === id);
      if (!profile) return null;
      return { ...profile, ...authUsers.get(id) } as AdminProfile;
    })
    .filter(Boolean) as AdminProfile[];

  return {
    totalUsers: users.count ?? 0,
    totalReviews: reviews.count ?? 0,
    totalLocations: locations.count ?? 0,
    reviewsLast30Days: [...byDay.entries()].map(([day, count]) => ({
      day,
      count,
    })),
    topLocations: (topLocations.data ?? []) as DashboardStats["topLocations"],
    newestUsers,
  };
};

export interface AnalyticsData {
  signupsByDay: { day: string; count: number }[];
  reviewsByDay: { day: string; count: number }[];
  likesByDay: { day: string; count: number }[];
  commentsByDay: { day: string; count: number }[];
  activeLast7Days: number;
  activeLast30Days: number;
  reviewedLast30Days: number;
  totalMembers: number;
  tierDistribution: { tier: string; color: string; count: number }[];
  topReviewers: AdminProfile[];
}

/** The four in-app rank tiers, mirrored from utils/ranking.ts. */
const RANK_TIERS = [
  { name: "Well", min: 0, color: "#B4783A" },
  { name: "Call", min: 10, color: "#9BA6B2" },
  { name: "Premium", min: 50, color: "#D4AF37" },
  { name: "Top Shelf", min: 150, color: "#8E7CE8" },
];

export const fetchAnalytics = async (days = 30): Promise<AnalyticsData> => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const [authUsers, reviews, likes, comments, profiles, reviewers] =
    await Promise.all([
      fetchAuthUsers(),
      db()
        .from("reviews")
        .select("inserted_at,user_id")
        .eq("state", 1)
        .gte("inserted_at", sinceIso),
      db().from("likes").select("liked_at").gte("liked_at", sinceIso),
      db().from("comments").select("inserted_at").gte("inserted_at", sinceIso),
      db()
        .from("profiles")
        .select("id,review_count,deleted")
        .eq("deleted", false),
      db()
        .from("profiles")
        .select(
          "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
        )
        .eq("deleted", false)
        .order("review_count", { ascending: false })
        .limit(10),
    ]);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const authRows = [...authUsers.values()];
  const activeWithin = (windowDays: number) =>
    authRows.filter(
      (u) =>
        u.last_sign_in_at &&
        now - new Date(u.last_sign_in_at).getTime() < windowDays * dayMs
    ).length;

  const tierDistribution = RANK_TIERS.map((tier, index) => {
    const next = RANK_TIERS[index + 1];
    return {
      tier: tier.name,
      color: tier.color,
      count: (profiles.data ?? []).filter(
        (p) =>
          (p.review_count ?? 0) >= tier.min &&
          (!next || (p.review_count ?? 0) < next.min)
      ).length,
    };
  });

  return {
    signupsByDay: bucketByDay(
      authRows.map((u) => u.created_at),
      days
    ),
    reviewsByDay: bucketByDay(
      (reviews.data ?? []).map((r) => r.inserted_at),
      days
    ),
    likesByDay: bucketByDay(
      (likes.data ?? []).map((l) => l.liked_at),
      days
    ),
    commentsByDay: bucketByDay(
      (comments.data ?? []).map((c) => c.inserted_at),
      days
    ),
    activeLast7Days: activeWithin(7),
    activeLast30Days: activeWithin(30),
    reviewedLast30Days: new Set((reviews.data ?? []).map((r) => r.user_id))
      .size,
    totalMembers: (profiles.data ?? []).length,
    tierDistribution,
    topReviewers: ((reviewers.data ?? []) as AdminProfile[]).map((profile) => ({
      ...profile,
      ...authUsers.get(profile.id),
    })),
  };
};

export const fetchProfiles = async (
  search?: string
): Promise<AdminProfile[]> => {
  let query = db()
    .from("profiles")
    .select(
      "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
    )
    .order("review_count", { ascending: false })
    .limit(200);
  if (search) query = query.ilike("username", `%${search}%`);

  const [{ data, error }, authUsers] = await Promise.all([
    query,
    fetchAuthUsers(),
  ]);
  if (error) throw new Error(error.message);
  return (data ?? []).map((profile) => ({
    ...profile,
    ...authUsers.get(profile.id),
  }));
};

export const fetchProfile = async (
  id: string
): Promise<{ profile: AdminProfile; reviews: any[] } | null> => {
  const [{ data: profile, error }, authUsers, { data: reviews }] =
    await Promise.all([
      db()
        .from("profiles")
        .select(
          "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
        )
        .eq("id", id)
        .maybeSingle(),
      fetchAuthUsers(),
      db()
        .from("reviews")
        .select("id,comment,taste,presentation,inserted_at,state,location(name)")
        .eq("user_id", id)
        .order("inserted_at", { ascending: false })
        .limit(50),
    ]);
  if (error) throw new Error(error.message);
  if (!profile) return null;
  return {
    profile: { ...profile, ...authUsers.get(profile.id) },
    reviews: reviews ?? [],
  };
};
