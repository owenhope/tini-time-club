import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "@/components/nav/AppHeader";
import { AppText, Button } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import {
  getMembershipPromptCopy,
  getVisitorGatedRouteIntent,
  isMembershipIntent,
  type MembershipIntent,
} from "@/utils/membership";
import { savePendingMembershipReturn } from "@/services/visitor-session";
import { routes } from "@/utils/routes";
import { reportError } from "@/utils/log";
import AnalyticService from "@/services/analyticsService";

export default function MembershipScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    intent?: string;
    returnTo?: string;
  }>();
  const [continuing, setContinuing] = useState(false);
  const rawIntent = Array.isArray(params.intent)
    ? params.intent[0]
    : params.intent;
  const intent: MembershipIntent = isMembershipIntent(rawIntent)
    ? rawIntent
    : "profile";
  const copy = useMemo(() => getMembershipPromptCopy(intent), [intent]);
  const returnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo;

  const continueToAuth = async () => {
    if (continuing) return;
    AnalyticService.capture("membership_auth_started", { intent, returnTo });
    setContinuing(true);
    try {
      await savePendingMembershipReturn(intent, returnTo);
      router.replace(routes.auth());
    } catch (error) {
      reportError("Unable to save membership return destination:", error);
      router.replace(routes.auth());
    } finally {
      setContinuing(false);
    }
  };

  const dismiss = () => {
    AnalyticService.capture("membership_gate_dismissed", { intent });
    if (returnTo && getVisitorGatedRouteIntent(returnTo)) {
      router.replace(routes.home());
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(routes.home());
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="modal"
        title="Membership"
        cancelLabel="Not now"
        onCancel={dismiss}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={styles.iconPlate}>
          <Ionicons name="wine" size={38} color={colors.onInk} />
        </View>

        <View style={styles.copy}>
          <AppText variant="eyebrow" tone="accent">
            {copy.eyebrow}
          </AppText>
          <AppText variant="display">{copy.title}</AppText>
          <AppText tone="secondary" style={styles.body}>
            {copy.body}
          </AppText>
        </View>

        <View style={styles.benefits}>
          {[
            "Post and collect your Martini reviews",
            "Earn rank rings and Regular status",
            "Like, comment, follow, and share",
          ].map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.accent}
              />
              <AppText style={styles.benefitText}>{benefit}</AppText>
            </View>
          ))}
        </View>

        <Button
          title="JOIN OR SIGN IN"
          onPress={() => void continueToAuth()}
          loading={continuing}
          size="large"
          fullWidth
          icon="chevron-forward"
          iconPosition="right"
        />
        <Button
          title="KEEP EXPLORING"
          onPress={dismiss}
          variant="ghost"
          size="large"
          fullWidth
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
    flexGrow: 1,
    justifyContent: "center" as const,
    gap: t.spacing.xl,
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.xxl,
    paddingBottom: t.spacing.giant,
  },
  iconPlate: {
    width: 72,
    height: 72,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surfaceInk,
  },
  copy: {
    gap: t.spacing.sm,
  },
  body: {
    maxWidth: 520,
  },
  benefits: {
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.card,
    borderCurve: "continuous" as const,
    backgroundColor: t.colors.surface,
  },
  benefitRow: {
    minHeight: 32,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  benefitText: {
    flex: 1,
  },
}));
