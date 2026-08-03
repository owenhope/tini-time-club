import { useCallback } from "react";
import { useRouter, type Href } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { routes } from "@/utils/routes";

/**
 * Open a member's profile.
 *
 * Every surface that shows a person had its own idea of what tapping you
 * should do: the regulars rail sent you to your own tab, the comments sheet
 * ignored the tap entirely, the review card made your own name unpressable,
 * and Discover happily opened your visitor profile — complete with a Follow
 * button pointed at yourself. One rule instead: your own row goes to your
 * Profile tab, everyone else's is pushed onto the current stack.
 */
export const useOpenProfile = () => {
  const router = useRouter();
  const { profile } = useProfile();

  return useCallback(
    (username?: string | null, profileId?: string | number | null) => {
      if (!username) return;

      const isSelf =
        (profileId != null && String(profileId) === String(profile?.id)) ||
        username === profile?.username;

      if (isSelf) {
        router.navigate(routes.profile());
        return;
      }

      // Shared route: resolves inside whichever tab stack is rendering.
      router.push(routes.user(username));
    },
    [router, profile?.id, profile?.username]
  );
};

/**
 * Go back, or to a sensible place when there is no back.
 *
 * A screen reached by a deep link — or by a redirect route that `replace`d
 * itself — is the only entry in its stack, so `router.back()` there dispatches
 * a GO_BACK no navigator can handle and the button does nothing but log an
 * error.
 */
export const useGoBack = (fallback: Href = routes.home()) => {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallback);
  }, [router, fallback]);
};
