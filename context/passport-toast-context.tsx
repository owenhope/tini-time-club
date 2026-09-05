import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared";
import { PassportStamp } from "@/components/passport/passport-stamp";
import type { PassportStampRecord } from "@/services/passportService";
import { reconcileMyPassport } from "@/services/passportService";
import { useProfile } from "@/context/profile-context";
import { reportError } from "@/utils/log";
import { subscribeToPassportReconciliationRequests } from "@/utils/passport-reconciliation-events";
import { makeStyles } from "@/theme";
import { routes } from "@/utils/routes";

type PassportToastContextValue = {
  showPassportStamps: (stamps: PassportStampRecord[], points?: number) => void;
};

export const PassportToastContext = createContext<PassportToastContextValue>({
  showPassportStamps: () => {
    reportError(
      "showPassportStamps called outside PassportToastProvider; toast dropped."
    );
  },
});

const AUTO_DISMISS_MS = 6500;
const SWIPE_DISMISS_Y = -38;

export function PassportToastProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setProfile } = useProfile();
  const [queue, setQueue] = useState<PassportStampRecord[]>([]);
  const translateY = useRef(new Animated.Value(-140)).current;
  const current = queue[0] ?? null;
  const reconcilingRef = useRef(false);
  const reconcileAgainRef = useRef(false);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -160,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setQueue((items) => items.slice(1)));
  }, [translateY]);

  const showPassportStamps = useCallback(
    (stamps: PassportStampRecord[], points?: number) => {
      if (points != null) {
        setProfile((profile) =>
          profile && profile.passport_points !== points
            ? { ...profile, passport_points: points }
            : profile
        );
      }
      if (!stamps.length) return;
      setQueue((items) => {
        const known = new Set(items.map((item) => item.id));
        return [...items, ...stamps.filter((stamp) => !known.has(stamp.id))];
      });
    },
    [setProfile]
  );

  const reconcile = useCallback(async () => {
    if (reconcilingRef.current) {
      reconcileAgainRef.current = true;
      return;
    }
    reconcilingRef.current = true;
    try {
      const transition = await reconcileMyPassport();
      showPassportStamps(transition.unlocked, transition.points);
    } catch (error) {
      reportError("Unable to reconcile Passport achievements:", error);
    } finally {
      reconcilingRef.current = false;
      if (reconcileAgainRef.current) {
        reconcileAgainRef.current = false;
        void reconcile();
      }
    }
  }, [showPassportStamps]);

  useEffect(
    () => subscribeToPassportReconciliationRequests(() => void reconcile()),
    [reconcile]
  );

  useEffect(() => {
    if (!current) return;
    translateY.setValue(-140);
    Animated.spring(translateY, {
      toValue: 0,
      damping: 18,
      stiffness: 210,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
    if (process.env.EXPO_OS === "ios") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [current, dismiss, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy < -6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy <= SWIPE_DISMISS_Y || gesture.vy < -0.55) {
          dismiss();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <PassportToastContext.Provider value={{ showPassportStamps }}>
      {children}
      {current ? (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.position,
            { top: insets.top + 8, transform: [{ translateY }] },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Passport stamp earned: ${current.label}, ${current.points} points. Open Passport.`}
            onPress={() => {
              dismiss();
              router.push(routes.passport({ stampKey: current.key }));
            }}
            style={({ pressed }) => [styles.toast, pressed && styles.pressed]}
          >
            <View style={styles.stamp}>
              <PassportStamp
                shape={current.metric}
                milestone={current.threshold}
                pointAward={current.points}
                earned
                label={current.label}
              />
            </View>
            <View style={styles.copy}>
              <AppText variant="eyebrow" tone="accent">
                {current.metric === "combination"
                  ? "MARTINI EXPLORER STAMP"
                  : "PASSPORT STAMP EARNED"}
              </AppText>
              <AppText variant="heading" numberOfLines={1}>{current.label}</AppText>
              <AppText variant="caption" tone="secondary">+{current.points} pts · Tap to view your Passport</AppText>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </PassportToastContext.Provider>
  );
}

const useStyles = makeStyles((t) => ({
  position: {
    position: "absolute" as const,
    zIndex: 1000,
    left: t.spacing.gutter,
    right: t.spacing.gutter,
  },
  toast: {
    minHeight: 92,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.card,
    borderCurve: "continuous" as const,
    borderWidth: 1,
    borderColor: t.colors.accent,
    backgroundColor: t.colors.surface,
    boxShadow: "0 8px 28px rgba(0, 0, 0, 0.24)",
  },
  pressed: { opacity: 0.86 },
  stamp: { width: 72, height: 72 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
}));
