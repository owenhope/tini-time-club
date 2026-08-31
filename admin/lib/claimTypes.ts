export type LocationClaimStatus =
  "pending" | "approved" | "rejected" | "superseded";

export const formatLocationClaimStatus = (status: LocationClaimStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1);

export interface AdminLocationClaim {
  id: string;
  location_id: number;
  location_name: string | null;
  location_address: string | null;
  requester_profile_id: string | null;
  username: string | null;
  profile_name: string | null;
  contact_name: string | null;
  account_email: string | null;
  business_email: string | null;
  business_role: string;
  phone: string | null;
  explanation: string | null;
  status: LocationClaimStatus;
  submitted_at: string;
  decided_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  superseded_by_claim_id: string | null;
  requester_redacted_at: string | null;
}

export interface AdminLocationClaimDetail {
  claim: AdminLocationClaim;
  location: {
    id: number;
    name: string | null;
    address: string | null;
    place_id: string | null;
  };
  previousClaims: AdminLocationClaim[];
  verifications: Array<{
    id: string;
    source_claim_id: string;
    restored_from_verification_id: string | null;
    verified_at: string;
    verification_reason: string | null;
    revoked_at: string | null;
    revocation_reason: string | null;
  }>;
  managers: Array<{
    id: string;
    profile_id: string | null;
    status: "active" | "removed";
    added_at: string;
    removed_at: string | null;
    removal_reason: string | null;
    username: string | null;
    profile_name: string | null;
  }>;
}
