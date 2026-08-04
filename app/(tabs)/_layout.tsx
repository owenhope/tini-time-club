import React, { useEffect } from "react";
import { Tabs, usePathname, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MartiniIcon } from "@/components/shared";
import { useProfile } from "@/context/profile-context";
import * as Notifications from "expo-notifications";
import TabBar from "@/components/nav/TabBar";
import { fonts, useTheme } from "@/theme";
import {
  getNotificationRoute,
  registerPushNotificationsAsync,
  subscribeToPushRegistrationRetry,
  subscribeToPushTokenChanges,
} from "@/services/pushNotificationService";
import { ensureFridayMartiniReminder } from "@/utils/martiniReminder";
import { logNotificationOpen } from "@/utils/notificationOpens";
import { routes } from "@/utils/routes";

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

  useEffect(() => {
    if (!profile?.eula_accepted || !profile.username) return;

    const syncToken = (requestPermission = false) => {
      void registerPushNotificationsAsync({ requestPermission }).then(() => {
        // Local weekly nudge; no-op until notification permission is granted.
        void ensureFridayMartiniReminder();
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
  }, [profile?.eula_accepted, profile?.id, profile?.username, router]);

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
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.accent,
        headerTitleStyle: {
          color: colors.text,
          fontFamily: fonts.bold,
          fontSize: 17,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarStyle: { backgroundColor: colors.tabBar },
        sceneStyle: { backgroundColor: colors.background },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Feed",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <MartiniIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(places)"
        options={{
          title: "Places",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(discover)"
        options={{
          title: "Discover",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default LayoutContent;
