import { View, TouchableOpacity, StyleSheet, Image, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { getGlobalScrollToTop } from "@/utils/scrollUtils";
import { routes } from "@/utils/routes";
import { BRAND, fonts, makeStyles, useTheme } from "@/theme";

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

/** One size for every tab icon, including the martini PNG. */
const ICON_SIZE = 25;
const POUR_SIZE = 52;

/**
 * The routes where a photo owns the top — the same set that wears header C.
 * On those the bar takes its ink tone, so it reads as chrome over media
 * rather than a paper shelf pasted under it.
 */
const MEDIA_ROUTES = new Set(["places/[place]", "users/[username]"]);

/** The deepest route the focused tab is showing. */
const focusedRouteName = (route: any): string => {
  const nested = route?.state;
  if (!nested?.routes?.length) return route?.name ?? "";
  const child = nested.routes[nested.index ?? nested.routes.length - 1];
  return focusedRouteName(child);
};

export default function TabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();

  const onInk = MEDIA_ROUTES.has(focusedRouteName(state.routes[state.index]));

  const active = onInk ? colors.highlight : colors.tabBarActive;
  const rest = onInk ? colors.onInk : colors.tabBarInactive;

  const middle = Math.ceil(state.routes.length / 2);

  /**
   * Pouring is the app's one loud action, so it takes the brand's loudest
   * colour and sits proud of the bar. It is a button, not a tab: the composer
   * is presented over whatever you were looking at, so cancelling returns you
   * there rather than leaving a draft parked in a tab you thought you left.
   */
  const pourButton = (
    <TouchableOpacity
      key="pour"
      accessibilityRole="button"
      accessibilityLabel="Log a martini"
      onPress={() => {
        Haptics.selectionAsync();
        router.push(routes.review());
      }}
      style={styles.pourSlot}
    >
      <View style={[styles.pour, onInk && styles.pourOnInk]}>
        <Ionicons name="add" size={26} color={colors.onHighlight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.tabBar, onInk && styles.tabBarOnInk]}>
      <View
        style={[styles.fill, onInk && styles.fillOnInk]}
        pointerEvents="none"
      />
      <View style={[styles.row, { paddingBottom: insets.bottom }]}>
        {state.routes.flatMap((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;
          const badge = options.tabBarBadge;

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
              // "(home)" renders the martini PNG above and never reaches this
              // switch — the feed is the club's own glass.
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

          const tint = isFocused ? active : rest;

          const tab = (
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
              <View
                style={[
                  styles.tabContent,
                  !isFocused && onInk && styles.restOnInk,
                ]}
              >
                <View style={styles.iconSlot}>
                  {route.name === "(home)" ? (
                    <Image
                      source={require("@/assets/images/martini_transparent.png")}
                      style={[styles.martini, { tintColor: tint }]}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons
                      name={getIconName(route.name, isFocused)}
                      size={ICON_SIZE}
                      color={tint}
                    />
                  )}
                  {badge != null ? (
                    <View
                      style={[styles.badge, onInk && styles.badgeOnInk]}
                      pointerEvents="none"
                    >
                      <Text style={styles.badgeText} numberOfLines={1}>
                        {badge}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.label,
                    isFocused && styles.labelActive,
                    { color: tint },
                  ]}
                >
                  {label}
                </Text>
                {/* The dot is what marks the tab you're on once the label and
                    the glyph have both said it quietly. */}
                <View
                  style={[
                    styles.dot,
                    onInk && styles.dotOnInk,
                    !isFocused && styles.dotHidden,
                  ]}
                />
              </View>
            </TouchableOpacity>
          );

          return index + 1 === middle ? [tab, pourButton] : [tab];
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // The bar never auto-hides, so it earns its translucency: the paper reads
  // the content sliding under it. (The drawn 14px blur needs expo-blur, and
  // that needs a new dev client.)
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.divider,
  },
  tabBarOnInk: {
    borderTopWidth: 0,
  },
  fill: {
    ...({ position: "absolute" } as const),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.tabBar,
    opacity: 0.94,
  },
  fillOnInk: {
    backgroundColor: t.colors.surfaceInk,
    opacity: 0.88,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    // 56pt of row before the safe-area inset.
    minHeight: 56,
  },
  tabContent: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
  },
  // Paper's rest grey is a colour; ink's is the paper ink held back.
  restOnInk: {
    opacity: 0.62,
  },
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  martini: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 12,
    textAlign: "center" as const,
  },
  labelActive: {
    fontFamily: fonts.bold,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.highlight,
    borderWidth: 1,
    borderColor: t.colors.secondary,
  },
  dotOnInk: {
    borderWidth: 0,
  },
  // Reserved rather than absent, so selection doesn't nudge the row.
  dotHidden: {
    opacity: 0,
  },
  badge: {
    ...({ position: "absolute" } as const),
    top: -3,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: t.radius.pill,
    // Orange is badges and the map's user dot — nothing else in the app.
    backgroundColor: BRAND.pimento,
    borderWidth: 1.5,
    borderColor: t.colors.tabBar,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  badgeOnInk: {
    borderColor: t.colors.surfaceInk,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 11,
    color: t.colors.textOnImage,
  },
  pourSlot: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  pour: {
    width: POUR_SIZE,
    height: POUR_SIZE,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.highlight,
    borderWidth: 2,
    borderColor: t.colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    // Proud of the bar, as drawn.
    marginTop: -10,
    ...t.elevation.raised,
  },
  // On ink the chartreuse is already the loudest thing in the bar; the green
  // ring would only muddy it.
  pourOnInk: {
    borderWidth: 0,
  },
}));
