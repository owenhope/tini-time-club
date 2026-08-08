import type { Href } from "expo-router";

/**
 * Typed route builders for every screen the app navigates to.
 *
 * Each builder returns exactly the shape its call sites pass to the router
 * today — a plain path string, a path with a query string, or the
 * `{ pathname, params }` object form — so swapping them in changes no
 * behavior. `satisfies Href` keeps every builder checked against the
 * generated expo-router typed routes while preserving the narrow literal
 * return types (useful e.g. for comparing a route against `usePathname()`).
 */

/** Params accepted by the review screen to pre-fill a location. */
export type ReviewLocationParams = {
  locationName: string;
  locationAddress: string;
  locationLat?: string;
  locationLon?: string;
};

/** Params that reopen an existing review in the composer. */
export type EditReviewParams = {
  editReviewId: string;
};

/** Params for the favorite-location picker screen. */
export type FavoriteLocationParams = {
  hasFavoriteLocation: "0" | "1";
  saveImmediately?: "1";
};

/** Params shown on the place-info screen. */
export type PlaceInfoParams = {
  locationId: string | number;
  name: string;
  address: string;
  lat: string;
  lon: string;
};

/** Params that focus the places map on a location. */
export type PlacesMapParams = {
  lat: string;
  lon: string;
  locationId: string | number;
};

/** Params that tell the feed to force-refresh after a new post. */
export type HomeParams = {
  postedReviewId?: string;
  feedRefresh?: string;
};

export type DiscoverParams = {
  tab?: "places" | "members";
};

export type ReviewShareFormat = "story" | "post";

export const routes = {
  /** Welcome / sign-in landing screen. */
  welcome: () => "/" as const satisfies Href,

  /** Main feed tab. */
  home: (params?: HomeParams) =>
    (params
      ? ({ pathname: "/home", params } as const)
      : ("/home" as const)) satisfies Href,

  /** Auth (email sign-in/sign-up) screen. */
  auth: () => "/auth" as const satisfies Href,

  /** One-time new-member setup and EULA flow. */
  onboarding: () => "/onboarding" as const satisfies Href,

  /** Password reset screen (recovery deep links land here). */
  resetPassword: () => "/reset-password" as const satisfies Href,

  /** Discover tab. */
  discover: (params?: DiscoverParams) =>
    (params
      ? ({ pathname: "/discover", params } as const)
      : ("/discover" as const)) satisfies Href,

  /** Own profile tab. */
  profile: () => "/profile" as const satisfies Href,

  /** Settings screen inside the profile stack. */
  settings: () => "/settings" as const satisfies Href,

  /** Notification preferences screen inside the profile stack. */
  notifications: () => "/notifications" as const satisfies Href,

  /** Terms of service screen. */
  terms: () => "/terms" as const satisfies Href,

  /** Account deletion screen. */
  deleteAccount: () => "/delete-account" as const satisfies Href,

  /** Edit-profile form. */
  editProfile: () => "/edit-profile" as const satisfies Href,

  /** Shared review deep link, also used by public web links. */
  sharedReview: (reviewId: string | number) =>
    `/r/${reviewId}` as const satisfies Href,

  /** Favorite-location picker. */
  favoriteLocation: (params: FavoriteLocationParams) =>
    ({ pathname: "/favorite-location", params }) as const satisfies Href,

  /**
   * Review tab — optionally pre-filled with a location (name/address and,
   * when known, coordinates).
   */
  review: (params?: ReviewLocationParams | EditReviewParams) =>
    (params
      ? ({ pathname: "/review", params } as const)
      : ("/review" as const)) satisfies Href,

  /** Reopen an owned review in the full composer. */
  editReview: (reviewId: string | number) =>
    ({
      pathname: "/review",
      params: { editReviewId: String(reviewId) },
    }) as const satisfies Href,

  /** Compose a social image from any review with a usable photo. */
  reviewSharePreview: (reviewId: string | number, format: ReviewShareFormat) =>
    ({
      pathname: "/review-share-preview",
      params: { reviewId: String(reviewId), format },
    }) as const satisfies Href,

  /**
   * A place's profile. Extra `name`/`address` params let the screen render
   * a header before the location record loads.
   */
  place: (
    placeId: string | number,
    params?: { name: string; address: string }
  ) =>
    (params
      ? ({
          pathname: "/places/[place]",
          params: { place: placeId, ...params },
        } as const)
      : (`/places/${placeId}` as const)) satisfies Href,

  /** Place details/info sheet. */
  placeInfo: (params: PlaceInfoParams) =>
    ({ pathname: "/place-info", params }) as const satisfies Href,

  /** Places map tab — optionally focused on a specific location. */
  places: (params?: PlacesMapParams) =>
    (params
      ? ({ pathname: "/places", params } as const)
      : ("/places" as const)) satisfies Href,

  /** Another user's profile. */
  user: (username: string) => `/users/${username}` as const satisfies Href,

  /** A user's followers list. */
  followers: (username: string) =>
    `/users/${username}/followers` as const satisfies Href,

  /** A user's following list. */
  following: (username: string) =>
    `/users/${username}/following` as const satisfies Href,
};
