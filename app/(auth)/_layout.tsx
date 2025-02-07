// Layout.js
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProfileProvider } from "@/context/profile-context";

const Layout = () => {
  return (
    <ProfileProvider>
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
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ size, color }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Hide Todos Tab */}
        <Tabs.Screen
          name="todos"
          options={{
            href: null,
          }}
        />
        {/* Hide Maps Tab */}
        <Tabs.Screen
          name="map"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ProfileProvider>
  );
};

export default Layout;
