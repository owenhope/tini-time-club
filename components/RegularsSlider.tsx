import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Avatar, VerifiedName } from "@/components/shared";
import type { Regular } from "@/services/regularsService";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { makeStyles } from "@/theme";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";

const REGULARS_SHEET_VISIBLE_HEIGHT = 430;
const CONTENT_BOTTOM_PADDING = 16;

interface RegularsSliderProps {
  regulars: Regular[];
  locationName?: string | null;
  bottomContentInset?: number;
  onClose: () => void;
}

export default function RegularsSlider({
  regulars,
  locationName,
  bottomContentInset,
  onClose,
}: RegularsSliderProps) {
  const styles = useStyles();
  const openProfile = useOpenProfile();
  const topRegulars = regulars.slice(0, 3);
  const nativeTabBarInset = useNativeTabBarContentInset();
  const sheetBottomInset = bottomContentInset ?? nativeTabBarInset;
  const snapPoints = useMemo(
    () => [REGULARS_SHEET_VISIBLE_HEIGHT + sheetBottomInset],
    [sheetBottomInset]
  );

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

  const openRegular = (regular: Regular) => {
    onClose();
    openProfile(regular.username, regular.profile_id);
  };

  return (
    <BottomSheet
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      style={styles.sheetShadow}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
    >
      <BottomSheetView
        style={[
          styles.content,
          { paddingBottom: CONTENT_BOTTOM_PADDING + sheetBottomInset },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Regulars</Text>
          {locationName ? (
            <Text style={styles.title} numberOfLines={2}>
              {locationName}
            </Text>
          ) : null}
        </View>

        <View style={styles.list}>
          {topRegulars.map((regular) => (
            <Pressable
              key={regular.profile_id}
              onPress={() => openRegular(regular)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={`View ${regular.username}'s profile`}
            >
              <Avatar
                avatarPath={regular.avatar_url}
                username={regular.username}
                size={42}
                reviewCount={regular.profile_review_count}
              />
              <View style={styles.identity}>
                <VerifiedName
                  name={regular.username}
                  isVerified={regular.is_verified}
                  textStyle={styles.username}
                />
                <Text style={styles.meta}>
                  {regular.review_count}{" "}
                  {regular.review_count === 1 ? "review" : "reviews"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
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
    gap: t.spacing.lg,
  },
  header: {
    gap: t.spacing.xs,
  },
  eyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.accent,
  },
  title: {
    ...t.typography.title,
    color: t.colors.text,
  },
  list: {
    gap: t.spacing.sm,
  },
  row: {
    minHeight: 64,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  pressed: {
    opacity: 0.65,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  username: {
    ...t.typography.bodyStrong,
    color: t.colors.usernameText,
  },
  meta: {
    ...t.typography.mono,
    color: t.colors.textSecondary,
  },
}));
