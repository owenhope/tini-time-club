import { View } from "react-native";
import FeatureHelpButton from "@/components/shared/FeatureHelpButton";
import { routes } from "@/utils/routes";
import React, { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import AnalyticService from "@/services/analyticsService";
import { SegmentedControl } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";

export type ProfileContentTab = "reviews" | "regulars" | "favorites";

interface ProfileContentTabsProps {
  activeTab: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
}

const TABS = [
  { value: "reviews", label: "Reviews" },
  { value: "regulars", label: "Regulars" },
  { value: "favorites", label: "Favorites" },
] as const;

/**
 * The system's segmented control: a sunken pill track with the selected half
 * carrying the same brand purple as the profile header.
 */
const ProfileContentTabs: React.FC<ProfileContentTabsProps> = ({
  activeTab,
  onChange,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  useFocusEffect(
    useCallback(() => {
      if (activeTab === "favorites")
        void AnalyticService.capture("profile_favorites_open");
      if (activeTab === "regulars")
        void AnalyticService.capture("profile_regulars_open");
    }, [activeTab])
  );

  return (
    <View>
      <SegmentedControl
        value={activeTab}
        options={TABS}
        onChange={onChange}
        tone="brand"
        style={styles.tabs}
      />
      {activeTab === "regulars" ? (
        <View style={styles.help}>
          <FeatureHelpButton
            label="How Regulars works"
            href={routes.regularsInfo()}
            color={colors.onHeaderBrand}
          />
        </View>
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  help: { alignItems: "flex-end" as const, marginHorizontal: t.spacing.gutter },
  tabs: {
    marginHorizontal: t.spacing.gutter,
    marginTop: 0,
    marginBottom: t.spacing.md,
  },
}));

export default ProfileContentTabs;
