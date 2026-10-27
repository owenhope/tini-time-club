/**
 * Platform figures come from app_usage_presence: one row per installation,
 * stamped with the platform its app heartbeats from. A member who uses both
 * an iPhone and an Android phone counts once on each side.
 */

/** @typedef {"ios" | "android" | "other"} PlatformBucket */

/**
 * @typedef {object} PresenceRow
 * @property {string} installation_id
 * @property {"visitor" | "member"} audience
 * @property {string | null} user_id
 * @property {string} platform
 * @property {string | null} app_version
 * @property {string} last_seen_at
 */

/**
 * @typedef {object} PlatformCounts
 * @property {number} ios
 * @property {number} android
 * @property {number} other
 */

/**
 * @typedef {object} UserPlatform
 * @property {"ios" | "android" | "web" | "unknown"} platform
 * @property {string | null} appVersion
 * @property {string} lastSeenAt
 */

/** @param {string} platform @returns {PlatformBucket} */
export const platformBucket = (platform) =>
  platform === "ios" || platform === "android" ? platform : "other";

/** @param {string} platform */
export const platformLabel = (platform) =>
  platform === "ios"
    ? "iOS"
    : platform === "android"
      ? "Android"
      : platform === "web"
        ? "Web"
        : "Unknown";

/** @returns {PlatformCounts} */
const emptyCounts = () => ({ ios: 0, android: 0, other: 0 });

/**
 * Count distinct members (by account) and anonymous installations per
 * platform, for rows seen at or after `since`.
 *
 * @param {PresenceRow[]} rows
 * @param {Date} since
 */
export const summarizePlatformMix = (rows, since) => {
  const memberKeys = new Set();
  const members = emptyCounts();
  const visitors = emptyCounts();
  const sinceMs = since.getTime();

  for (const row of rows) {
    if (Date.parse(row.last_seen_at) < sinceMs) continue;
    const bucket = platformBucket(row.platform);
    if (row.audience === "member" && row.user_id) {
      const key = `${row.user_id}:${bucket}`;
      if (memberKeys.has(key)) continue;
      memberKeys.add(key);
      members[bucket] += 1;
    } else if (row.audience === "visitor") {
      visitors[bucket] += 1;
    }
  }

  return { members, visitors };
};

/**
 * Every platform a member has used, most recently seen first, so the admin
 * can show "Android" for a switcher rather than a stale iOS install.
 *
 * @param {PresenceRow[]} rows
 * @returns {Map<string, UserPlatform[]>}
 */
export const platformsByUser = (rows) => {
  /** @type {Map<string, Map<string, UserPlatform>>} */
  const byUser = new Map();
  for (const row of rows) {
    if (!row.user_id) continue;
    const platforms = byUser.get(row.user_id) ?? new Map();
    const existing = platforms.get(row.platform);
    if (!existing || existing.lastSeenAt < row.last_seen_at) {
      platforms.set(row.platform, {
        platform: /** @type {UserPlatform["platform"]} */ (row.platform),
        appVersion: row.app_version,
        lastSeenAt: row.last_seen_at,
      });
    }
    byUser.set(row.user_id, platforms);
  }

  return new Map(
    [...byUser].map(([userId, platforms]) => [
      userId,
      [...platforms.values()].sort((a, b) =>
        b.lastSeenAt.localeCompare(a.lastSeenAt)
      ),
    ])
  );
};
