import { useEffect, useState } from "react";
import { isUsernameAvailable } from "@/services/onboardingService";
import { reportError } from "@/utils/log";
import { getUsernameError } from "@/utils/username";

export type UsernameCheck =
  | { status: "unchanged" }
  | { status: "invalid"; message: string }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" }
  | { status: "error" };

type Lookup = { name: string; status: "available" | "taken" | "error" };

/**
 * Checks a username as it is typed: format rules immediately, then
 * availability after a short pause so each keystroke isn't a query.
 */
export function useUsernameCheck(
  candidate: string,
  currentUsername: string | undefined,
  profileId: string | undefined,
  delayMs = 450
): UsernameCheck {
  const name = candidate.trim();
  const unchanged = name === (currentUsername ?? "");
  const formatError = unchanged ? null : getUsernameError(name);
  const [lookup, setLookup] = useState<Lookup | null>(null);

  useEffect(() => {
    if (unchanged || formatError || !profileId) return;

    let active = true;
    const timeout = setTimeout(() => {
      isUsernameAvailable(name, profileId)
        .then((available) => {
          if (active)
            setLookup({ name, status: available ? "available" : "taken" });
        })
        .catch((error) => {
          if (!active) return;
          reportError("Error checking username:", error);
          setLookup({ name, status: "error" });
        });
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [delayMs, formatError, name, profileId, unchanged]);

  if (unchanged) return { status: "unchanged" };
  if (formatError) return { status: "invalid", message: formatError };
  // A result for an earlier spelling is stale until this one comes back.
  if (lookup?.name === name) return { status: lookup.status };
  return { status: "checking" };
}
