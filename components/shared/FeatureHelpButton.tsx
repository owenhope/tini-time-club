import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { makeStyles, useTheme } from "@/theme";

export default function FeatureHelpButton({
  label,
  href,
  color,
}: {
  label: string;
  href: Href;
  color?: string;
}) {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons
        name="help-circle-outline"
        size={22}
        color={color ?? colors.textSecondary}
      />
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  pressed: { opacity: 0.7 },
}));
