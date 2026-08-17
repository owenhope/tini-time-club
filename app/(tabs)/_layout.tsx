import React, { useEffect } from "react";
import { usePathname, useRouter, type Href } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  const pathname = usePathname();
  const isOnboardingLocationPicker = pathname === "/favorite-location";
  const tabBarAccent = getTabBarAccentForPath(pathname);
  const tabBarActiveColor =
    tabBarAccent === "purple" ? colors.accent : colors.secondary;

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
    if (
      !loading &&
      profile &&
      (!profile.username || !profile.eula_accepted) &&
      !isOnboardingLocationPicker
    ) {
      router.replace(routes.onboarding());
    }
  }, [isOnboardingLocationPicker, loading, profile, router]);

  if (
    loading ||
    !profile ||
    ((!profile.username || !profile.eula_accepted) &&
      !isOnboardingLocationPicker)
  ) {
    return null;
  }

  return (
    <NativeTabs
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
        disabled
        accessibilityLabel="Log a martini"
        listeners={{
          tabPress: () => {
            router.push(routes.review());
          },
        }}
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

export default LayoutContent;
