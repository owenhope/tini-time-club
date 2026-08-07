import React, { useEffect, useState } from "react";
import { SafeAreaView, Switch, Text, View } from "react-native";
import { fonts, makeStyles, useTheme } from "@/theme";
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
  const [reminderEnabled, setReminderEnabled] = useState(true);

  useEffect(() => {
    setReminderEnabled(profile?.weekly_push_notifications_enabled ?? true);
  }, [profile?.weekly_push_notifications_enabled]);

  const toggleReminder = async (enabled: boolean) => {
    const previous = reminderEnabled;
    setReminderEnabled(enabled);
    const result = await updateProfile({
      weekly_push_notifications_enabled: enabled,
    });

    if (result.error) {
      setReminderEnabled(previous);
      return;
    }

    await setFridayMartiniReminderEnabled(enabled);
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
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Tini Time Reminder"
          />
        </View>
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
    ...t.typography.body,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: t.colors.text,
  },
  rowSubtitle: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
}));

export default Notifications;
