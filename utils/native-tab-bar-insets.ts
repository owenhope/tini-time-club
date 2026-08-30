import { Platform } from "react-native";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NATIVE_TAB_BAR_CHROME_HEIGHT =
  Platform.select({
    ios: 92,
    android: 72,
    default: 80,
  }) ?? 80;

const getNativeTabBarContentInset = (safeAreaBottom: number) =>
  safeAreaBottom + NATIVE_TAB_BAR_CHROME_HEIGHT;

export const useNativeTabBarContentInset = () => {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const isInsideTabs = segments[0] === "(tabs)";

  return isInsideTabs
    ? getNativeTabBarContentInset(insets.bottom)
    : insets.bottom;
};
