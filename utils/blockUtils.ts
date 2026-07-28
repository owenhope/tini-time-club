import { supabase } from "./supabase";
import databaseService from "@/services/databaseService";

/**
 * @deprecated Use databaseService.getBlockedUserIds() instead for better caching and consistency
 * Get list of user IDs that the current user has blocked
 * @param currentUserId - The ID of the current user
 * @returns Array of blocked user IDs
 */
export const getBlockedUserIds = async (
  currentUserId: string
): Promise<string[]> => {
  // Use databaseService for consistency and caching
  return databaseService.getBlockedUserIds(currentUserId);
};

/**
 * Get list of user IDs that have blocked the current user
 * @param currentUserId - The ID of the current user
 * @returns Array of user IDs who have blocked the current user
 */
