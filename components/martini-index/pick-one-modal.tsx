import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Modal, ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
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
import { AppText, Button, Chip, MartiniShakerIcon } from "@/components/shared";
import MartiniIndexCard from "@/components/martini-index/martini-index-card";
import { makeStyles, useTheme } from "@/theme";
import { logMartiniIndexEvent } from "@/utils/martini-index-analytics";
import {
  getEligibleMartinis,
  MARTINI_SPIRITS,
  MARTINI_TYPES,
  pickMartiniIndexEntry,
  type MartiniIndexEntry,
  type MartiniSpirit,
  type MartiniType,
} from "@/utils/martini-index";

interface PickOneModalProps {
  visible: boolean;
  onClose: () => void;
}

type PickerStep = "preferences" | "shaking" | "result";

const toggleValue = <T extends string>(values: readonly T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];

const tapHaptic = () => {
  if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
};

export default function PickOneModal({ visible, onClose }: PickOneModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const shake = useSharedValue(0);
  const [step, setStep] = useState<PickerStep>("preferences");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [avoidedSpirits, setAvoidedSpirits] = useState<MartiniSpirit[]>([]);
  const [avoidedTypes, setAvoidedTypes] = useState<MartiniType[]>([]);
  const [order, setOrder] = useState<MartiniIndexEntry | null>(null);

  const avoidances = useMemo(
    () => ({ spirits: avoidedSpirits, types: avoidedTypes }),
    [avoidedSpirits, avoidedTypes]
  );
  const eligibleCount = getEligibleMartinis(avoidances).length;

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

  const chooseOrder = () => {
    const nextOrder = pickMartiniIndexEntry(avoidances, order?.id);
    if (!nextOrder) return;
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
  };

  const clearDislikes = () => {
    tapHaptic();
    setAvoidedSpirits([]);
    setAvoidedTypes([]);
  };

  const shakerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shake.value, [-1, 0, 1], [-25, 0, 25]) },
      {
        translateY: interpolate(Math.abs(shake.value), [0, 1], [0, -8]),
      },
      {
        rotate: `${interpolate(shake.value, [-1, 0, 1], [-15, 0, 15])}deg`,
      },
    ],
  }));

  const leftIceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shake.value, [-1, 1], [12, -12]) },
      { translateY: interpolate(shake.value, [-1, 1], [-8, 8]) },
      { rotate: `${interpolate(shake.value, [-1, 1], [-20, 20])}deg` },
    ],
  }));

  const rightIceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shake.value, [-1, 1], [-15, 15]) },
      { translateY: interpolate(shake.value, [-1, 1], [10, -10]) },
      { rotate: `${interpolate(shake.value, [-1, 1], [25, -25])}deg` },
    ],
  }));

  const handleClose = () => {
    if (step === "shaking") return;
    setStep("preferences");
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
            <Animated.View style={[styles.ice, styles.iceLeft, leftIceStyle]} />
            <Animated.View
              style={[styles.ice, styles.iceRight, rightIceStyle]}
            />
            <Animated.View style={[styles.shaker, shakerStyle]}>
              <MartiniShakerIcon
                size={190}
                color={colors.onInk}
                variant="streamlined"
              />
            </Animated.View>
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
              title={step === "result" ? "Your order" : "Pick one"}
              onCancel={step === "result" ? handleClose : undefined}
              cancelLabel="Close"
              action={
                step === "result"
                  ? {
                      label: "Adjust",
                      onPress: () => setStep("preferences"),
                    }
                  : { label: "Close", onPress: handleClose }
              }
              topInset={insets.top}
            />

            {step === "preferences" ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={styles.flex}
              >
                <ScrollView
                  contentInsetAdjustmentBehavior="automatic"
                  contentContainerStyle={styles.content}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.intro}>
                    <AppText variant="eyebrow" tone="accent">
                      HOUSE RULES
                    </AppText>
                    <AppText variant="display">What’s a hard no?</AppText>
                    <AppText tone="secondary">
                      Tap anything you don’t like. We’ll keep it out of your
                      glass and your personality profile.
                    </AppText>
                  </View>

                  <View style={styles.preferenceGroup}>
                    <AppText variant="heading">Skip these spirits</AppText>
                    <View style={styles.chips}>
                      {MARTINI_SPIRITS.map((spirit) => (
                        <Chip
                          key={spirit}
                          label={spirit}
                          selected={avoidedSpirits.includes(spirit)}
                          accessibilityLabel={`Avoid ${spirit}`}
                          onPress={() => {
                            tapHaptic();
                            setAvoidedSpirits((current) =>
                              toggleValue(current, spirit)
                            );
                          }}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.preferenceGroup}>
                    <AppText variant="heading">Skip these styles</AppText>
                    <View style={styles.chips}>
                      {MARTINI_TYPES.map((type) => (
                        <Chip
                          key={type}
                          label={type}
                          selected={avoidedTypes.includes(type)}
                          accessibilityLabel={`Avoid ${type}`}
                          onPress={() => {
                            tapHaptic();
                            setAvoidedTypes((current) =>
                              toggleValue(current, type)
                            );
                          }}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.countRow}>
                    <AppText variant="title">{eligibleCount}</AppText>
                    <AppText tone="secondary">
                      {eligibleCount === 1
                        ? "martini survives"
                        : "martinis survive"}
                    </AppText>
                  </View>

                  <Button
                    title="SHAKE FOR ME"
                    onPress={chooseOrder}
                    size="large"
                    variant="secondary"
                    fullWidth
                    disabled={eligibleCount === 0}
                    disabledReason={
                      eligibleCount === 0
                        ? "You vetoed the entire bar. Free up one preference."
                        : undefined
                    }
                  />

                  {avoidedSpirits.length > 0 || avoidedTypes.length > 0 ? (
                    <Button
                      title="Clear dislikes"
                      onPress={clearDislikes}
                      variant="ghost"
                      size="small"
                      fullWidth
                    />
                  ) : null}
                </ScrollView>
              </Animated.View>
            ) : order ? (
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
                    onPress={chooseOrder}
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
  content: {
    gap: t.spacing.xl,
    paddingHorizontal: t.spacing.sheetGutter,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.giant,
  },
  intro: {
    gap: t.spacing.sm,
  },
  preferenceGroup: {
    gap: t.spacing.md,
  },
  chips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: t.spacing.sm,
  },
  countRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: t.spacing.sm,
    paddingTop: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
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
    zIndex: 2,
    width: 210,
    height: 210,
  },
  ice: {
    position: "absolute" as const,
    width: 34,
    height: 34,
    borderRadius: t.radius.xs,
    borderWidth: 3,
    borderColor: t.colors.highlight,
  },
  iceLeft: {
    top: "29%" as const,
    left: "17%" as const,
  },
  iceRight: {
    top: "38%" as const,
    right: "16%" as const,
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
