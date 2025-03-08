// app/_layout.tsx (or whichever file holds your Tabs layout)
import React, { useEffect } from "react";
import { Alert, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProfileProvider, useProfile } from "@/context/profile-context";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/utils/supabase";

// Configure the notification handler to show alerts, play sounds, and set badges.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  // On Android, create a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    // Check for existing permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      Alert.alert(
        "Push Notifications",
        "Permission not granted to receive push notifications!"
      );
      return null;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      Alert.alert("Push Notifications", "Project ID not found");
      return null;
    }
    try {
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
  // Build the profile href using the username if it exists
  const profileHref = profile?.username
    ? `/profile/${profile.username}`
    : "/profile";

  // When a user logs in and if they don't already have a push token saved,
  // ask them if they want to enable push notifications.
  useEffect(() => {
    if (profile && !profile.expo_push_token) {
      Alert.alert(
        "Push Notifications",
        "Do you want to receive push notifications?",
        [
          {
            text: "No",
            onPress: () => {},
            style: "cancel",
          },
          {
            text: "Yes",
            onPress: async () => {
              const token = await registerForPushNotificationsAsync();
              if (token) {
                const { error } = await supabase
                  .from("profiles")
                  .update({ expo_push_token: token })
                  .eq("id", profile.id);
                if (error) {
                  Alert.alert(
                    "Push Notifications",
                    "Failed to update push token"
                  );
                }
              }
            },
          },
        ],
        { cancelable: false }
      );
    }
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
        name="review"
        options={{
          title: "Review",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Single Profile tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          href: profileHref as any,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
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
