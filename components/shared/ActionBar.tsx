import React from "react";
import { View } from "react-native";
import Button, { type ButtonProps } from "./Button";
import { makeStyles } from "@/theme";

export interface Action extends Omit<ButtonProps, "size" | "fullWidth"> {
  key: string;
  /** Primary takes the remaining width; the rest size to their content. */
  emphasis?: "primary" | "secondary" | "tertiary";
}

const VARIANT_FOR_EMPHASIS = {
  primary: "primary",
  secondary: "tonal",
  tertiary: "ghost",
} as const;

/**
 * The action row beneath a profile identity block.
 *
 * Centralises the hierarchy rule so it can't drift between the three profile
 * types: at most one primary per screen, tonal for supporting actions, ghost
 * for low-frequency ones. Previously each screen hand-rolled TouchableOpacity
 * buttons, which left Follow and Block looking equally weighted despite Block
 * being rare and semi-destructive.
 */
const ActionBar: React.FC<{
  actions: Action[];
  size?: ButtonProps["size"];
  /** Split the row evenly instead of sizing each button to its content. */
  fullWidth?: boolean;
}> = ({ actions, size = "medium", fullWidth = false }) => {
  const styles = useStyles();

  if (actions.length === 0) return null;

  return (
    <View style={styles.row}>
      {actions.map(({ key, emphasis = "secondary", variant, ...rest }) => (
        <Button
          key={key}
          size={size}
          variant={variant ?? VARIANT_FOR_EMPHASIS[emphasis]}
          style={
            fullWidth || emphasis === "primary" ? styles.primary : undefined
          }
          {...rest}
        />
      ))}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  primary: {
    flex: 1,
  },
}));

export default ActionBar;
