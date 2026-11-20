import Constants from "expo-constants";
import * as Updates from "expo-updates";

/**
 * "Version 5.0.0", plus the short id of the over-the-air update when one is
 * running, so support can tell exactly which JS a member has.
 */
export function appVersionLabel(
  version = Constants.expoConfig?.version,
  update: { isEmbeddedLaunch: boolean; updateId: string | null } = Updates
): string {
  const base = `Version ${version ?? "unknown"}`;
  if (update.isEmbeddedLaunch || !update.updateId) return base;
  return `${base} · update ${update.updateId.slice(0, 8)}`;
}
