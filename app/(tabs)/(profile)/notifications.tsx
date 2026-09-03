import React, { useState } from "react";
import { SafeAreaView, Switch, Text, View } from "react-native";
import { makeStyles, useTheme } from "@/theme";
import { setFridayMartiniReminderEnabled } from "@/utils/martiniReminder";
import { useProfile } from "@/context/profile-context";

/**
 * Notification preferences. Holds just the Tini Time Reminder today, but
 * is its own screen so future per-kind toggles (likes, comments, regulars)
 * land here rather than crowding Settings.
 */
const Notifications = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile, updateProfile } = useProfile();
  const [reminderOverride, setReminderOverride] = useState<boolean | null>(
    null
  );
  const [mentionOverride, setMentionOverride] = useState<boolean | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);
  const [savingMentions, setSavingMentions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persistedReminderEnabled =
    profile?.weekly_push_notifications_enabled ?? true;
  const reminderEnabled = reminderOverride ?? persistedReminderEnabled;
  const persistedMentionEnabled =
    profile?.mention_notifications_enabled ?? true;
  const mentionEnabled = mentionOverride ?? persistedMentionEnabled;

  const toggleReminder = async (enabled: boolean) => {
    setError(null);
    setSavingReminder(true);
    setReminderOverride(enabled);
    try {
      const result = await updateProfile({
        weekly_push_notifications_enabled: enabled,
      });

      if (result.error) {
        setError("We couldn't save your reminder preference. Try again.");
        return;
      }

      await setFridayMartiniReminderEnabled(enabled);
    } catch {
      setError("Your preference was saved, but the reminder couldn't update.");
    } finally {
      setReminderOverride(null);
      setSavingReminder(false);
    }
  };

  const toggleMentions = async (enabled: boolean) => {
    setError(null);
    setSavingMentions(true);
    setMentionOverride(enabled);
    try {
      const result = await updateProfile({
        mention_notifications_enabled: enabled,
      });
      if (result.error) {
        setError("We couldn't save your mention preference. Try again.");
      }
    } catch {
      setError("We couldn't save your mention preference. Try again.");
    } finally {
      setMentionOverride(null);
      setSavingMentions(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Tini Time Reminder</Text>
            <Text style={styles.rowSubtitle}>
              A weekly nudge at 4pm on Fridays
            </Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={toggleReminder}
            disabled={savingReminder}
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Tini Time Reminder"
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Mentions</Text>
            <Text style={styles.rowSubtitle}>
              Activity and push alerts when someone tags you
            </Text>
          </View>
          <Switch
            value={mentionEnabled}
            onValueChange={toggleMentions}
            disabled={savingMentions}
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Mention notifications"
          />
        </View>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert" selectable>
            {error}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.xl,
    gap: t.spacing.md,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.lg,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  rowSubtitle: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  error: {
    ...t.typography.caption,
    color: t.colors.danger,
    paddingHorizontal: t.spacing.sm,
  },
}));

export default Notifications;
