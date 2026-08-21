// Screens that start a sign-out (Settings) navigate to Welcome immediately so
// the member shell never re-renders for a visitor while the sign-out request
// is in flight. The root auth listener also navigates on SIGNED_OUT as the
// fallback for every other sign-out cause (expired session, account gone).
// This handoff tells the listener the transition is already done, without
// racing on the current pathname. It lives apart from clearUserCaches so
// tests can mock the cache module while keeping the real handoff contract.
let explicitSignOutNavigationAt = 0;

export const markExplicitSignOutNavigation = (): void => {
  explicitSignOutNavigationAt = Date.now();
};

/**
 * True when a screen navigated for this sign-out moments ago. Consuming
 * resets the mark, and stale marks (a failed sign-out that never emitted
 * SIGNED_OUT) expire so a later session expiry still navigates.
 */
export const consumeExplicitSignOutNavigation = (): boolean => {
  const recent =
    explicitSignOutNavigationAt !== 0 &&
    Date.now() - explicitSignOutNavigationAt < 10_000;
  explicitSignOutNavigationAt = 0;
  return recent;
};
