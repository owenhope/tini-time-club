import { View, TouchableOpacity, StyleSheet, Image, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getGlobalScrollToTop } from "@/utils/scrollUtils";
import { makeStyles, useTheme } from "@/theme";
import * as Haptics from "expo-haptics";

/**
 * Props as expo-router's <Tabs tabBar={...}> supplies them. Typed locally
 * rather than importing BottomTabBarProps: expo-router bundles its own
 * react-navigation, and the standalone package's types drift from it.
 */
type TabBarProps = {
  state: { routes: any[]; index: number };
  descriptors: Record<string, any>;
  navigation: any;
};

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === "string"
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          Haptics.selectionAsync();

          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
            return;
          }

          if (!isFocused) return;

          const nestedState = (route as any).state;

          if (route.name === "home" && !(nestedState?.index > 0)) {
            // Already on the feed root: scroll back to the top. When the
            // feed stack is deep (a user or place is pushed), fall through
            // and pop back to the feed like the other tabs.
            const scrollToTop = getGlobalScrollToTop();
            if (scrollToTop) scrollToTop();
            return;
          }

          // Already on a stack tab: pop it back to its root, so tapping
          // Places always returns to the map rather than leaving you on a
          // place you drilled into. Targeting the nested stack's key is what
          // makes the dispatch land on that stack rather than the tabs.
          // POP_TO_TOP is what StackActions.popToTop() produces;
          // @react-navigation/native isn't a direct dependency here (expo-router
          // bundles its own copy), so the action is built by hand.
          const nestedKey = nestedState?.key;
          navigation.dispatch({
            type: "POP_TO_TOP",
            target: nestedKey ?? route.key,
          });
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const getIconName = (
          routeName: string,
          focused: boolean
        ): keyof typeof Ionicons.glyphMap => {
          switch (routeName) {
            // "home" renders a PNG above and never reaches this switch.
            case "locations":
              return focused ? "location" : "location-outline";
            case "review":
              return focused ? "camera" : "camera-outline";
            case "discover":
              return focused ? "search" : "search-outline";
            case "profile":
              return focused ? "person" : "person-outline";
            default:
              return "ellipse-outline";
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            // tabBarAccessibilityLabel is never set in (tabs)/_layout, so fall
            // back to the visible label rather than announcing nothing.
            accessibilityLabel={
              options.tabBarAccessibilityLabel ?? String(label)
            }
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <View style={styles.tabContent}>
              {route.name === "home" ? (
                <Image
                  source={require("@/assets/images/martini_transparent.png")}
                  style={[
                    styles.martiniIcon,
                    {
                      tintColor: isFocused
                        ? colors.tabBarActive
                        : colors.tabBarInactive,
                    },
                  ]}
                  resizeMode="contain"
                />
              ) : route.name === "review" ? (
                <View style={styles.oliveButton}>
                  <Text style={styles.plusIcon}>+</Text>
                </View>
              ) : (
                <Ionicons
                  name={getIconName(route.name, isFocused)}
                  size={19}
                  color={
                    isFocused ? colors.tabBarActive : colors.tabBarInactive
                  }
                />
              )}
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused
                      ? colors.tabBarActive
                      : colors.tabBarInactive,
                    marginTop: route.name === "review" ? 8 : 6,
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tabBar: {
    flexDirection: "row",
    backgroundColor: t.colors.tabBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
    paddingTop: t.spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: t.spacing.sm - 2,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    ...t.typography.caption,
    fontWeight: "500" as const,
    marginTop: t.spacing.sm - 2,
    textAlign: "center" as const,
  },
  martiniIcon: {
    width: 20,
    height: 20,
  },
  oliveButton: {
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    ...t.elevation.raised,
  },
  plusIcon: {
    color: t.colors.onSecondary,
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 26,
  },
}));
