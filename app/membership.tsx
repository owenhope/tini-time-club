import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AppHeader from "@/components/nav/AppHeader";
import { AppText, Button } from "@/components/shared";
import { makeStyles } from "@/theme";
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

  // Set once a close is handled (tap or auth) so the unmount hook doesn't
  // double-fire for those paths — it only covers the swipe-down gesture.
  const closeHandled = useRef(false);

  const continueToAuth = async () => {
    if (continuing) return;
    closeHandled.current = true;
    AnalyticService.capture("membership_auth_started", { intent, returnTo });
    setContinuing(true);
    try {
      // Joining from the profile gate lands on the feed: returning to the
      // profile route made the member profile flash before the default-route
      // redirect. Every other intent still returns where the gate opened.
      await savePendingMembershipReturn(
        intent,
        intent === "profile" ? null : returnTo
      );
      router.replace(routes.auth());
    } catch (error) {
      reportError("Unable to save membership return destination:", error);
      router.replace(routes.auth());
    } finally {
      setContinuing(false);
    }
  };

  const dismiss = () => {
    closeHandled.current = true;
    AnalyticService.capture("membership_gate_dismissed", { intent });
    if (returnTo && getVisitorGatedRouteIntent(returnTo)) {
      router.replace(routes.home());
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(routes.home());
    }
  };

  // The sheet can also be swiped away natively; run the same dismissal
  // side-effects then, or a gated returnTo would re-open the gate.
  useEffect(() => {
    return () => {
      if (closeHandled.current) return;
      AnalyticService.capture("membership_gate_dismissed", { intent });
      if (returnTo && getVisitorGatedRouteIntent(returnTo)) {
        router.replace(routes.home());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.sheetContent}
    >
      <AppHeader variant="modal" onGrabberPress={dismiss} />
      <View style={styles.content}>
        <View style={styles.message}>
          <View style={styles.copy}>
            <AppText variant="eyebrow" tone="accent">
              {copy.eyebrow}
            </AppText>
            <AppText variant="display">{copy.title}</AppText>
            <AppText tone="secondary" style={styles.body}>
              {copy.body}
            </AppText>
          </View>
        </View>

        <View>
          <Button
            title="Join the Club"
            onPress={() => void continueToAuth()}
            loading={continuing}
            size="medium"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    backgroundColor: t.colors.background,
  },
  sheetContent: {
    paddingBottom: t.spacing.xl,
  },
  content: {
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.lg,
    gap: t.spacing.xl,
  },
  message: {
    gap: t.spacing.lg,
  },
  copy: {
    gap: t.spacing.sm,
  },
  body: {
    maxWidth: 520,
  },
}));
