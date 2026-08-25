/**
 * Review uploads are already resized and compressed before they reach
 * Storage. Public delivery should therefore use the signed object URL as-is,
 * rather than invoking Storage's runtime image transformation service.
 */
export const toReviewImageDeliveryUrl = (signedUrl: string): string =>
  signedUrl;
