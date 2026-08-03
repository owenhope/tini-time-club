import React from "react";
import { Pressable, Text, View } from "react-native";
import { makeStyles } from "@/theme";

export type ProfileContentTab = "reviews" | "regulars";

interface ProfileContentTabsProps {
  activeTab: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
}

const TABS: { key: ProfileContentTab; label: string }[] = [
  { key: "reviews", label: "Reviews" },
  { key: "regulars", label: "Regulars" },
];

/**
 * The system's segmented control: a sunken pill track with the selected half
 * filled chartreuse and set in green ink. Controls are pill — this used to be
 * a pair of underlined tabs, which is a different system's idea.
 */
const ProfileContentTabs: React.FC<ProfileContentTabsProps> = ({
  activeTab,
  onChange,
}) => {
  const styles = useStyles();

  return (
    <View style={styles.tabs}>
      {TABS.map(({ key, label }) => {
        const selected = activeTab === key;
        return (
          <Pressable
            key={key}
            style={[styles.tab, selected && styles.tabSelected]}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
          >
            <Text
              style={[styles.tabLabel, selected && styles.tabLabelSelected]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  tabs: {
    flexDirection: "row" as const,
    gap: 6,
    marginHorizontal: t.spacing.gutter,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.md,
    padding: t.spacing.xs,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceSunken,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: t.radius.pill,
  },
  tabSelected: {
    backgroundColor: t.colors.highlight,
  },
  tabLabel: {
    ...t.typography.bodyStrong,
    fontSize: 13,
    color: t.colors.textSecondary,
  },
  tabLabelSelected: {
    color: t.colors.onHighlight,
  },
}));

export default ProfileContentTabs;
