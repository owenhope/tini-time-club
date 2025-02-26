import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProfileProvider, useProfile } from "@/context/profile-context";

const LayoutContent = () => {
  const { profile } = useProfile();
  const profileHref = profile?.username
    ? `/profile/${profile.username}`
    : "/profile";

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
      <Tabs.Screen
        name="profile/[username]"
        options={{
          title: "Profile",
          href: profileHref as any,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Followers",
          href: null,
        }}
      />
      <Tabs.Screen
        name="followers"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

const Layout = () => (
  <ProfileProvider>
    <LayoutContent />
  </ProfileProvider>
);

export default Layout;
