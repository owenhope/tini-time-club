import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import AppHeader from "@/components/nav/AppHeader";
import { AppText, Button } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import AnalyticService from "@/services/analyticsService";
import { savePendingMembershipReturn } from "@/services/visitor-session";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";

const BENEFITS = [
  {
    icon: "camera-outline" as const,
    title: "Keep your Martini record",
    body: "Post ratings, photos, and verdicts from every place you visit.",
  },
  {
    icon: "ribbon-outline" as const,
    title: "Earn your standing",
    body: "Build rank rings and become a Regular at your favorite bars.",
  },
  {
    icon: "people-outline" as const,
    title: "Join the conversation",
    body: "Follow members, like reviews, and add your own comments.",
  },
];

export default function VisitorProfile() {
  const styles = useStyles();
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [joining, setJoining] = useState(false);

  const joinClub = async () => {
    if (joining) return;
    setJoining(true);
    AnalyticService.capture("membership_auth_started", {
      intent: "profile",
      returnTo: pathname,
    });
    try {
      await savePendingMembershipReturn("profile", pathname);
    } catch (error) {
      reportError("Unable to save profile membership destination:", error);
    }
    setJoining(false);
    router.push(routes.auth());
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="large"
        title="Your seat is waiting"
        meta="Explore freely. Join when you're ready to take part."
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon} size={22} color={colors.accent} />
              </View>
              <View style={styles.benefitCopy}>
                <AppText variant="heading">{benefit.title}</AppText>
                <AppText tone="secondary">{benefit.body}</AppText>
              </View>
            </View>
          ))}
        </View>

        <Button
          title="Join the club"
          onPress={() => void joinClub()}
          loading={joining}
          size="medium"
          fullWidth
          icon="chevron-forward"
          iconPosition="right"
        />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    gap: t.spacing.xl,
    paddingHorizontal: t.spacing.gutter,
    paddingTop: t.spacing.xl,
    paddingBottom: t.spacing.giant,
  },
  benefits: {
    gap: t.spacing.md,
  },
  benefit: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.card,
    borderCurve: "continuous" as const,
    backgroundColor: t.colors.surface,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentSubtle,
  },
  benefitCopy: {
    flex: 1,
    gap: t.spacing.xs,
  },
}));
