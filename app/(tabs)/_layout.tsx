import React, { useEffect } from "react";
import { Image, View, Text } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProfileProvider, useProfile } from "@/context/profile-context";
import { AvatarRefreshProvider } from "@/context/avatar-refresh-context";
import * as Notifications from "expo-notifications";
import CustomTabBar from "@/components/CustomTabBar";
import { useTheme } from "@/theme";
import {
  getNotificationRoute,
  registerPushNotificationsAsync,
  subscribeToPushRegistrationRetry,
  subscribeToPushTokenChanges,
} from "@/services/pushNotificationService";

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
  const { profile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!profile?.eula_accepted || !profile.username) return;

    const syncToken = (requestPermission = false) => {
      void registerPushNotificationsAsync({ requestPermission });
    };

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const route = getNotificationRoute(response);
      if (route) router.push(route as any);
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

  if (!profile) return null;

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarStyle: { backgroundColor: colors.tabBar },
        sceneStyle: { backgroundColor: colors.background },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Feed",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Image
              source={require("@/assets/images/martini_transparent.png")}
              style={{ width: size, height: size, tintColor: color }}
              resizeMode="contain"
            />
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
        name="review"
        options={{
          title: "Review",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: colors.onSecondary,
                  fontSize: 28,
                  fontWeight: "bold",
                  lineHeight: 28,
                }}
              >
                +
              </Text>
            </View>
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

const Layout = () => (
  <ProfileProvider>
    <AvatarRefreshProvider>
      <LayoutContent />
    </AvatarRefreshProvider>
  </ProfileProvider>
);

export default Layout;
