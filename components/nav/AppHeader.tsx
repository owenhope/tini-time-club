import React, { useCallback } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setStatusBarStyle } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import { fonts, makeStyles, useTheme } from "@/theme";

/**
 * The app's top bar — four variants, no fifth.
 *
 * A · `large`   the five tab roots. Green block, lowercase display title, one
 *               trailing circle, and either a search field or a chip row
 *               beneath it — never both.
 * B · `compact` pushed lists and settings, and what A and C collapse into.
 *               Translucent paper, centred sentence-case title, outlined
 *               circles.
 * C · `media`   only where a photo owns the top: place detail, a member's
 *               profile. 210px image under a scrim, controls on their own
 *               plates rather than bare on the photo.
 * D · `modal`   anything presented: the composer, the review sheet. Grabber,
 *               then Cancel · title · primary action. No back chevron.
 *
 * The A→B and C→B crossfade runs off one shared animated value — the
 * `progress` a screen gets from `useCollapsibleHeader`, 0 at the top and 1
 * once the content has scrolled 120pt. A and C fade out as it rises; a
 * `compact` header given the same value fades in. Nothing ever hides on
 * scroll-down.
 */

export type AppHeaderVariant = "large" | "compact" | "media" | "modal";

export interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}

export interface AppHeaderProps {
  variant: AppHeaderVariant;
  title: string;
  /** Tracked uppercase line above a large title. */
  eyebrow?: string;
  /** The line under a large or media title — a subline, or `city · distance`. */
  meta?: string;
  /** Variant C: the photo that owns the top. Without one the ground is green. */
  imageUri?: string | null;
  /** Variant A's single control, or variant B's trailing one. */
  trailing?: HeaderAction;
  /** Variant B and C: the controls on the right, in drawn order. */
  actions?: HeaderAction[];
  /** Omit and no leading control is drawn — the tab roots have nowhere back. */
  onBack?: () => void;
  /** Variant A: the search field or the chip row that sits inside the green. */
  below?: React.ReactNode;
  /** Handles keep their owner's capitalisation; every other A title is lowercase. */
  preserveCase?: boolean;
  /** The green under variant A. `inkDeep` continues a deep-green block below it. */
  ground?: "ink" | "inkDeep";
  /** 0→1 over 120pt of scroll. Drives the crossfade in both directions. */
  progress?: Animated.Value;
  /** True past the midpoint — what makes the faded-in bar tappable. */
  collapsed?: boolean;
  /**
   * Variant B only: pin the bar over the content rather than above it, for a
   * screen whose variant C block scrolls away underneath it.
   */
  overlay?: boolean;
  /** Variant D only: the left-hand text action. */
  onCancel?: () => void;
  /** Variant D only: the right-hand primary. Greys out until the form is valid. */
  action?: { label: string; onPress: () => void; disabled?: boolean };
  /** Variant D only — a presented sheet owns its own top, a full-screen one doesn't. */
  topInset?: number;
  /**
   * Which status bar the header asks for. Defaults to the variant's own ground
   * — light on green, the theme's on paper — and `"none"` hands the job to a
   * sibling header on a screen that has two.
   */
  statusBar?: "light" | "dark" | "auto" | "none";
}

/** 40px visual, 44px tap — the difference is the slop. */
const CIRCLE = 40;
const TAP_SLOP = { top: 2, bottom: 2, left: 2, right: 2 };
const MEDIA_HEIGHT = 210;

type CircleTone = "onInk" | "outline" | "scrim";

const NavCircle = ({
  action,
  tone,
  size = 20,
}: {
  action: HeaderAction;
  tone: CircleTone;
  size?: number;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  const glyph = {
    onInk: colors.onInk,
    outline: colors.accent,
    scrim: colors.textOnImage,
  }[tone];

  return (
    <Pressable
      onPress={action.onPress}
      hitSlop={TAP_SLOP}
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
      style={({ pressed }) => [
        styles.circle,
        styles[`circle_${tone}` as const],
        pressed && styles.circlePressed,
      ]}
    >
      <Ionicons name={action.icon} size={size} color={glyph} />
    </Pressable>
  );
};

/**
 * Variant B, and the collapsed form of A and C. Rendered on its own for a
 * pushed screen; rendered over A or C, fading in on the shared value, when a
 * screen collapses.
 */
const CompactBar = ({
  title,
  onBack,
  actions,
  trailing,
  progress,
  collapsed,
  overlay,
}: {
  title: string;
  onBack?: () => void;
  actions?: HeaderAction[];
  trailing?: HeaderAction;
  progress?: Animated.Value;
  collapsed?: boolean;
  overlay?: boolean;
}) => {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const right = actions ?? (trailing ? [trailing] : []);
  // The title is centred between the two ends, so an end with nothing in it
  // still has to take up its width.
  const leadingWidth = onBack ? CIRCLE : CIRCLE;
  const trailingWidth =
    Math.max(right.length, 1) * CIRCLE + (right.length > 1 ? 9 : 0);

  return (
    <Animated.View
      // The blur the drawing carries needs expo-blur, which needs a new dev
      // client; until then the bar leans on the paper at 94% alone.
      style={[
        styles.compact,
        { paddingTop: insets.top + 8 },
        overlay && styles.compactOverlay,
        progress ? { opacity: progress } : null,
      ]}
      pointerEvents={overlay && !collapsed ? "none" : "auto"}
    >
      <View style={styles.compactFill} pointerEvents="none" />
      <View style={[styles.compactEnd, { width: leadingWidth }]}>
        {onBack ? (
          <NavCircle
            tone="outline"
            action={{
              icon: "chevron-back",
              onPress: onBack,
              accessibilityLabel: "Back",
            }}
          />
        ) : null}
      </View>
      <Text style={styles.compactTitle} numberOfLines={1}>
        {title}
      </Text>
      <View
        style={[
          styles.compactEnd,
          styles.compactEndRight,
          { width: trailingWidth },
        ]}
      >
        {right.map((action) => (
          <NavCircle
            key={action.icon + action.accessibilityLabel}
            tone="outline"
            action={action}
            size={19}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const AppHeader: React.FC<AppHeaderProps> = ({
  variant,
  title,
  eyebrow,
  meta,
  imageUri,
  trailing,
  actions,
  onBack,
  below,
  preserveCase = false,
  ground = "ink",
  progress,
  collapsed = false,
  overlay = false,
  onCancel,
  action,
  topInset = 0,
  statusBar,
}) => {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  /**
   * The header owns the top of the screen, so it owns the status bar with it.
   * Set on focus rather than on mount: popping back to a green root has to put
   * the light glyphs back, and an effect that only fires on mount leaves the
   * revealed screen wearing the bar the popped one asked for.
   *
   * A presented sheet is inset from the top and never covers the status bar,
   * so only a full-screen presentation — the one that passes a top inset —
   * speaks for it.
   */
  const onInkGround = variant === "large" || variant === "media";
  const requested =
    statusBar ??
    (variant === "modal" && topInset === 0
      ? "none"
      : onInkGround
        ? "light"
        : "auto");
  useFocusEffect(
    useCallback(() => {
      if (requested === "none") return;
      setStatusBarStyle(
        requested === "auto" ? (isDark ? "light" : "dark") : requested
      );
    }, [requested, isDark])
  );

  if (variant === "compact") {
    return (
      <CompactBar
        title={title}
        onBack={onBack}
        actions={actions}
        trailing={trailing}
        progress={progress}
        collapsed={collapsed}
        overlay={overlay}
      />
    );
  }

  if (variant === "modal") {
    const disabled = action?.disabled ?? false;
    return (
      <View style={[styles.modal, { paddingTop: topInset }]}>
        <View style={styles.grabberRow}>
          <View style={styles.grabber} />
        </View>
        <View style={styles.modalRow}>
          <Pressable
            onPress={onCancel}
            hitSlop={TAP_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.modalAction}
          >
            <Text style={styles.modalCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            onPress={action?.onPress}
            disabled={disabled || !action}
            hitSlop={TAP_SLOP}
            accessibilityRole="button"
            accessibilityLabel={action?.label ?? ""}
            accessibilityState={{ disabled }}
            style={[styles.modalAction, styles.modalActionRight]}
          >
            <Text
              style={[styles.modalPrimary, disabled && styles.modalPrimaryOff]}
            >
              {action?.label}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const fade = progress
    ? {
        opacity: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        }),
      }
    : null;

  if (variant === "media") {
    return (
      <View style={[styles.media, imageUri ? styles.mediaWithPhoto : null]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
        ) : null}
        {/* Top and bottom scrims from one gradient, so the controls read on a
            pale photo and the name reads on a busy one. Only over a photo:
            the deep green needs no help, and scrimming it just puts a seam
            across the block. */}
        {imageUri ? (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="mediaScrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.overlay} stopOpacity={1} />
                <Stop
                  offset="0.45"
                  stopColor={colors.overlay}
                  stopOpacity={0}
                />
                <Stop offset="1" stopColor={colors.overlay} stopOpacity={0.9} />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#mediaScrim)"
            />
          </Svg>
        ) : null}

        {/* In flow, not absolute: with a photo the block is 210 tall and
            space-between pushes the name to the bottom, and without one the
            row still has to reserve its own height or the name lands under
            the status bar. */}
        <Animated.View
          style={[styles.mediaControls, { paddingTop: insets.top + 8 }, fade]}
          pointerEvents={collapsed ? "none" : "auto"}
        >
          {onBack ? (
            <NavCircle
              tone="scrim"
              action={{
                icon: "chevron-back",
                onPress: onBack,
                accessibilityLabel: "Back",
              }}
            />
          ) : (
            <View style={styles.circle} />
          )}
          <View style={styles.mediaActions}>
            {(actions ?? []).map((a) => (
              <NavCircle
                key={a.icon + a.accessibilityLabel}
                tone="scrim"
                action={a}
                size={19}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.mediaIdentity, fade]}>
          <Text
            style={styles.mediaTitle}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {title}
          </Text>
          {meta ? (
            <Text style={styles.mediaMeta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    );
  }

  // Variant A.
  return (
    <View
      style={[
        styles.large,
        ground === "inkDeep" && styles.largeDeep,
        { paddingTop: insets.top + 8 },
      ]}
    >
      <Animated.View style={fade}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <View style={styles.largeRow}>
          <Text
            style={[styles.largeTitle, preserveCase && styles.largeTitlePlain]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
          >
            {title}
          </Text>
          {trailing ? <NavCircle tone="onInk" action={trailing} /> : null}
        </View>
        {meta ? <Text style={styles.largeMeta}>{meta}</Text> : null}
      </Animated.View>
      {below ? <View style={styles.largeBelow}>{below}</View> : null}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  circle_onInk: {
    backgroundColor: t.colors.ratingTrackOnInk,
  },
  circle_outline: {
    borderWidth: 1.5,
    borderColor: t.colors.border,
  },
  circle_scrim: {
    backgroundColor: t.colors.overlay,
  },
  circlePressed: {
    opacity: 0.6,
  },

  // A · large
  large: {
    backgroundColor: t.colors.surfaceInk,
    paddingHorizontal: t.spacing.gutter,
    paddingBottom: t.spacing.gutter,
    gap: t.spacing.md,
  },
  largeDeep: {
    backgroundColor: t.colors.surfaceInkDeep,
  },
  largeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
  },
  // Lowercase, black, tight — the wordmark's own voice.
  largeTitle: {
    ...t.typography.display,
    fontSize: 30,
    // Never below the point size: RN crops the line box rather than letting
    // the glyphs overhang it.
    lineHeight: 34,
    color: t.colors.onInk,
    flexShrink: 1,
  },
  // A handle is a name — it keeps whatever case its owner chose.
  largeTitlePlain: {
    textTransform: "none" as const,
  },
  eyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.onInk,
    marginBottom: 6,
  },
  largeMeta: {
    ...t.typography.caption,
    color: t.colors.onInk,
    marginTop: 6,
  },
  largeBelow: {
    gap: t.spacing.sm,
  },

  // B · compact
  compact: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.gutter,
    paddingBottom: t.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.divider,
  },
  compactOverlay: {
    ...({ position: "absolute" } as const),
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  /**
   * The drawing's bar is paper at 94% over a 14px blur, and the two go
   * together: the blur is what turns the content behind it into a wash. With
   * no blur available (expo-blur is a native module and would need a new dev
   * client) 94% alone let a whole identity block read through the title. Solid
   * until the blur can come with it — the spec's own rule is that the bar has
   * to be opaque enough to read.
   */
  compactFill: {
    ...({ position: "absolute" } as const),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.background,
  },
  compactEnd: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 9,
  },
  compactEndRight: {
    justifyContent: "flex-end" as const,
  },
  compactTitle: {
    ...t.typography.heading,
    flex: 1,
    textAlign: "center" as const,
    color: t.colors.text,
  },

  // C · over media
  media: {
    backgroundColor: t.colors.surfaceInkDeep,
    justifyContent: "space-between" as const,
  },
  // The drawn height is the photo's. Without one the block sizes to the name
  // it carries rather than holding open 210pt of empty green — a venue with no
  // photo yet still has to look deliberate.
  mediaWithPhoto: {
    height: MEDIA_HEIGHT,
  },
  mediaControls: {
    paddingHorizontal: t.spacing.gutter,
    paddingBottom: t.spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  mediaActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 9,
  },
  mediaIdentity: {
    paddingHorizontal: t.spacing.gutter,
    paddingBottom: t.spacing.lg,
    gap: 5,
  },
  mediaTitle: {
    fontFamily: fonts.black,
    fontSize: 27,
    lineHeight: 30,
    letterSpacing: -0.8,
    color: t.colors.textOnImage,
  },
  mediaMeta: {
    ...t.typography.mono,
    fontSize: 12,
    color: t.colors.textOnImage,
    opacity: 0.82,
  },

  // D · modal
  modal: {
    backgroundColor: t.colors.background,
  },
  grabberRow: {
    paddingTop: t.spacing.lg - 2,
    paddingBottom: 6,
    alignItems: "center" as const,
  },
  grabber: {
    width: 42,
    height: 5,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.borderStrong,
    opacity: 0.28,
  },
  modalRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.gutter,
    paddingBottom: t.spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.divider,
  },
  modalAction: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: "center" as const,
  },
  modalActionRight: {
    alignItems: "flex-end" as const,
  },
  modalCancel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: t.colors.textMuted,
  },
  modalTitle: {
    ...t.typography.heading,
    flex: 1,
    textAlign: "center" as const,
    color: t.colors.text,
  },
  modalPrimary: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.colors.accent,
  },
  // Greys out until the form is valid.
  modalPrimaryOff: {
    color: t.colors.textMuted,
  },
}));

export default AppHeader;
