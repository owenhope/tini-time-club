import React, { useCallback, useState } from "react";
import { Animated, FlatList, View } from "react-native";
import { useFocusEffect } from "expo-router";
import AppHeader from "@/components/nav/AppHeader";
import GuideNoteCard from "@/components/martini-index/guide-note-card";
import MartiniIndexCard from "@/components/martini-index/martini-index-card";
import PickOneModal from "@/components/martini-index/pick-one-modal";
import { Chip } from "@/components/shared";
import { useCollapsibleHeader } from "@/hooks/useCollapsibleHeader";
import { makeStyles } from "@/theme";
import { logMartiniIndexEvent } from "@/utils/martini-index-analytics";
import {
  getMartiniIndexRows,
  MARTINI_SPIRITS,
  type MartiniSpirit,
} from "@/utils/martini-index";
import { useMembership } from "@/context/membership-context";

const SPIRIT_FILTERS = ["All", ...MARTINI_SPIRITS] as const;

export default function MartiniIndexScreen() {
  const styles = useStyles();
  const { isMember, requireMembership } = useMembership();
  const [spirit, setSpirit] = useState<MartiniSpirit | "All">("All");
  const [pickOneVisible, setPickOneVisible] = useState(false);
  const indexEntries = getMartiniIndexRows(spirit);
  const {
    isCollapsed,
    progress,
    onScroll: handleScroll,
    collapsibleStyle,
  } = useCollapsibleHeader();

  useFocusEffect(
    useCallback(() => {
      if (isMember) void logMartiniIndexEvent("view");
    }, [isMember])
  );

  const selectSpirit = (nextSpirit: MartiniSpirit | "All") => {
    if (nextSpirit === spirit) return;
    setSpirit(nextSpirit);
    if (isMember) void logMartiniIndexEvent("filter", nextSpirit);
  };

  const shakerAction = {
    customIcon: "martini-shaker" as const,
    onPress: () => {
      if (requireMembership("pick-one")) setPickOneVisible(true);
    },
    accessibilityLabel: "Pick a martini for me",
  };

  const renderFilters = (compact = false) => (
    <View style={styles.headerFilters}>
      {SPIRIT_FILTERS.map((item) => (
        <Chip
          key={item}
          label={item}
          selected={spirit === item}
          onInk
          style={compact ? styles.compactFilterChip : undefined}
          onPress={() => selectSpirit(item)}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="compact"
        title=""
        compactContent={renderFilters(true)}
        trailing={shakerAction}
        ground="ink"
        progress={progress}
        collapsed={isCollapsed}
        overlay
        statusBar="light"
      />
      <FlatList
        data={indexEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            {item.kind === "drink" ? (
              <MartiniIndexCard item={item.item} />
            ) : (
              <GuideNoteCard item={item.item} />
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            <AppHeader
              variant="large"
              title="The Martini Index"
              meta="Know your order. Or let fate hold the shaker."
              trailing={shakerAction}
              below={
                <Animated.View style={collapsibleStyle}>
                  {renderFilters()}
                </Animated.View>
              }
              progress={progress}
              collapsed={isCollapsed}
              statusBar="none"
            />
            <View style={styles.listTopSpacer} />
          </>
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <PickOneModal
        visible={pickOneVisible}
        onClose={() => setPickOneVisible(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  list: {
    paddingBottom: t.spacing.giant,
  },
  listItem: {
    paddingHorizontal: t.spacing.gutter,
  },
  listTopSpacer: {
    height: t.spacing.md,
  },
  headerFilters: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  compactFilterChip: {
    minHeight: 36,
    paddingHorizontal: t.spacing.sm + 2,
  },
  separator: {
    height: t.spacing.lg,
  },
}));
