import React, { useEffect } from "react";
import { Alert, Platform, Image, View, Text } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProfileProvider, useProfile } from "@/context/profile-context";
import { AvatarRefreshProvider } from "@/context/avatar-refresh-context";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/utils/supabase";
import CustomTabBar from "@/components/CustomTabBar";

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
      const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
      return data;
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

  if (!profile) return null;

  useEffect(() => {
    const updatePushToken = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      let finalStatus = status;

      if (status !== "granted") {
        const permissionResponse =
          await Notifications.requestPermissionsAsync();
        finalStatus = permissionResponse.status;
      }

      if (finalStatus === "granted") {
        const token = await registerForPushNotificationsAsync();
        if (token && profile.expo_push_token !== token) {
          await supabase
            .from("profiles")
            .update({ expo_push_token: token })
            .eq("id", profile.id);
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
        tabBarActiveTintColor: "#336654",
        tabBarStyle: { backgroundColor: "#f0f0f0" },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
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
        name="locations"
        options={{
          title: "Places",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
          popToTopOnBlur: true,
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
                backgroundColor: "#336654",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 8,
              }}
            >
              <Text
                style={{
                  color: "#FF4444",
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
        name="discover"
        options={{
          title: "Discover",
          headerShown: false,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
          popToTopOnBlur: true,
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
          popToTopOnBlur: true,
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
