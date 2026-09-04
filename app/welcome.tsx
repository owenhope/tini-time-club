import "react-native-get-random-values";
import React from "react";
import { Linking, Pressable, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Button, MartiniIcon } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { routes } from "@/utils/routes";
import { acceptVisitorPreview } from "@/services/visitor-session";
import { reportError } from "@/utils/log";
import AnalyticService from "@/services/analyticsService";
import { useProfile } from "@/context/profile-context";
import { LEGAL_URLS } from "@/utils/legalUrls";

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
  const { beginSignOut } = useProfile();
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

  const exploreAsVisitor = async () => {
    AnalyticService.capture("visitor_preview_started", { source: "welcome" });
    // Welcome's browse action is explicitly unauthenticated. Clear any
    // lingering member state before mounting Feed so stale profile data cannot
    // reveal the review CTA during the transition.
    beginSignOut?.();
    try {
      await acceptVisitorPreview();
    } catch (error) {
      // Persistence improves the next launch, but it must never block this one.
      reportError("Unable to remember visitor preview choice:", error);
    }
    router.replace(routes.home());
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
              source={require("@/assets/images/tini-time-logo-light-2x.png")}
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
            title="Discover Martinis"
            onPress={() => void exploreAsVisitor()}
            variant="primary"
            size="medium"
            fullWidth
          />
          <Text style={styles.legalCopy}>
            By continuing, you confirm you are of legal drinking age and agree
            to the{" "}
            <Text
              style={styles.legalLink}
              onPress={() => void Linking.openURL(LEGAL_URLS.terms)}
              accessibilityRole="link"
              accessibilityLabel="Read the Terms of Service"
            >
              Terms of Service
            </Text>
            {" and "}
            <Text
              style={styles.legalLink}
              onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
              accessibilityRole="link"
              accessibilityLabel="Read the Privacy Policy"
            >
              Privacy Policy
            </Text>
            .
          </Text>
          <Pressable
            onPress={() => router.push(routes.auth())}
            style={({ pressed }) => [
              styles.signInLink,
              pressed && styles.pressed,
            ]}
            accessibilityRole="link"
            accessibilityLabel="Already have an account? Sign in."
            hitSlop={{ top: 8, bottom: 8, left: 24, right: 24 }}
          >
            <Text style={styles.signInText}>
              Already have an account? Sign in.
            </Text>
          </Pressable>
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
    gap: t.spacing.sm,
    paddingBottom: t.spacing.lg,
  },
  legalCopy: {
    ...t.typography.caption,
    color: t.colors.textOnImage,
    textAlign: "left" as const,
  },
  legalLink: {
    ...t.typography.caption,
    color: t.colors.textOnImage,
    textDecorationLine: "underline" as const,
  },
  signInLink: {
    minHeight: 44,
    alignSelf: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.md,
  },
  signInText: {
    ...t.typography.bodyStrong,
    color: t.colors.textOnImage,
    textDecorationLine: "underline" as const,
  },
  pressed: {
    opacity: 0.6,
  },
}));

export default Welcome;
