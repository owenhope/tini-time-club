import React from "react";
import { Pressable, Text, View } from "react-native";
import { makeStyles } from "@/theme";

export type ProfileContentTab = "reviews" | "regulars";

interface ProfileContentTabsProps {
  activeTab: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
}

const ProfileContentTabs: React.FC<ProfileContentTabsProps> = ({
  activeTab,
  onChange,
}) => {
  const styles = useStyles();

  return (
    <View style={styles.tabs}>
      <Pressable
        style={[styles.tab, activeTab === "reviews" && styles.activeTab]}
        onPress={() => onChange("reviews")}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "reviews" }}
        accessibilityLabel="Reviews"
      >
        <Text
          style={[
            styles.tabLabel,
            activeTab === "reviews" && styles.activeLabel,
          ]}
        >
          Reviews
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === "regulars" && styles.activeTab]}
        onPress={() => onChange("regulars")}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "regulars" }}
        accessibilityLabel="Regulars"
      >
        <Text
          style={[
            styles.tabLabel,
            activeTab === "regulars" && styles.activeLabel,
          ]}
        >
          Regulars
        </Text>
      </Pressable>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  tabs: {
    flexDirection: "row" as const,
    marginTop: t.spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: t.colors.accent,
  },
  tabLabel: {
    ...t.typography.label,
    color: t.colors.textMuted,
  },
  activeLabel: {
    color: t.colors.accent,
  },
}));

export default ProfileContentTabs;
