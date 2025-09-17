/**
 * Utility functions for calculating and formatting location ratings
 */

export interface LocationRating {
  taste_avg?: number;
  presentation_avg?: number;
  rating?: number;
  total_ratings?: number;
}

/**
 * Calculate the overall rating from taste and presentation averages
 * @param tasteAvg - Average taste rating
 * @param presentationAvg - Average presentation rating
 * @returns Overall rating (average of taste and presentation)
 */
export const calculateOverallRating = (
  tasteAvg?: number,
  presentationAvg?: number
): number | null => {
  if (tasteAvg === undefined || presentationAvg === undefined) {
    return null;
  }
  
  return (tasteAvg + presentationAvg) / 2;
};

/**
 * Format a rating number to display string
 * @param rating - Rating number
 * @param decimalPlaces - Number of decimal places (default: 1)
 * @returns Formatted rating string or "N/A" if rating is null/undefined
 */
export const formatRating = (
  rating?: number | null,
  decimalPlaces: number = 1
): string => {
  if (rating === null || rating === undefined) {
    return "N/A";
  }
  
  return rating.toFixed(decimalPlaces);
};

/**
 * Get the overall rating for a location, calculating it if not provided
 * @param location - Location object with rating data
 * @returns Overall rating number or null
 */
export const getLocationOverallRating = (location: LocationRating): number | null => {
  // If rating is already calculated, use it
  if (location.rating !== undefined) {
    return location.rating;
  }
  
  // Otherwise calculate from taste and presentation
  return calculateOverallRating(location.taste_avg, location.presentation_avg);
};

/**
 * Get formatted overall rating string for a location
 * @param location - Location object with rating data
 * @param decimalPlaces - Number of decimal places (default: 1)
 * @returns Formatted rating string
 */
export const getLocationRatingDisplay = (
  location: LocationRating,
  decimalPlaces: number = 1
): string => {
  const rating = getLocationOverallRating(location);
  return formatRating(rating, decimalPlaces);
};

/**
 * Get the total number of reviews for a location
 * @param location - Location object with rating data
 * @returns Number of reviews or 0
 */
export const getLocationReviewCount = (location: LocationRating): number => {
  return location.total_ratings ?? 0;
};
