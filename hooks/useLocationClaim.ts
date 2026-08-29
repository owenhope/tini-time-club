import { useCallback, useEffect, useState } from "react";
import {
  getCurrentAccountEmail,
  getMyLocationClaimStatus,
  submitLocationClaim,
  type LocationClaimReceipt,
  type LocationClaimStatus,
} from "@/services/locationClaimsService";
import { reportError } from "@/utils/log";

export function useLocationClaim(
  locationId: string | number,
  enabled: boolean
) {
  const [status, setStatus] = useState<LocationClaimStatus | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !locationId) return;
    setLoading(true);
    try {
      const [nextStatus, email] = await Promise.all([
        getMyLocationClaimStatus(locationId),
        getCurrentAccountEmail(),
      ]);
      setStatus(nextStatus);
      setAccountEmail(email);
    } catch (error) {
      reportError("Unable to load location claim status:", error);
    } finally {
      setLoading(false);
    }
  }, [enabled, locationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(
    async (input: {
      businessRole: string;
      businessEmail: string;
      phone?: string;
      explanation: string;
    }): Promise<LocationClaimReceipt> => {
      setSubmitting(true);
      try {
        const receipt = await submitLocationClaim({ locationId, ...input });
        await refresh();
        return receipt;
      } finally {
        setSubmitting(false);
      }
    },
    [locationId, refresh]
  );

  return { status, accountEmail, loading, submitting, submit, refresh };
}
