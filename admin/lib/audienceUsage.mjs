/**
 * @typedef {object} AudienceUsage
 * @property {boolean} available
 * @property {number} visitorActiveNow
 * @property {number} memberActiveNow
 * @property {number} visitorInRange
 * @property {number} memberInRange
 * @property {number} convertedInRange
 * @property {{day: string, count: number}[]} visitorByDay
 * @property {{day: string, count: number}[]} memberByDay
 */

/** @returns {AudienceUsage} */
const unavailableAudienceUsage = () => ({
  available: false,
  visitorActiveNow: 0,
  memberActiveNow: 0,
  visitorInRange: 0,
  memberInRange: 0,
  convertedInRange: 0,
  visitorByDay: [],
  memberByDay: [],
});

/**
 * Keep the admin usable while the additive app-usage schema is being rolled
 * out to an environment. Other database failures must still surface.
 *
 * @param {Record<string, any> | null} data
 * @param {{code?: string, message: string} | null} error
 * @returns {AudienceUsage}
 */
export const resolveAudienceUsageResponse = (data, error) => {
  if (error) {
    if (error.code === "PGRST202") return unavailableAudienceUsage();
    throw new Error(`Unable to load app audience: ${error.message}`);
  }

  const summary = data ?? {};
  const byDay = Array.isArray(summary.byDay) ? summary.byDay : [];
  return {
    available: true,
    visitorActiveNow: Number(summary.visitorActiveNow ?? 0),
    memberActiveNow: Number(summary.memberActiveNow ?? 0),
    visitorInRange: Number(summary.visitorInRange ?? 0),
    memberInRange: Number(summary.memberInRange ?? 0),
    convertedInRange: Number(summary.convertedInRange ?? 0),
    visitorByDay: byDay.map((row) => ({
      day: String(row.day),
      count: Number(row.visitors ?? 0),
    })),
    memberByDay: byDay.map((row) => ({
      day: String(row.day),
      count: Number(row.members ?? 0),
    })),
  };
};
