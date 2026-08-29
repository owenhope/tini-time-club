import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  AdminLocationClaim,
  AdminLocationClaimDetail,
  LocationClaimStatus,
} from "@/lib/claimTypes";

const db = supabaseAdmin;

export async function fetchLocationClaims(
  status?: LocationClaimStatus,
  search?: string,
  page = 1,
  perPage = 50
): Promise<{
  claims: AdminLocationClaim[];
  total: number;
  pendingCount: number;
}> {
  const { data, error } = await db().rpc("get_admin_location_claims_page", {
    p_status: status ?? null,
    p_search: search?.trim() || null,
    p_page: page,
    p_per_page: perPage,
  });
  if (error) throw toAdminDataError(error, "load location claims");
  const result = (data ?? {}) as Record<string, unknown>;
  return {
    claims: (Array.isArray(result.claims)
      ? result.claims
      : []) as AdminLocationClaim[],
    total: Number(result.total) || 0,
    pendingCount: Number(result.pendingCount) || 0,
  };
}

export async function fetchLocationClaimDetail(
  claimId: string
): Promise<AdminLocationClaimDetail | null> {
  const { data, error } = await db().rpc("get_admin_location_claim_detail", {
    p_claim_id: claimId,
  });
  if (error) throw toAdminDataError(error, "load location claim detail");
  return (data ?? null) as AdminLocationClaimDetail | null;
}
