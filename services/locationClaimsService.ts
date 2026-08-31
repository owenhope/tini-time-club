import { supabase } from "@/utils/supabase";

export interface LocationClaimStatus {
  id: string;
  location_id: number;
  status: "pending" | "approved" | "rejected" | "superseded";
  submitted_at: string;
  decided_at: string | null;
  rejection_reason: string | null;
  superseded_by_claim_id: string | null;
  resubmission_at: string | null;
  can_resubmit: boolean;
}

export interface LocationClaimReceipt {
  id: string;
  locationId: number;
  status: "pending";
  submittedAt: string;
}

const asStatus = (value: unknown): LocationClaimStatus | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.location_id !== "number" ||
    typeof row.status !== "string" ||
    typeof row.submitted_at !== "string"
  ) {
    return null;
  }
  return {
    id: row.id,
    location_id: row.location_id,
    status: row.status as LocationClaimStatus["status"],
    submitted_at: row.submitted_at,
    decided_at: typeof row.decided_at === "string" ? row.decided_at : null,
    rejection_reason:
      typeof row.rejection_reason === "string" ? row.rejection_reason : null,
    superseded_by_claim_id:
      typeof row.superseded_by_claim_id === "string"
        ? row.superseded_by_claim_id
        : null,
    resubmission_at:
      typeof row.resubmission_at === "string" ? row.resubmission_at : null,
    can_resubmit: row.can_resubmit === true,
  };
};

export async function getMyLocationClaimStatus(
  locationId: string | number
): Promise<LocationClaimStatus | null> {
  const { data, error } = await supabase.rpc("get_my_location_claim_status", {
    p_location_id: Number(locationId),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return asStatus(row);
}

export async function getCurrentAccountEmail(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.email ?? null;
}

export async function submitLocationClaim(input: {
  locationId: string | number;
  businessRole: string;
  businessEmail: string;
  phone?: string;
  explanation: string;
}): Promise<LocationClaimReceipt> {
  const { data, error } = await supabase.rpc("submit_location_claim", {
    p_location_id: Number(input.locationId),
    p_business_role: input.businessRole.trim(),
    p_business_email: input.businessEmail.trim(),
    p_phone: input.phone?.trim() || null,
    p_explanation: input.explanation.trim(),
  });
  if (error) throw error;
  if (!data || typeof data !== "object") {
    throw new Error("Claim submission returned an invalid receipt");
  }
  const receipt = data as Record<string, unknown>;
  if (
    typeof receipt.id !== "string" ||
    typeof receipt.locationId !== "number" ||
    receipt.status !== "pending" ||
    typeof receipt.submittedAt !== "string"
  ) {
    throw new Error("Claim submission returned an invalid receipt");
  }
  return {
    id: receipt.id,
    locationId: receipt.locationId,
    status: "pending",
    submittedAt: receipt.submittedAt,
  };
}
