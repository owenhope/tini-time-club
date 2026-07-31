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
      const { data: likesData, error: likesError } = await supabase
        .from("likes")
        .select("user_id")
        .eq("review_id", reviewId);
      if (likesError) {
        reportError("Error fetching likes users:", likesError);
        return;
      }
      if (!likesData || likesData.length === 0) {
        if (!cancelled) setLikesUsers([]);
        return;
      }
      const userIds = likesData.map((row: any) => row.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, is_verified")
        .in("id", userIds);
      if (profilesError) {
        reportError("Error fetching profiles for likes:", profilesError);
        return;
      }
      if (!cancelled) setLikesUsers(profilesData || []);
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
    borderTopLeftRadius: t.radius.lg,
    borderTopRightRadius: t.radius.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: t.colors.borderStrong,
  },
  content: {
    flex: 1,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.lg,
  },
}));
