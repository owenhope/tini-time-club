import React, { useState, useEffect, useCallback } from "react";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { supabase } from "@/utils/supabase";
import ProfileList from "@/components/ProfileList";
import { makeStyles } from "@/theme";
import { reportError } from "@/utils/log";

interface LikesSliderProps {
  reviewId: string;
  onClose: () => void;
}

export default function LikesSlider({ reviewId, onClose }: LikesSliderProps) {
  const styles = useStyles();
  const [likesUsers, setLikesUsers] = useState<any[]>([]);

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
        return;
      }
      if (!cancelled) {
        setLikesUsers(
          (data ?? []).map((row: any) => row.profiles).filter(Boolean)
        );
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
      snapPoints={["50%"]}
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
      <BottomSheetView style={styles.content}>
        <ProfileList profiles={likesUsers} enableSearch={false} />
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
    paddingHorizontal: t.spacing.gutter,
    paddingBottom: t.spacing.lg,
  },
}));
