import {
  beginMemberPointsRead,
  isMemberPointsReadCurrent,
} from "@/utils/memberPoints";
import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import { Animated, PanResponder, Pressable, View } from "react-native";
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
  showPassportStamps: (
    stamps: PassportStampRecord[],
    profileId: string
  ) => void;
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
// Four or more stamps at once (a first reconcile after an update, a catalog
// expansion) collapse into one summary toast instead of a long parade —
// mirroring the server's batched notification.
const SUMMARY_THRESHOLD = 4;

const summaryStamp = (stamps: PassportStampRecord[]): PassportStampRecord => ({
  ...stamps[0],
  id: `summary-${stamps.map((stamp) => stamp.id).join(":")}`,
  key: "summary",
  metric: "martinis",
  threshold: stamps.length,
  points: stamps.reduce((total, stamp) => total + stamp.points, 0),
  label: "Stamps",
});

export function PassportToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useProfile();
  const profileId = profile?.id;
  const scope = useMemo(
    () => (profileId ? beginMemberPointsRead() : null),
    [profileId]
  );
  const [queue, setQueue] = useState<{
    profileId: string;
    stamps: PassportStampRecord[];
  }>({ profileId: "", stamps: [] });
  const translateY = useRef(new Animated.Value(-140)).current;
  const current =
    queue.profileId === profileId ? (queue.stamps[0] ?? null) : null;

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -160,
      duration: 180,
      useNativeDriver: true,
    }).start(() =>
      setQueue((items) => ({ ...items, stamps: items.stamps.slice(1) }))
    );
  }, [translateY]);

  const showPassportStamps = useCallback(
    (stamps: PassportStampRecord[], ownerId: string) => {
      if (ownerId !== profileId || !scope || !isMemberPointsReadCurrent(scope))
        return;
      if (!stamps.length) return;
      const incoming =
        stamps.length >= SUMMARY_THRESHOLD ? [summaryStamp(stamps)] : stamps;
      setQueue((items) => {
        const existing = items.profileId === ownerId ? items.stamps : [];
        const known = new Set(existing.map((item) => item.id));
        return {
          profileId: ownerId,
          stamps: [
            ...existing,
            ...incoming.filter((stamp) => !known.has(stamp.id)),
          ],
        };
      });
    },
    [profileId, scope]
  );

  useEffect(() => {
    if (!profileId) return;
    let active = true;
    let running = false;
    let again = false;
    const reconcile = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        do {
          again = false;
          const transition = await reconcileMyPassport();
          if (active)
            showPassportStamps(transition.unlocked, transition.profileId);
        } while (active && again);
      } catch (error) {
        if (active)
          reportError("Unable to reconcile Passport achievements:", error);
      } finally {
        running = false;
      }
    };
    const unsubscribe = subscribeToPassportReconciliationRequests(
      () => void reconcile()
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [profileId, showPassportStamps]);

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
            accessibilityLabel={
              current.key === "summary"
                ? `Passport Stamps: ${current.threshold} new, ${current.points} points earned. Open Passport.`
                : `Passport Stamp: ${current.label}, ${current.points} points earned. Open Passport.`
            }
            onPress={() => {
              dismiss();
              router.push(
                current.key === "summary"
                  ? routes.passport()
                  : routes.passport({ stampKey: current.key })
              );
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
              <AppText variant="heading" numberOfLines={1}>
                {current.key === "summary"
                  ? `Passport Stamps · ${current.threshold} new · +${current.points} pts`
                  : `Passport Stamp · ${current.label} · +${current.points} pts`}
              </AppText>
              <AppText variant="caption" tone="secondary">
                Tap to view your Passport
              </AppText>
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
