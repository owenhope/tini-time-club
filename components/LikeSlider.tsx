import React, { useState, useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import NativeSheet from "@/components/shared/NativeSheet";
import { getReviewLikers } from "@/services/memberListService";
import type { MemberSummary } from "@/utils/memberSummary";
import ProfileList from "@/components/ProfileList";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";

interface LikesSliderProps {
  reviewId: string;
  onClose: () => void;
  /** Lets an enclosing native modal dismiss before opening another screen. */
  onNavigate?: (navigate: () => void) => void;
}

export default function LikesSlider({
  reviewId,
  onClose,
  onNavigate,
}: LikesSliderProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [likesUsers, setLikesUsers] = useState<MemberSummary[]>([]);
  // An in-flight fetch and an unliked review both left the list empty, which
  // read as "nobody" for as long as the query took.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchLikesUsers = async () => {
      try {
        const members = await getReviewLikers(reviewId);
        if (!cancelled) setLikesUsers(members);
      } catch (error) {
        reportError("Error fetching likes users:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLikesUsers();
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  return (
    // ProfileList brings its own FlatList, so the sheet fills and scrolls.
    <NativeSheet onClose={onClose} scrollable testID="likes-sheet">
      <View style={styles.content}>
        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : likesUsers.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.emptyTitle}>No takers yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to raise a glass to this one.
            </Text>
          </View>
        ) : (
          <ProfileList
            profiles={likesUsers}
            enableSearch={false}
            embedded
            onNavigate={onNavigate}
          />
        )}
      </View>
    </NativeSheet>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flex: 1 },
  state: {
    alignItems: "center" as const,
    paddingTop: t.spacing.xxl,
    gap: t.spacing.sm,
  },
  emptyTitle: {
    ...t.typography.title,
    color: t.colors.text,
  },
  emptySubtitle: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    textAlign: "center" as const,
    paddingHorizontal: t.spacing.xxl,
  },
}));
