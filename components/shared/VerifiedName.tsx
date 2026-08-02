import React from "react";
import {
  type StyleProp,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";

export interface VerifiedNameProps {
  name: string;
  isVerified?: boolean | null;
  badgeSize?: number;
  numberOfLines?: number;
  /** Sits on a green or photo ground, where the green badge disappears. */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/** A username paired with Tini Time Club's verified admin badge. */
const VerifiedName: React.FC<VerifiedNameProps> = ({
  name,
  isVerified = false,
  badgeSize = 14,
  numberOfLines = 1,
  onDark = false,
  style,
  textStyle,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={
        isVerified ? `${name}, verified Tini Time Club admin` : name
      }
    >
      <Text
        style={[styles.name, textStyle]}
        numberOfLines={numberOfLines}
        accessibilityElementsHidden
      >
        {name}
      </Text>
      {isVerified ? (
        <MaterialIcons
          name="verified"
          size={badgeSize}
          color={onDark ? colors.highlight : colors.accent}
          style={styles.badge}
          accessibilityElementsHidden
        />
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    minWidth: 0,
    gap: 2,
  },
  name: {
    color: t.colors.text,
    flexShrink: 1,
  },
  badge: {
    flexShrink: 0,
  },
}));

export default VerifiedName;
