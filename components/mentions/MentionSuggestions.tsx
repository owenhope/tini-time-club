import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Avatar from "@/components/shared/Avatar";
import type { MentionCandidate } from "@/types/types";
import { makeStyles, useTheme } from "@/theme";

const relationshipLabel: Record<MentionCandidate["relationship"], string> = {
  mutual: "Mutual",
  following: "Following",
  follows_you: "Follows you",
  recent: "Recent",
  everyone: "Member",
};

export default function MentionSuggestions({
  visible,
  loading,
  unavailable,
  query,
  results,
  onSelect,
  presentation = "floating",
}: {
  visible: boolean;
  loading: boolean;
  unavailable: boolean;
  query: string;
  results: MentionCandidate[];
  onSelect: (candidate: MentionCandidate) => void;
  presentation?: "floating" | "sheet";
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <View
      style={[styles.panel, presentation === "sheet" && styles.sheetPanel]}
      accessibilityLabel="Mention suggestions"
    >
      {presentation === "sheet" ? (
        <View style={styles.header}>
          <Text style={styles.title}>Mention a member</Text>
          <Text style={styles.subtitle}>
            {query
              ? `Results for @${query}`
              : "People closest to you appear first"}
          </Text>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.stateText}>Finding members…</Text>
        </View>
      ) : unavailable ? (
        <Text style={styles.stateText}>Member search is unavailable</Text>
      ) : results.length === 0 ? (
        <Text style={styles.stateText}>No members found</Text>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {results.map((candidate) => (
            <TouchableOpacity
              key={candidate.id}
              style={styles.candidate}
              activeOpacity={0.72}
              onPress={() => onSelect(candidate)}
              accessibilityRole="button"
              accessibilityLabel={`Mention ${candidate.username}, ${relationshipLabel[candidate.relationship]}`}
            >
              <Avatar
                avatarPath={candidate.avatarUrl}
                username={candidate.username}
                size={30}
                reviewCount={candidate.reviewCount}
              />
              <View style={styles.copy}>
                <Text style={styles.username} numberOfLines={1}>
                  @{candidate.username}
                </Text>
                <Text style={styles.details} numberOfLines={1}>
                  {candidate.name ? (
                    <Text style={styles.name}>{candidate.name}</Text>
                  ) : null}
                  <Text style={styles.relationship}>
                    {candidate.name ? " · " : ""}
                    {relationshipLabel[candidate.relationship]}
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  panel: {
    maxHeight: 340,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.card,
    backgroundColor: t.colors.surface,
    paddingVertical: t.spacing.xs,
    ...t.elevation.card,
  },
  sheetPanel: {
    flex: 1,
    maxHeight: undefined,
    borderWidth: 0,
    borderRadius: 0,
    paddingVertical: t.spacing.md,
    elevation: 0,
    shadowOpacity: 0,
  },
  header: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.md,
  },
  title: {
    ...t.typography.title,
    color: t.colors.text,
  },
  subtitle: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginTop: t.spacing.xs,
  },
  list: {
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.xl,
  },
  candidate: {
    width: "100%" as const,
    minHeight: 54,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  copy: { flex: 1, minWidth: 0 },
  username: {
    ...t.typography.caption,
    color: t.colors.usernameText,
  },
  details: { ...t.typography.caption, color: t.colors.textSecondary },
  relationship: {
    ...t.typography.label,
    color: t.colors.textSecondary,
  },
  name: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  state: {
    minHeight: 88,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.xs,
  },
  stateText: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.sm,
    textAlign: "center" as const,
  },
}));
