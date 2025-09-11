import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getGlobalScrollToTop } from "@/utils/scrollUtils";

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          } else if (isFocused && route.name === "home") {
            // If home tab is already focused and pressed, scroll to top
            const scrollToTop = getGlobalScrollToTop();
            if (scrollToTop) {
              scrollToTop();
            }
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const getIconName = (routeName: string, focused: boolean) => {
          switch (routeName) {
            case "home":
              return focused ? "home" : "home-outline";
            case "locations":
              return focused ? "map" : "map-outline";
            case "review":
              return focused ? "camera" : "camera-outline";
            case "discover":
              return focused ? "search" : "search-outline";
            case "profile":
              return focused ? "person" : "person-outline";
            default:
              return "circle-outline";
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <Ionicons
              name={getIconName(route.name, isFocused)}
              size={24}
              color={isFocused ? "#000" : "#666"}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});
