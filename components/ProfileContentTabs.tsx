import React, { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import AnalyticService from "@/services/analyticsService";
import { SegmentedControl } from "@/components/shared";
import { makeStyles } from "@/theme";

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
  useFocusEffect(
    useCallback(() => {
      if (activeTab === "favorites")
        void AnalyticService.capture("profile_favorites_open");
      if (activeTab === "regulars")
        void AnalyticService.capture("profile_regulars_open");
    }, [activeTab])
  );

  return (
    <SegmentedControl
      value={activeTab}
      options={TABS}
      onChange={onChange}
      tone="brand"
      style={styles.tabs}
    />
  );
};

const useStyles = makeStyles((t) => ({
  tabs: {
    marginHorizontal: t.spacing.gutter,
    marginTop: 0,
    marginBottom: t.spacing.md,
  },
}));

export default ProfileContentTabs;
