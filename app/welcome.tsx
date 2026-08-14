import "react-native-get-random-values";
import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Button, MartiniIcon } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { routes } from "@/utils/routes";

const FEATURES = [
  {
    icon: "glass-cocktail" as const,
    title: "Rate your Martinis",
    palette: "brand" as const,
  },
  {
    icon: "map-search-outline" as const,
    title: "Find the Best",
    palette: "secondary" as const,
  },
  {
    icon: "account-group-outline" as const,
    title: "Follow the Regulars",
    palette: "highlight" as const,
  },
];

const Welcome = () => {
  const styles = useStyles();
  const router = useRouter();
  const { colors } = useTheme();
  const featureColors = {
    brand: {
      background: colors.tabBarActive,
      icon: "#FFFFFF",
    },
    secondary: {
      background: colors.secondary,
      icon: "#FFFFFF",
    },
    highlight: {
      background: colors.like,
      icon: "#FFFFFF",
    },
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Image
        source={require("@/assets/images/nightlife-martini-table.png")}
        style={styles.backgroundImage}
        contentFit="cover"
        accessibilityLabel="Friends toasting with three Martinis"
      />
      <View style={styles.scrim} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <Image
              source={require("@/assets/images/tini-time-logo-2x.png")}
              style={styles.logo}
              contentFit="contain"
              accessibilityRole="image"
              accessibilityLabel="Tini Time Club"
            />
          </View>

          <View style={styles.features}>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={styles.feature}>
                <View
                  style={[
                    styles.featureIcon,
                    {
                      backgroundColor:
                        featureColors[feature.palette].background,
                    },
                  ]}
                >
                  {feature.palette === "brand" ? (
                    <MartiniIcon
                      size={20}
                      color={featureColors[feature.palette].icon}
                      filled
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={feature.icon}
                      size={20}
                      color={featureColors[feature.palette].icon}
                    />
                  )}
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={() => router.push(routes.auth())}
            variant="primary"
            size="large"
            fullWidth
            icon="chevron-forward"
            iconPosition="right"
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surfaceInkDeep,
  },
  backgroundImage: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%" as const,
    height: "100%" as const,
  },
  scrim: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: t.colors.scrim,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: t.spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: "space-between" as const,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  hero: {
    alignItems: "center" as const,
  },
  logo: {
    width: "100%" as const,
    maxWidth: 260,
    height: 112,
  },
  features: {
    gap: t.spacing.md,
  },
  feature: {
    minHeight: 44,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  featureTitle: {
    ...t.typography.heading,
    flex: 1,
    letterSpacing: 0,
    color: t.colors.textOnImage,
    textShadowColor: t.colors.scrimStrong,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    paddingBottom: t.spacing.lg,
  },
}));

export default Welcome;
