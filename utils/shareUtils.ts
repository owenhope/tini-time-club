import { Review } from "@/types/types";
import { stripNameFromAddress, formatRelativeDate } from "./helpers";
import { generateReviewDeepLink, generateReviewWebUrl } from "./deepLinkUtils";

export interface ShareContent {
  text: string;
  url: string;
  title: string;
  description: string;
}

export interface ShareOptions {
  includeLocation?: boolean;
  includeRatings?: boolean;
  includeHashtags?: boolean;
  includeDeepLink?: boolean;
  customMessage?: string;
}

const DEFAULT_OPTIONS: ShareOptions = {
  includeLocation: true,
  includeRatings: true,
  includeHashtags: true,
  includeDeepLink: true,
};

/**
 * Generate shareable content for a review
 */
export const generateShareContent = (
  review: Review,
  options: ShareOptions = {}
): ShareContent => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const location = review.location?.name || "Unknown Location";
  const username = review.profile?.username || "Unknown User";
  const spirit = review.spirit?.name || "Unknown Spirit";
  const type = review.type?.name || "Unknown Type";
  const comment = review.comment || "";
  const taste = review.taste || 0;
  const presentation = review.presentation || 0;
  
  // Generate base text
  let text = "";
  
  if (opts.customMessage) {
    text = opts.customMessage;
  } else {
    text = `🍸 Check out this ${spirit} ${type} review from ${username}`;
    
    if (opts.includeLocation) {
      text += ` at ${location}`;
    }
    
    if (comment) {
      text += `!\n\n"${comment}"`;
    }
    
    if (opts.includeRatings) {
      text += `\n\n⭐ Taste: ${taste}/5 | 🎨 Presentation: ${presentation}/5`;
    }
    
    if (opts.includeHashtags) {
      text += `\n\n#TiniTimeClub #MartiniReview #CocktailReview #${spirit.replace(/\s+/g, '')} #${type.replace(/\s+/g, '')}`;
    }
  }
  
  // Generate deep link
  const deepLink = generateDeepLink(review);
  
  // Generate title and description
  const title = `${spirit} ${type} Review - ${location}`;
  const description = comment || `A ${taste}/5 taste and ${presentation}/5 presentation review from ${username}`;
  
  return {
    text: opts.includeDeepLink ? `${text}\n\n${deepLink}` : text,
    url: deepLink,
    title,
    description,
  };
};

/**
 * Generate a deep link for a review
 */
export const generateDeepLink = (review: Review): string => {
  return generateReviewDeepLink(review.id);
};

/**
 * Generate Instagram Stories specific content
 */
export const generateInstagramStoriesContent = (review: Review): string => {
  const location = review.location?.name || "Unknown Location";
  const username = review.profile?.username || "Unknown User";
  const spirit = review.spirit?.name || "Unknown Spirit";
  const type = review.type?.name || "Unknown Type";
  const comment = review.comment || "";
  
  return `🍸 ${spirit} ${type} at ${location}\nby ${username}\n\n"${comment}"\n\n#TiniTimeClub #MartiniReview`;
};


/**
 * Generate Facebook specific content
 */
export const generateFacebookContent = (review: Review): string => {
  const location = review.location?.name || "Unknown Location";
  const username = review.profile?.username || "Unknown User";
  const spirit = review.spirit?.name || "Unknown Spirit";
  const type = review.type?.name || "Unknown Type";
  const comment = review.comment || "";
  const taste = review.taste || 0;
  const presentation = review.presentation || 0;
  
  return `🍸 Check out this amazing ${spirit} ${type} review from ${username} at ${location}!\n\n"${comment}"\n\n⭐ Taste: ${taste}/5 | 🎨 Presentation: ${presentation}/5\n\n#TiniTimeClub #MartiniReview #CocktailReview`;
};

/**
 * Generate WhatsApp specific content
 */
export const generateWhatsAppContent = (review: Review): string => {
  const location = review.location?.name || "Unknown Location";
  const username = review.profile?.username || "Unknown User";
  const spirit = review.spirit?.name || "Unknown Spirit";
  const type = review.type?.name || "Unknown Type";
  const comment = review.comment || "";
  
  return `🍸 *${spirit} ${type}* at *${location}*\nby ${username}\n\n"${comment}"\n\nCheck it out on Tini Time Club! 🍸`;
};

/**
 * Generate SMS specific content
 */
export const generateSMSContent = (review: Review): string => {
  const location = review.location?.name || "Unknown Location";
  const username = review.profile?.username || "Unknown User";
  const spirit = review.spirit?.name || "Unknown Spirit";
  const type = review.type?.name || "Unknown Type";
  const comment = review.comment || "";
  
  return `🍸 ${spirit} ${type} at ${location} by ${username}\n\n"${comment}"\n\nCheck it out on Tini Time Club!`;
};

/**
 * Generate email specific content
 */
export const generateEmailContent = (review: Review): string => {
  const location = review.location?.name || "Unknown Location";
  const username = review.profile?.username || "Unknown User";
  const spirit = review.spirit?.name || "Unknown Spirit";
  const type = review.type?.name || "Unknown Type";
  const comment = review.comment || "";
  const taste = review.taste || 0;
  const presentation = review.presentation || 0;
  const date = formatRelativeDate(review.inserted_at);
  
  return `Check out this ${spirit} ${type} review from Tini Time Club!

Location: ${location}
Reviewer: ${username}
Date: ${date}

Rating:
- Taste: ${taste}/5 stars
- Presentation: ${presentation}/5 stars

Comment: "${comment}"

View the full review and discover more amazing cocktails at Tini Time Club!`;
};

/**
 * Generate platform-specific content
 */
export const generatePlatformContent = (
  review: Review,
  platform: "instagram" | "facebook" | "whatsapp" | "sms" | "email" | "stories"
): string => {
  switch (platform) {
    case "instagram":
    case "stories":
      return generateInstagramStoriesContent(review);
    case "facebook":
      return generateFacebookContent(review);
    case "whatsapp":
      return generateWhatsAppContent(review);
    case "sms":
      return generateSMSContent(review);
    case "email":
      return generateEmailContent(review);
    default:
      return generateShareContent(review).text;
  }
};

/**
 * Validate if content fits within platform limits
 */
export const validateContentLength = (
  content: string,
  platform: "sms" | "instagram"
): { isValid: boolean; length: number; maxLength: number } => {
  const limits = {
    sms: 160,
    instagram: 2200,
  };
  
  const maxLength = limits[platform];
  const length = content.length;
  
  return {
    isValid: length <= maxLength,
    length,
    maxLength,
  };
};

/**
 * Truncate content to fit platform limits
 */
export const truncateContent = (
  content: string,
  platform: "sms" | "instagram",
  maxLength?: number
): string => {
  const limits = {
    sms: 160,
    instagram: 2200,
  };
  
  const limit = maxLength || limits[platform];
  
  if (content.length <= limit) {
    return content;
  }
  
  // Truncate and add ellipsis
  return content.substring(0, limit - 3) + "...";
};
