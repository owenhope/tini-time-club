import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { HIT_SLOP, makeStyles } from "@/theme";
import AppText from "./AppText";

export interface SectionHeaderProps {
  /** 1–3 words, rendered uppercase and tracked. "NEAR YOU", "THE CLUB". */
  eyebrow?: string;
  title: string;
  /** Optional trailing link, e.g. "See all". */
  action?: string;
  onActionPress?: () => void;
  /** Sits on a green/ink ground rather than paper. */
  onInk?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Opens every section: a tiny tracked eyebrow over a sentence-case title.
 * The eyebrow is the one place the brand shouts in uppercase.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  action,
  onActionPress,
  onInk,
  style,
}) => {
  const styles = useStyles();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        {eyebrow ? (
          <AppText
            variant="eyebrow"
            tone={onInk ? "onImage" : "accent"}
            accessibilityRole="header"
          >
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="title" tone={onInk ? "onImage" : "default"}>
          {title}
        </AppText>
      </View>
      {action ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={action}
        >
          <AppText variant="bodyStrong" tone={onInk ? "onImage" : "accent"}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
  },
  text: {
    flex: 1,
    gap: t.spacing.xs,
  },
}));

export default SectionHeader;
