import React from "react";
import { ScrollView, Text, View } from "react-native";
import { MartiniIcon } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";

const KEY_RULES = [
  {
    value: "10",
    label: "places per region",
  },
  {
    value: "3+",
    label: "different members",
  },
  {
    value: "1",
    label: "voice per member",
  },
] as const;

const DETAILS = [
  {
    title: "How a place qualifies",
    body: "A place must be eligible and have active reviews from at least three different members. The ten highest-ranked qualifying places in each enabled region receive Golden Glass recognition.",
  },
  {
    title: "How each member counts",
    body: "Every member has one voice per place. If someone reviews the same place more than once, those reviews are averaged into one contribution before ranking.",
  },
  {
    title: "How places are ranked",
    body: "Taste and presentation form the overall score. The ranking balances that score with the number of members behind it, so a high rating with broader support carries more confidence.",
  },
] as const;

export default function GoldenGlassInfoScreen() {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow} selectable>
          THE CLUB&apos;S CURRENT GLASS LIST
        </Text>
        <View style={styles.titleRow}>
          <MartiniIcon size={28} color={colors.awardGold} filled />
          <Text style={styles.title} selectable>
            How Golden Glass works
          </Text>
        </View>
        <Text style={styles.intro} selectable>
          Golden Glass highlights the places members are rating most highly
          right now. It is calculated from member reviews—not advertising,
          sponsorship, or business verification.
        </Text>
      </View>

      <View style={styles.rulesSection}>
        <Text style={styles.sectionLabel} selectable>
          THE RULES AT A GLANCE
        </Text>
        <View style={styles.rules}>
          {KEY_RULES.map((rule) => (
            <View key={rule.label} style={styles.ruleCard}>
              <Text style={styles.ruleValue} selectable>
                {rule.value}
              </Text>
              <Text style={styles.ruleLabel} selectable>
                {rule.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.sectionLabel} selectable>
          WHAT THAT MEANS
        </Text>
        {DETAILS.map((detail) => (
          <View key={detail.title} style={styles.detailCard}>
            <Text style={styles.detailTitle} selectable>
              {detail.title}
            </Text>
            <Text style={styles.detailBody} selectable>
              {detail.body}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle} selectable>
          A living list
        </Text>
        <Text style={styles.noteBody} selectable>
          Golden Glass is a current snapshot, not a permanent award. Rankings
          can change as members add reviews. When scores tie, review count, raw
          rating, and recent activity determine the order.
        </Text>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    padding: t.spacing.gutter,
    paddingBottom: t.spacing.xxxl,
    gap: t.spacing.xl,
  },
  hero: {
    gap: t.spacing.sm,
  },
  eyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.awardGold,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  title: {
    ...t.typography.display,
    color: t.colors.text,
    flex: 1,
  },
  intro: {
    ...t.typography.body,
    color: t.colors.textSecondary,
  },
  rulesSection: {
    gap: t.spacing.sm,
  },
  sectionLabel: {
    ...t.typography.eyebrow,
    color: t.colors.textMuted,
  },
  rules: {
    flexDirection: "row" as const,
    gap: t.spacing.sm,
  },
  ruleCard: {
    flex: 1,
    minHeight: 104,
    justifyContent: "center" as const,
    gap: t.spacing.xs,
    padding: t.spacing.md,
    borderRadius: t.radius.card,
    backgroundColor: t.colors.surfaceInk,
  },
  ruleValue: {
    ...t.typography.display,
    color: t.colors.awardGold,
    fontVariant: ["tabular-nums"] as const,
  },
  ruleLabel: {
    ...t.typography.caption,
    color: t.colors.onInk,
  },
  details: {
    gap: t.spacing.md,
  },
  detailCard: {
    gap: t.spacing.sm,
    padding: t.spacing.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.card,
    backgroundColor: t.colors.surface,
  },
  detailTitle: {
    ...t.typography.heading,
    color: t.colors.text,
  },
  detailBody: {
    ...t.typography.body,
    color: t.colors.textSecondary,
  },
  note: {
    gap: t.spacing.sm,
    padding: t.spacing.lg,
    borderRadius: t.radius.card,
    backgroundColor: t.colors.surfaceInk,
  },
  noteTitle: {
    ...t.typography.heading,
    color: t.colors.onInk,
  },
  noteBody: {
    ...t.typography.body,
    color: t.colors.onInk,
  },
}));
