import { supabase } from "./supabase";
import databaseService from "@/services/databaseService";

/**
 * @deprecated Use databaseService.getBlockedUserIds() instead for better caching and consistency
 * Get list of user IDs that the current user has blocked
 * @param currentUserId - The ID of the current user
 * @returns Array of blocked user IDs
 */
export const getBlockedUserIds = async (currentUserId: string): Promise<string[]> => {
  // Use databaseService for consistency and caching
  return databaseService.getBlockedUserIds(currentUserId);
};

/**
 * Get list of user IDs that have blocked the current user
 * @param currentUserId - The ID of the current user
 * @returns Array of user IDs who have blocked the current user
 */
export const getBlockedByUserIds = async (currentUserId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("blocks")
      .select("blocker_id")
      .eq("blocked_id", currentUserId);

    if (error) {
      console.error("Error fetching users who blocked current user:", error);
      return [];
    }

    return data.map((block: any) => block.blocker_id);
  } catch (err) {
    console.error("Unexpected error fetching users who blocked current user:", err);
    return [];
  }
};
