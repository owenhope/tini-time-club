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

// One size for every tab icon, including Review — the martini PNG matches.
const ICON_SIZE = 24;

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

          // Until a tab's stack has navigated at least once, route.state is
          // undefined — and there is nothing to pop anyway.
          const nestedState = (route as any).state;
          const stackIsDeep = nestedState?.index > 0;

          if (!stackIsDeep) {
            // Already on this tab's root: for the feed, scroll back to the
            // top; the other roots have nothing to do.
            if (route.name === "(home)") {
              const scrollToTop = getGlobalScrollToTop();
              if (scrollToTop) scrollToTop();
            }
            return;
          }

          // Already on a stack tab with pushed screens: pop back to its
          // root, so tapping Places always returns to the map rather than
          // leaving you on a place you drilled into. Targeting the nested
          // stack's key is what makes the dispatch land on that stack rather
          // than the tabs. POP_TO_TOP is what StackActions.popToTop()
          // produces; @react-navigation/native isn't a direct dependency
          // here (expo-router bundles its own copy), so the action is built
          // by hand.
          navigation.dispatch({
            type: "POP_TO_TOP",
            target: nestedState.key,
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
            // "review" renders the martini PNG above and never reaches this
            // switch — posting a review is the most martini action there is.
            case "(home)":
              return focused ? "home" : "home-outline";
            case "(places)":
              return focused ? "location" : "location-outline";
            case "(discover)":
              return focused ? "search" : "search-outline";
            case "(profile)":
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
              {route.name === "review" ? (
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
              ) : (
                <Ionicons
                  name={getIconName(route.name, isFocused)}
                  size={ICON_SIZE}
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
    width: 24,
    height: 24,
  },
}));
