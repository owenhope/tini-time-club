import React, { useState, useEffect, useCallback } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { supabase } from "@/utils/supabase";
import ProfileList from "@/components/ProfileList";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";

const LIKES_SHEET_VISIBLE_HEIGHT = 420;
const CONTENT_BOTTOM_PADDING = 16;

interface LikesSliderProps {
  reviewId: string;
  onClose: () => void;
}

export default function LikesSlider({ reviewId, onClose }: LikesSliderProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bottomContentInset = useNativeTabBarContentInset();
  const snapPoints = React.useMemo(
    () => [LIKES_SHEET_VISIBLE_HEIGHT + bottomContentInset],
    [bottomContentInset]
  );
  const [likesUsers, setLikesUsers] = useState<any[]>([]);
  // An in-flight fetch and an unliked review both left the list empty, which
  // read as "nobody" for as long as the query took.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchLikesUsers = async () => {
      // One embedded query instead of the old likes -> profiles waterfall;
      // capped so a viral review can't pull an unbounded list.
      const { data, error } = await supabase
        .from("likes")
        .select("profiles(id, username, avatar_url, is_verified, review_count)")
        .eq("review_id", reviewId)
        .limit(200);
      if (error) {
        reportError("Error fetching likes users:", error);
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) {
        setLikesUsers(
          (data ?? []).map((row: any) => row.profiles).filter(Boolean)
        );
        setLoading(false);
      }
    };

    fetchLikesUsers();
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheet
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      onClose={onClose}
      // ProfileList brings its own FlatList; let it scroll and leave sheet
      // dragging to the handle and backdrop.
      enableContentPanningGesture={false}
      backdropComponent={renderBackdrop}
      style={styles.sheetShadow}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
    >
      <BottomSheetView
        style={[
          styles.content,
          { paddingBottom: CONTENT_BOTTOM_PADDING + bottomContentInset },
        ]}
      >
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
          <ProfileList profiles={likesUsers} enableSearch={false} embedded />
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  sheetShadow: {
    ...t.elevation.raised,
    shadowOffset: { width: 0, height: -2 },
  },
  sheetBackground: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: t.colors.borderStrong,
  },
  content: {
    flex: 1,
    paddingHorizontal: t.spacing.sheetGutter,
    paddingBottom: CONTENT_BOTTOM_PADDING,
  },
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
