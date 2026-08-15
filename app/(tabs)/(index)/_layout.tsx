import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export const unstable_settings = {
  initialRouteName: "martini-index",
};

/** The Index owns its large tab-root header, just like Feed and Explore. */
export default function IndexLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
