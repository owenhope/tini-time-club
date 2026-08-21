import React from "react";
import { SegmentedControl } from "@/components/shared";
import { makeStyles } from "@/theme";

export type ProfileContentTab = "reviews" | "regulars";

interface ProfileContentTabsProps {
  activeTab: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
}

const TABS = [
  { value: "reviews", label: "Reviews" },
  { value: "regulars", label: "Regulars" },
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
