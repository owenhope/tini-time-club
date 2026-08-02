import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";
import AppText from "./AppText";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Rating pips, a badge, a count — anything right-aligned. */
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Title over subtitle, optional trailing slot and chevron. */
const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  trailing,
  leading,
  chevron,
  onPress,
  style,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {chevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </>
  );

  if (!onPress) return <View style={[styles.row, style]}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      {content}
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    minHeight: 56,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    backgroundColor: t.colors.pressed,
  },
}));

export default ListRow;
