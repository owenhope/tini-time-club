import type { AdminProfile } from "@/lib/profileTypes";

export interface AuthUserSummary {
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
}

export const enrichAdminProfile = (
  profile: AdminProfile,
  authUser?: AuthUserSummary
): AdminProfile => ({
  ...profile,
  ...authUser,
});
