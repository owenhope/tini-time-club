import { routes } from "@/utils/routes";

export const SWIPE_TAB_ROUTES = [
  routes.home(),
  routes.discover(),
  routes.martiniIndex(),
  routes.profile(),
] as const;

const SWIPE_DISTANCE = 64;

/**
 * Returns the adjacent root tab for a completed horizontal swipe.
 * Review and all pushed/detail routes intentionally return null.
 */
export const getSwipeTabDestination = (
  pathname: string,
  translationX: number
) => {
  if (Math.abs(translationX) < SWIPE_DISTANCE) return null;

  const currentIndex = SWIPE_TAB_ROUTES.findIndex(
    (route) => route === pathname
  );
  if (currentIndex < 0) return null;

  // A left swipe advances through the tabs; a right swipe goes back.
  const nextIndex = currentIndex + (translationX < 0 ? 1 : -1);
  return SWIPE_TAB_ROUTES[nextIndex] ?? null;
};
