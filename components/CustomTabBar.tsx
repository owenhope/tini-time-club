import { View, TouchableOpacity, StyleSheet, Image, Text } from "react-native";
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
              return focused ? "martini" : "martini-outline";
            case "locations":
              return focused ? "location" : "location-outline";
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
            <View style={styles.tabContent}>
              {route.name === "home" ? (
                <Image
                  source={require("@/assets/images/martini_transparent.png")}
                  style={[
                    styles.martiniIcon,
                    { tintColor: isFocused ? "#336654" : "#666" },
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
                  color={isFocused ? "#336654" : "#666"}
                />
              )}
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? "#336654" : "#666",
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

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
  },
  martiniIcon: {
    width: 19,
    height: 19,
  },
  oliveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#336654",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  plusIcon: {
    color: "#FF4444",
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 22,
  },
});
