type ReviewUpdatedListener = (reviewId: string) => void;

const reviewUpdatedListeners = new Set<ReviewUpdatedListener>();

export const publishReviewUpdated = (reviewId: string) => {
  reviewUpdatedListeners.forEach((listener) => listener(reviewId));
};

export const subscribeToReviewUpdates = (listener: ReviewUpdatedListener) => {
  reviewUpdatedListeners.add(listener);
  return () => {
    reviewUpdatedListeners.delete(listener);
  };
};
