import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import {
  ShareMenuContext,
  type ShareMenuConfig,
  type ShareMenuItem,
} from "@/components/share/shareMenuContext";
import { makeStyles, useTheme } from "@/theme";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";

const SHARE_SHEET_VISIBLE_HEIGHT = 295;
const CONTENT_BOTTOM_PADDING = 16;
const INSTAGRAM_DESTINATIONS = new Set(["instagram_story", "instagram_post"]);
const OTHER_DESTINATIONS = new Set(["whatsapp", "message", "copy_link"]);

export const ShareMenuProvider = ({ children }: { children: ReactNode }) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const bottomContentInset = useNativeTabBarContentInset();
  const [config, setConfig] = useState<ShareMenuConfig | null>(null);
  const snapPoints = useMemo(
    () => [SHARE_SHEET_VISIBLE_HEIGHT + bottomContentInset],
    [bottomContentInset]
  );

  const showShareMenu = useCallback((nextConfig: ShareMenuConfig) => {
    setConfig(nextConfig);
  }, []);

  const close = useCallback(() => {
    setConfig(null);
  }, []);

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
  const instagramActions =
    config?.actions.filter((action) =>
      INSTAGRAM_DESTINATIONS.has(action.destination)
    ) ?? [];
  const otherActions =
    config?.actions.filter((action) =>
      OTHER_DESTINATIONS.has(action.destination)
    ) ?? [];

  const selectAction = (action: ShareMenuItem) => {
    close();
    requestAnimationFrame(action.onPress);
  };

  return (
    <ShareMenuContext.Provider value={showShareMenu}>
      {children}
      {config ? (
        <BottomSheet
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose
          onClose={close}
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
            <View style={styles.header}>
              <View style={styles.headerSpacer} />
              <Text style={styles.title}>{config.title}</Text>
              <Pressable
                onPress={close}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close share menu"
              >
                <Ionicons name="close-outline" size={22} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.rows}>
              <View style={styles.twoColumnGrid}>
                {instagramActions.map((action) => (
                  <ShareMenuTile
                    key={action.label}
                    action={action}
                    onSelect={() => selectAction(action)}
                    wide
                  />
                ))}
              </View>
              <View style={styles.threeColumnGrid}>
                {otherActions.map((action) => (
                  <ShareMenuTile
                    key={action.label}
                    action={action}
                    onSelect={() => selectAction(action)}
                  />
                ))}
              </View>
            </View>
          </BottomSheetView>
        </BottomSheet>
      ) : null}
    </ShareMenuContext.Provider>
  );
};

const ShareMenuTile = memo(
  ({
    action,
    onSelect,
    wide = false,
  }: {
    action: ShareMenuItem;
    onSelect: () => void;
    wide?: boolean;
  }) => {
    const styles = useStyles();
    const { colors } = useTheme();

    return (
      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [
          styles.tile,
          wide ? styles.tileWide : styles.tileThird,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        {action.icon ? (
          <View style={styles.iconPlate}>
            <Ionicons
              name={action.icon as keyof typeof Ionicons.glyphMap}
              size={24}
              color={colors.text}
            />
          </View>
        ) : null}
        <Text style={styles.tileText} numberOfLines={2}>
          {action.label}
        </Text>
      </Pressable>
    );
  }
);

ShareMenuTile.displayName = "ShareMenuTile";

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
    gap: t.spacing.md,
  },
  header: {
    minHeight: 40,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    ...t.typography.heading,
    color: t.colors.text,
    textAlign: "center" as const,
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.disabledSurface,
  },
  rows: {
    gap: t.spacing.sm,
  },
  twoColumnGrid: {
    flexDirection: "row" as const,
    gap: t.spacing.sm,
  },
  threeColumnGrid: {
    flexDirection: "row" as const,
    gap: t.spacing.sm,
  },
  tile: {
    minHeight: 96,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.sm,
    backgroundColor: t.colors.surfaceSunken,
  },
  tileWide: {
    flex: 1,
  },
  tileThird: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  iconPlate: {
    width: 42,
    height: 42,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surface,
  },
  tileText: {
    ...t.typography.label,
    color: t.colors.text,
    textAlign: "center" as const,
  },
}));
