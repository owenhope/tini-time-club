import React, { useCallback, useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter, type Href } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useProfile } from "@/context/profile-context";
import * as Notifications from "expo-notifications";
import { typography, useTheme } from "@/theme";
import {
  getNotificationRoute,
  arePushNotificationsEnabled,
  registerPushNotificationsAsync,
  unregisterPushNotificationsAsync,
  subscribeToPushRegistrationRetry,
  subscribeToPushTokenChanges,
} from "@/services/pushNotificationService";
import { syncFridayMartiniReminder } from "@/utils/martiniReminder";
import { logNotificationOpen } from "@/utils/notificationOpens";
import { routes } from "@/utils/routes";
import { getGlobalScrollToTop } from "@/utils/scrollUtils";
import { getTabBarAccentForPath } from "@/utils/tabBarAccent";
import { useMembership } from "@/context/membership-context";
import type { MembershipIntent } from "@/utils/membership";
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from "@/context/tab-bar-visibility-context";

// Welcome's full-width "Discover Martinis" CTA occupies the strip of screen
// where the native tab bar mounts, so the tail of that tap can be delivered to
// the gated Review/Profile triggers the moment this layout appears under the
// finger. A press that arrives this soon after mount cannot be intentional.
const GHOST_TAP_GRACE_MS = 700;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert was split into banner/list in SDK 53+
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const LayoutContent = () => {
  const { profile, loading } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const { requireMembership } = useMembership();
  const { hidden: tabBarHidden } = useTabBarVisibility();
  const pathname = usePathname();
  const [hasResolvedProfileOnce, setHasResolvedProfileOnce] = useState(false);
  const mountedAtRef = useRef<number | null>(null);
  const gateTabPress = useCallback(
    (intent: MembershipIntent) => {
      if (
        mountedAtRef.current === null ||
        Date.now() - mountedAtRef.current < GHOST_TAP_GRACE_MS
      ) {
        return;
      }
      requireMembership(intent);
    },
    [requireMembership]
  );
  const tabBarAccent = getTabBarAccentForPath(pathname);
  const tabBarActiveColor =
    tabBarAccent === "purple" ? colors.accent : colors.secondary;

  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!profile?.eula_accepted || !profile.username) return;

    const syncToken = (requestPermission = false) => {
      if (!arePushNotificationsEnabled()) {
        void unregisterPushNotificationsAsync();
        void syncFridayMartiniReminder(false);
        return;
      }
      void registerPushNotificationsAsync({ requestPermission }).then(() => {
        // Local weekly nudge; no-op until notification permission is granted.
        void syncFridayMartiniReminder(
          profile.weekly_push_notifications_enabled ?? true
        );
      });
    };

    const handleResponse = (response: Notifications.NotificationResponse) => {
      logNotificationOpen(response);
      const route = getNotificationRoute(response);
      // getNotificationRoute only returns strings matching an allowlist of
      // internal routes, so this cast narrows a validated string, not junk.
      if (route) router.push(route as Href);
    };

    syncToken(true);

    const tokenSubscription = subscribeToPushTokenChanges(() => syncToken());
    const retrySubscription = subscribeToPushRegistrationRetry(() =>
      syncToken()
    );
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      handleResponse(response);
      void Notifications.clearLastNotificationResponseAsync();
    });

    return () => {
      tokenSubscription.remove();
      retrySubscription.remove();
      responseSubscription.remove();
    };
  }, [
    profile?.eula_accepted,
    profile?.id,
    profile?.username,
    profile?.weekly_push_notifications_enabled,
    router,
  ]);

  useEffect(() => {
    if (!loading && profile && (!profile.username || !profile.eula_accepted)) {
      router.replace(routes.onboarding());
    }
  }, [loading, profile, router]);

  // Blank the tabs only before the first profile resolution (so a cold start
  // cannot flash the wrong tree) and for accounts still in onboarding. Every
  // later `loading` flip — most visibly the SIGNED_IN profile fetch — must
  // keep the tree mounted: unmounting NativeTabs mid sign-in blacked out the
  // screen behind the auth card and remounted the tabs as a second visible
  // transition once the profile arrived.
  useEffect(() => {
    if (!loading) {
      // This intentionally latches the first completed external profile read.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasResolvedProfileOnce(true);
    }
  }, [loading]);
  if (
    (loading && !hasResolvedProfileOnce) ||
    (profile && (!profile.username || !profile.eula_accepted))
  ) {
    return null;
  }

  return (
    <NativeTabs
      hidden={tabBarHidden}
      tintColor={tabBarActiveColor}
      backgroundColor={colors.tabBar}
      shadowColor={colors.divider}
      iconColor={{
        default: colors.tabBarInactive,
        selected: tabBarActiveColor,
      }}
      labelStyle={{
        default: {
          ...typography.label,
          color: colors.tabBarInactive,
        },
        selected: {
          ...typography.label,
          color: tabBarActiveColor,
        },
      }}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger
        name="(home)"
        accessibilityLabel="Feed"
        listeners={{
          tabPress: () => {
            if (pathname === routes.home()) {
              getGlobalScrollToTop()?.();
            }
          },
        }}
        contentStyle={{ backgroundColor: colors.background }}
      >
        <NativeTabs.Trigger.Icon
          // A single async vector source is intentional. Separate default and
          // selected vector promises can resolve out of order on cold start,
          // causing react-native-screens to receive selectedIcon without icon.
          src={
            <NativeTabs.Trigger.VectorIcon
              family={Ionicons}
              name="wine-outline"
            />
          }
          md={{ default: "local_bar", selected: "local_bar" }}
        />
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(discover)"
        accessibilityLabel="Explore"
        contentStyle={{ backgroundColor: colors.background }}
      >
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(review)"
        accessibilityLabel="Log a martini"
        // Members open the composer inside the tab navigator so the native tab
        // bar remains visible. Visitors stay gated without selecting the tab.
        disabled={!profile}
        listeners={
          profile
            ? undefined
            : {
                tabPress: () => {
                  gateTabPress("review");
                },
              }
        }
        contentStyle={{ backgroundColor: colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.circle", selected: "plus.circle.fill" }}
          md={{ default: "add_circle_outline", selected: "add_circle" }}
        />
        <NativeTabs.Trigger.Label>Review</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(index)"
        accessibilityLabel="Index"
        contentStyle={{ backgroundColor: colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "book.closed", selected: "book.closed.fill" }}
          md="library_books"
        />
        <NativeTabs.Trigger.Label>Index</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(profile)"
        accessibilityLabel="Profile"
        // Members use the native tab selection directly. Visitors keep the
        // tab disabled so the membership sheet can open without a focus jump.
        disabled={!profile}
        listeners={
          profile
            ? undefined
            : {
                tabPress: () => {
                  gateTabPress("profile");
                },
              }
        }
        contentStyle={{ backgroundColor: colors.background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.crop.circle",
            selected: "person.crop.circle.fill",
          }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

const TabsLayout = () => (
  <TabBarVisibilityProvider>
    <LayoutContent />
  </TabBarVisibilityProvider>
);

export default TabsLayout;
