import React from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/shared";
import ReviewTag from "@/components/shared/review-tag";
import { makeStyles, useTheme } from "@/theme";
import type { MartiniIndexEntry } from "@/utils/martini-index";

interface MartiniIndexCardProps {
  item: MartiniIndexEntry;
  compact?: boolean;
}

export default function MartiniIndexCard({
  item,
  compact = false,
}: MartiniIndexCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const editorialBadgeStyle =
    item.badge === "Bar classic"
      ? styles.badgeBarClassic
      : item.badge === "Club pick"
        ? styles.badgeClubPick
        : styles.badgeIbaOfficial;
  const editorialBadgeTextStyle =
    item.badge === "Bar classic"
      ? styles.badgeTextBarClassic
      : item.badge === "Club pick"
        ? styles.badgeTextClubPick
        : styles.badgeTextIbaOfficial;
  const editorialBadgeIcon =
    item.badge === "Bar classic"
      ? "wine-outline"
      : item.badge === "Club pick"
        ? "star"
        : "ribbon-outline";
  const editorialBadgeIconColor =
    item.badge === "Bar classic"
      ? colors.onHighlight
      : item.badge === "Club pick"
        ? colors.onBrand
        : colors.onInk;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.imageFrame, compact && styles.imageFrameCompact]}>
        <Image
          source={item.image}
          style={styles.image}
          contentFit="cover"
          transition={180}
          accessibilityLabel={`${item.title} in a martini glass`}
        />
        <View style={[styles.badge, editorialBadgeStyle]}>
          <Ionicons
            name={editorialBadgeIcon}
            size={15}
            color={editorialBadgeIconColor}
          />
          <AppText
            variant="micro"
            style={[styles.badgeText, editorialBadgeTextStyle]}
          >
            {item.badge.toUpperCase()}
          </AppText>
        </View>
        <View style={styles.imageMetaBadges}>
          <ReviewTag name={item.spirit} fallback="spirit" />
          <ReviewTag name={item.type} fallback="type" />
        </View>
      </View>

      <View style={styles.body}>
        <AppText variant="title" style={styles.drinkTitle}>
          {item.title}
        </AppText>
        <AppText tone="secondary">{item.description}</AppText>
        <View style={styles.rule} />
        <View style={styles.ingredientsBlock}>
          <AppText variant="eyebrow" tone="muted">
            INGREDIENTS
          </AppText>
          <AppText variant="caption" tone="secondary">
            {item.ingredients}
          </AppText>
        </View>
      </View>
      <View style={styles.orderBlock}>
        <AppText variant="eyebrow" style={styles.orderLabel}>
          SAY THIS
        </AppText>
        <AppText variant="bodyStrong" style={styles.orderText}>
          “{item.order}”
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    overflow: "hidden" as const,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    ...t.elevation.card,
  },
  cardCompact: {
    borderColor: t.colors.borderStrong,
  },
  imageFrame: {
    height: 218,
    backgroundColor: t.colors.imagePlaceholder,
  },
  imageFrameCompact: {
    height: 190,
  },
  image: {
    width: "100%" as const,
    height: "100%" as const,
  },
  badge: {
    position: "absolute" as const,
    top: t.spacing.md,
    left: 0,
    minHeight: 38,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    paddingLeft: t.spacing.lg,
    paddingRight: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderTopRightRadius: t.radius.md,
    borderBottomRightRadius: t.radius.md,
    borderCurve: "continuous" as const,
    boxShadow: "0 2px 8px rgba(6, 10, 8, 0.22)",
  },
  badgeText: {
    fontFamily: t.typography.label.fontFamily,
    letterSpacing: 0.7,
  },
  badgeBarClassic: {
    backgroundColor: t.colors.highlight,
  },
  badgeTextBarClassic: {
    color: t.colors.onHighlight,
  },
  badgeClubPick: {
    backgroundColor: t.colors.surfaceBrand,
  },
  badgeTextClubPick: {
    color: t.colors.onBrand,
  },
  badgeIbaOfficial: {
    backgroundColor: t.colors.surfaceInk,
  },
  badgeTextIbaOfficial: {
    color: t.colors.onInk,
  },
  imageMetaBadges: {
    position: "absolute" as const,
    left: t.spacing.md,
    bottom: t.spacing.md,
    flexDirection: "row" as const,
    gap: t.spacing.sm,
  },
  body: {
    gap: t.spacing.sm,
    padding: t.spacing.lg,
  },
  drinkTitle: {
    color: t.isDark ? t.colors.text : "#000000",
  },
  rule: {
    height: 1,
    marginVertical: t.spacing.xs,
    backgroundColor: t.colors.divider,
  },
  ingredientsBlock: {
    gap: t.spacing.xs,
  },
  orderBlock: {
    gap: t.spacing.xs,
    padding: t.spacing.lg,
    backgroundColor: t.colors.accentSubtle,
  },
  orderLabel: {
    color: t.colors.accent,
  },
  orderText: {
    color: t.isDark ? t.colors.text : "#000000",
  },
}));
