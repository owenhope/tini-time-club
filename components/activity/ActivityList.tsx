import React from "react";
import { RefreshControl, SectionList, Text, View } from "react-native";
import type {
  ActivityDisplayRow,
  ActivitySection,
  FollowActivityRow,
} from "@/types/activity";
import ActivityRow from "./ActivityRow";
import { makeStyles, useTheme } from "@/theme";

interface ActivityListProps {
  sections: ActivitySection[];
  refreshing: boolean;
  loadingMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onPress: (row: ActivityDisplayRow) => void;
  onFollowBack: (row: FollowActivityRow) => Promise<void>;
  mutationsDisabled?: boolean;
}

export default function ActivityList({
  sections,
  refreshing,
  loadingMore,
  onRefresh,
  onLoadMore,
  onPress,
  onFollowBack,
  mutationsDisabled = false,
}: ActivityListProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <SectionList
      sections={sections}
      contentInsetAdjustmentBehavior="automatic"
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ActivityRow
          row={item}
          onPress={() => onPress(item)}
          onFollowBack={() =>
            item.kind === "user_followed"
              ? onFollowBack(item)
              : Promise.resolve()
          }
          mutationsDisabled={mutationsDisabled}
        />
      )}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      stickySectionHeadersEnabled={false}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.35}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      contentContainerStyle={styles.content}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Loading earlier activity…</Text>
          </View>
        ) : null
      }
    />
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingBottom: t.spacing.xxl,
  },
  sectionHeader: {
    ...t.typography.eyebrow,
    color: t.colors.textMuted,
    paddingHorizontal: t.spacing.gutter,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.sm,
    backgroundColor: t.colors.background,
  },
  footer: {
    minHeight: 48,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  footerText: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
}));
