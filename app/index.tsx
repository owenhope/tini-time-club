/**
 * Inert launch route.
 *
 * Expo Router initializes at `/` before persisted auth has resolved. Keeping
 * this route empty guarantees that mounting the root navigator cannot mount
 * the Welcome experience underneath the native splash. RootLayoutNav replaces
 * it with Welcome, Onboarding, or Home once startup state is known.
 */
export default function StartupGate() {
  return null;
}
