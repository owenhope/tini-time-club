import React, { useEffect } from "react";
import { Alert, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProfileProvider, useProfile } from "@/context/profile-context";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/utils/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        Alert.alert("Push Notifications", "Project ID not found");
        return null;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      return tokenData.data;
    } catch (error) {
      Alert.alert("Push Notifications", `Error getting push token: ${error}`);
      return null;
    }
  } else {
    Alert.alert(
      "Push Notifications",
      "Must use physical device for push notifications"
    );
    return null;
  }
}

const LayoutContent = () => {
  const { profile } = useProfile();
  const profileHref = profile?.username
    ? `/profile/${profile.username}`
    : "/profile";

  useEffect(() => {
    const updatePushToken = async () => {
      if (profile) {
        // Check for existing permissions.
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status: newStatus } =
            await Notifications.requestPermissionsAsync();
          finalStatus = newStatus;
        }
        if (finalStatus === "granted") {
          const token = await registerForPushNotificationsAsync();
          if (token && profile.expo_push_token !== token) {
            const { error } = await supabase
              .from("profiles")
              .update({ expo_push_token: token })
              .eq("id", profile.id);
            if (error) {
              Alert.alert("Push Notifications", "Failed to update push token");
            }
          }
        } else {
          Alert.alert(
            "Push Notifications",
            "Push notification permission not granted. Existing token remains unchanged."
          );
        }
      }
    };

    updatePushToken();
  }, [profile]);

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FFF" },
        headerTintColor: "#000",
        tabBarActiveTintColor: "#000",
        tabBarStyle: { backgroundColor: "#FFF" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Review",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="[username]" options={{ href: null }} />
      <Tabs.Screen name="todos" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ href: null }} />
    </Tabs>
  );
};

const Layout = () => (
  <ProfileProvider>
    <LayoutContent />
  </ProfileProvider>
);

export default Layout;
