import { TouchableOpacity } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";

const Layout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FFF" },
        headerTintColor: "#000",
        tabBarActiveTintColor: "#000",
        tabBarStyle: { backgroundColor: "#FFF" },
        headerRight: () => (
          <TouchableOpacity onPress={() => supabase.auth.signOut()}>
            <Ionicons
              name="log-out-outline"
              size={24}
              color="#000"
              style={{ marginRight: 10 }}
            />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default Layout;
