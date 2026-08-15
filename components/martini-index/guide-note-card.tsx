import React from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared";
import { makeStyles } from "@/theme";
import type { MartiniGuideNote } from "@/utils/martini-index";

interface GuideNoteCardProps {
  item: MartiniGuideNote;
}

export default function GuideNoteCard({ item }: GuideNoteCardProps) {
  const styles = useStyles();

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.content}>
        <View style={styles.heading}>
          <AppText variant="eyebrow" style={styles.kicker}>
            DID YOU KNOW?
          </AppText>
          <AppText variant="title" style={styles.title}>
            {item.title}
          </AppText>
        </View>

        <AppText style={styles.bodyText}>{item.body}</AppText>
      </View>
      <View style={styles.closer}>
        <AppText variant="eyebrow" style={styles.closerLabel}>
          BAR NOTE
        </AppText>
        <AppText variant="bodyStrong" style={styles.closerText}>
          {item.closer}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    overflow: "hidden" as const,
    borderRadius: t.radius.card,
    borderCurve: "continuous" as const,
    borderWidth: 1,
    borderColor: t.colors.surfaceInk,
    backgroundColor: t.colors.surfaceInk,
    ...t.elevation.card,
  },
  content: {
    gap: t.spacing.sm,
    padding: t.spacing.lg,
  },
  heading: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  kicker: {
    color: t.colors.highlight,
  },
  title: {
    color: t.colors.onInk,
  },
  bodyText: {
    color: t.colors.onInk,
  },
  closer: {
    gap: t.spacing.xs,
    padding: t.spacing.lg,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  closerLabel: {
    flexShrink: 0,
    color: t.colors.highlight,
  },
  closerText: {
    color: t.colors.onInk,
  },
}));
