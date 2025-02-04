import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const Layout = () => {
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
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Map Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="map-outline" size={size} color={color} />
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

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
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
    </Tabs>
  );
};

export default Layout;
