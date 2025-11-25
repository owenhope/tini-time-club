import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import AnalyticService from "@/services/analyticsService";
import authCache from "@/utils/authCache";

const Settings = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      AnalyticService.capture('logout', {});
      
      // Clear cache first
      await authCache.invalidateCache();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error signing out:", error);
        // Still navigate to login even if signOut has an error
      }
      
      // Navigate to login screen - don't rely on SIGNED_OUT event
      router.replace("/");
    } catch (error) {
      console.error("Error signing out:", error);
      // Still try to navigate to login
      router.replace("/");
    }
  };

  const menuItems = [
    {
      id: "edit-profile",
      title: "Edit Profile",
      icon: "person-outline",
      onPress: () => router.push("/(tabs)/profile/edit-profile"),
    },
    {
      id: "terms",
      title: "Terms of Service",
      icon: "document-text-outline",
      onPress: () => router.push("/(tabs)/profile/terms"),
    },
    {
      id: "delete",
      title: "Delete Account",
      icon: "trash-outline",
      onPress: () => router.push("/(tabs)/profile/delete-account"),
    },
    {
      id: "logout",
      title: "Logout",
      icon: "log-out-outline",
      onPress: handleLogout,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              index === menuItems.length - 1 && styles.lastMenuItem,
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color={item.id === "delete" ? "#ff4444" : "#333"}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    item.id === "delete" && styles.deleteText,
                  ]}
                >
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 16,
    fontWeight: "500",
  },
  deleteText: {
    color: "#ff4444",
  },
});

export default Settings;
