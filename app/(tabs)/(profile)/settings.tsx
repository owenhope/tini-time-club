import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import AnalyticService from "@/services/analyticsService";
import { unregisterPushNotificationsAsync } from "@/services/pushNotificationService";
import { makeStyles, type ThemePreference, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { clearUserCaches } from "@/utils/signOut";
import { routes } from "@/utils/routes";
import { useProfile } from "@/context/profile-context";
import { shareInviteViaSheet } from "@/utils/inviteShare";

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const Settings = () => {
  const router = useRouter();
  const styles = useStyles();
  const { colors, preference, setPreference } = useTheme();
  const { profile, beginSignOut } = useProfile();

  const handleLogout = async () => {
    try {
      AnalyticService.capture("logout", {});

      // Clear the member immediately. Supabase emits SIGNED_OUT after the
      // sign-out request completes, but the tabs can render during that
      // request. Keeping the old profile for that frame makes the feed show
      // member-only actions (including “Post a review”) on the welcome route.
      beginSignOut?.();

      await unregisterPushNotificationsAsync();

      // Every cache that holds this member's data, not just the auth one.
      await clearUserCaches();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        reportError("Error signing out:", error);
        // A failed sign-out does not emit SIGNED_OUT, so use the screen-level
        // fallback only in this error path. Successful logout navigation is
        // owned by the root auth listener to avoid two page transitions.
        router.replace(routes.welcome());
      }
    } catch (error) {
      reportError("Error signing out:", error);
      // Still try to navigate to login
      router.replace(routes.welcome());
    }
  };

  const handleSupportFeedback = () => {
    const email = "support@hopemediahouse.com";
    Linking.openURL(`mailto:${email}`);
  };

  const menuItems = [
    {
      id: "edit-profile",
      title: "Edit Profile",
      icon: "person-outline",
      onPress: () => router.push(routes.editProfile()),
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: "notifications-outline",
      onPress: () => router.push(routes.notifications()),
    },
    {
      id: "invite",
      title: "Invite a Friend",
      icon: "paper-plane-outline",
      onPress: () => void shareInviteViaSheet(profile),
    },
    {
      id: "terms",
      title: "Terms of Service",
      icon: "document-text-outline",
      onPress: () => router.push(routes.terms()),
    },
    {
      id: "support",
      title: "Support & Feedback",
      icon: "mail-outline",
      onPress: handleSupportFeedback,
    },
    {
      id: "delete",
      title: "Delete Account",
      icon: "trash-outline",
      onPress: () => router.push(routes.deleteAccount()),
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
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.segmented}>
            {APPEARANCE_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.segment, selected && styles.segmentSelected]}
                  onPress={() => setPreference(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${option.label} appearance`}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selected && styles.segmentTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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
                  color={item.id === "delete" ? colors.danger : colors.postText}
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
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.xl,
    paddingBottom: t.spacing.lg,
  },
  sectionLabel: {
    ...t.typography.label,
    color: t.colors.textMuted,
    textTransform: "uppercase" as const,
    marginBottom: t.spacing.md,
  },
  segmented: {
    flexDirection: "row" as const,
    backgroundColor: t.colors.surfaceSunken,
    borderRadius: t.radius.pill,
    padding: t.spacing.xs,
    gap: t.spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: t.spacing.sm + 2,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
  },
  segmentSelected: {
    backgroundColor: t.colors.surface,
    ...t.elevation.card,
  },
  segmentText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
  },
  segmentTextSelected: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  menuItem: {
    backgroundColor: t.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.divider,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: t.spacing.xl,
    paddingVertical: t.spacing.lg,
  },
  menuItemLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  menuItemText: {
    ...t.typography.bodyStrong,
    color: t.colors.postText,
    marginLeft: t.spacing.lg,
  },
  deleteText: {
    color: t.colors.danger,
  },
}));

export default Settings;
