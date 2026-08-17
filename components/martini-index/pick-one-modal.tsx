import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Modal, ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import AppHeader from "@/components/nav/AppHeader";
import {
  AppText,
  Button,
  MartiniGlassOutlineIcon,
  MartiniShakerIcon,
  ShotGlassIcon,
} from "@/components/shared";
import MartiniIndexCard from "@/components/martini-index/martini-index-card";
import { makeStyles, useTheme } from "@/theme";
import { logMartiniIndexEvent } from "@/utils/martini-index-analytics";
import {
  pickMartiniIndexEntry,
  type MartiniIndexEntry,
} from "@/utils/martini-index";

interface PickOneModalProps {
  visible: boolean;
  onClose: () => void;
}

type PickerStep = "shaking" | "result";

export default function PickOneModal({ visible, onClose }: PickOneModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const shake = useSharedValue(0);
  const startedForCurrentOpen = useRef(false);
  const [step, setStep] = useState<PickerStep>("shaking");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [order, setOrder] = useState<MartiniIndexEntry | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  const finishOrder = useCallback((nextOrder: MartiniIndexEntry) => {
    setOrder(nextOrder);
    setStep("result");
    if (process.env.EXPO_OS === "ios") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const chooseOrder = useCallback(
    (previousId?: string | null) => {
      const nextOrder = pickMartiniIndexEntry(previousId);
      void logMartiniIndexEvent("generate", nextOrder.id);

      if (process.env.EXPO_OS === "ios") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (reduceMotion) {
        finishOrder(nextOrder);
        return;
      }

      setStep("shaking");
      shake.value = 0;

      shake.value = withSequence(
        withTiming(-1, { duration: 100 }),
        withRepeat(
          withSequence(
            withTiming(1, { duration: 120 }),
            withTiming(-1, { duration: 120 })
          ),
          4,
          false
        ),
        withTiming(0, { duration: 120 }, (finished) => {
          if (finished) runOnJS(finishOrder)(nextOrder);
        })
      );
    },
    [finishOrder, reduceMotion, shake]
  );

  useEffect(() => {
    if (!visible) {
      startedForCurrentOpen.current = false;
      return;
    }
    if (startedForCurrentOpen.current) return;

    startedForCurrentOpen.current = true;
    chooseOrder();
  }, [chooseOrder, visible]);

  const shakerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shake.value, [-1, 0, 1], [-24, 0, 24]) },
      {
        translateY: interpolate(shake.value, [-1, 0, 1], [18, 0, -18]),
      },
      {
        rotate: `${interpolate(shake.value, [-1, 0, 1], [-10, 0, 10])}deg`,
      },
    ],
  }));

  const handleClose = () => {
    if (step === "shaking") return;
    startedForCurrentOpen.current = false;
    setStep("shaking");
    setOrder(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.screen}>
        <StatusBar style={step === "shaking" ? "light" : "auto"} />

        {step === "shaking" ? (
          <View
            style={[
              styles.shakingScreen,
              { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
            accessibilityLabel="Shaking a martini and choosing your order"
          >
            <View style={styles.barware}>
              <View style={styles.martiniGlass}>
                <MartiniGlassOutlineIcon size={148} color={colors.onInk} />
              </View>
              <Animated.View style={[styles.shaker, shakerStyle]}>
                <MartiniShakerIcon
                  size={190}
                  color={colors.onInk}
                  variant="streamlined"
                />
              </Animated.View>
              <View style={styles.shotGlass}>
                <ShotGlassIcon size={118} color={colors.onInk} />
              </View>
            </View>
            <View style={styles.shakingCopy}>
              <AppText variant="eyebrow" style={styles.shakingEyebrow}>
                CONSULTING THE OLIVES
              </AppText>
              <AppText variant="display" style={styles.shakingTitle}>
                Shake. Shake. Shake.
              </AppText>
              <AppText style={styles.shakingBody}>
                One excellent decision, currently in motion.
              </AppText>
            </View>
          </View>
        ) : (
          <>
            <AppHeader
              variant="modal"
              title="Your order"
              onCancel={handleClose}
              cancelLabel="Close"
              topInset={insets.top}
            />

            {order ? (
              <Animated.View
                entering={FadeInUp.duration(260)}
                style={styles.flex}
              >
                <ScrollView
                  contentInsetAdjustmentBehavior="automatic"
                  contentContainerStyle={styles.resultContent}
                >
                  <View style={styles.resultHeading}>
                    <AppText variant="eyebrow" tone="accent">
                      THE SHAKER HAS SPOKEN
                    </AppText>
                    <AppText variant="display">This is the one.</AppText>
                    <AppText tone="secondary">
                      Read it, order it, become briefly mysterious.
                    </AppText>
                  </View>

                  <MartiniIndexCard item={order} compact />

                  <Button
                    title="SHAKE AGAIN"
                    onPress={() => chooseOrder(order.id)}
                    size="large"
                    variant="secondary"
                    fullWidth
                  />
                </ScrollView>
              </Animated.View>
            ) : null}
          </>
        )}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
  },
  resultContent: {
    gap: t.spacing.lg,
    paddingHorizontal: t.spacing.sheetGutter,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.giant,
  },
  resultHeading: {
    gap: t.spacing.xs,
  },
  shakingScreen: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.xxxl,
    overflow: "hidden" as const,
    paddingHorizontal: t.spacing.xl,
    backgroundColor: t.colors.surfaceInkDeep,
  },
  shaker: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 118,
    height: 190,
  },
  barware: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "center" as const,
    gap: t.spacing.sm,
  },
  martiniGlass: {
    width: 112,
    height: 148,
  },
  shotGlass: {
    width: 74,
    height: 118,
  },
  shakingCopy: {
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  shakingEyebrow: {
    color: t.colors.highlight,
  },
  shakingTitle: {
    color: t.colors.onInk,
    textAlign: "center" as const,
  },
  shakingBody: {
    color: t.colors.onInk,
    textAlign: "center" as const,
    opacity: 0.82,
  },
}));
