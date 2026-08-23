/**
 * @typedef {object} ProductTelemetry
 * @property {boolean} available
 * @property {number} trackedInstallations
 * @property {{version: string, installations: number, share: number}[]} versions
 * @property {{eligibleInstallations: number, returnedInstallations: number, rate: number | null}} retention
 * @property {{unexpectedSignOuts: number, sessionMissingAtLaunch: number, affectedInstallations: number, issueRate: number | null}} authHealth
 */

/** @returns {ProductTelemetry} */
const unavailableProductTelemetry = () => ({
  available: false,
  trackedInstallations: 0,
  versions: [],
  retention: {
    eligibleInstallations: 0,
    returnedInstallations: 0,
    rate: null,
  },
  authHealth: {
    unexpectedSignOuts: 0,
    sessionMissingAtLaunch: 0,
    affectedInstallations: 0,
    issueRate: null,
  },
});

/**
 * Convert the service-role-only database summary into the stable interface the
 * dashboard renders. A missing RPC is expected during additive deployments;
 * unrelated database failures remain visible.
 *
 * @param {Record<string, any> | null} data
 * @param {{code?: string, message: string} | null} error
 * @returns {ProductTelemetry}
 */
export const resolveProductTelemetryResponse = (data, error) => {
  if (error) {
    if (error.code === "PGRST202") return unavailableProductTelemetry();
    throw new Error(`Unable to load product telemetry: ${error.message}`);
  }

  const versions = Array.isArray(data?.versions) ? data.versions : [];
  const trackedInstallations = versions.reduce(
    (sum, row) => sum + Number(row.installations ?? 0),
    0
  );
  const eligibleInstallations = Number(
    data?.retention?.eligibleInstallations ?? 0
  );
  const returnedInstallations = Number(
    data?.retention?.returnedInstallations ?? 0
  );
  const affectedInstallations = Number(
    data?.authHealth?.affectedInstallations ?? 0
  );

  return {
    available: true,
    trackedInstallations,
    versions: versions.map((row) => {
      const installations = Number(row.installations ?? 0);
      return {
        version: String(row.version ?? "unknown"),
        installations,
        share:
          trackedInstallations > 0
            ? Math.round((installations / trackedInstallations) * 100)
            : 0,
      };
    }),
    retention: {
      eligibleInstallations,
      returnedInstallations,
      rate:
        eligibleInstallations > 0
          ? Math.round((returnedInstallations / eligibleInstallations) * 100)
          : null,
    },
    authHealth: {
      unexpectedSignOuts: Number(data?.authHealth?.unexpectedSignOuts ?? 0),
      sessionMissingAtLaunch: Number(
        data?.authHealth?.sessionMissingAtLaunch ?? 0
      ),
      affectedInstallations,
      issueRate:
        trackedInstallations > 0
          ? Number(
              ((affectedInstallations / trackedInstallations) * 100).toFixed(1)
            )
          : null,
    },
  };
};
