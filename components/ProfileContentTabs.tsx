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
 * filled chartreuse and set in green ink. Controls are pill — this used to be
 * a pair of underlined tabs, which is a different system's idea.
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
      style={styles.tabs}
    />
  );
};

const useStyles = makeStyles((t) => ({
  tabs: {
    marginHorizontal: t.spacing.gutter,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.md,
  },
}));

export default ProfileContentTabs;
