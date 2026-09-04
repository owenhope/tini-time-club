import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";
import { useSelectionRowStyles } from "@/components/shared/selection-row-styles";
import type { ExploreRegionState } from "@/hooks/useExploreRegion";
import type { ExploreRegion } from "@/services/regionService";

interface Props {
  state: ExploreRegionState;
  onSelectRegion: (region: ExploreRegion) => Promise<void>;
  onUseMyLocation: () => Promise<void>;
}

export default function ExploreRegionSelector({
  state,
  onSelectRegion,
  onUseMyLocation,
}: Props) {
  const styles = useStyles();
  const selectionStyles = useSelectionRowStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const regions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? state.regions.filter((region) =>
          region.name.toLowerCase().includes(normalized)
        )
      : state.regions;
  }, [query, state.regions]);

  const title = state.selectedRegion?.name ?? "Choose a region";
  const select = async (region: ExploreRegion) => {
    await onSelectRegion(region);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <Pressable
        style={styles.control}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Explore region: ${title}`}
        accessibilityHint="Searches enabled regions"
      >
        <Ionicons name="location-outline" size={16} color={colors.onInk} />
        <Text style={styles.controlText} numberOfLines={1}>
          {title}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.onInk} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.eyebrow}>EXPLORE REGION</Text>
                <Text style={styles.title}>Where are you raising a glass?</Text>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close region selector"
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Pressable
              style={styles.locationButton}
              onPress={onUseMyLocation}
              accessibilityRole="button"
              accessibilityLabel="Use my current location"
            >
              {state.status === "loading" ? (
                <ActivityIndicator color={colors.onAccentTonal} />
              ) : (
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color={colors.onAccentTonal}
                />
              )}
              <Text style={styles.locationText}>Use My Location</Text>
            </Pressable>

            {state.status === "unsupported" ? (
              <Text style={styles.notice}>
                Your location is outside the enabled region catchments. Search
                for an enabled region below.
              </Text>
            ) : null}
            {state.status === "needs-selection" ? (
              <Text style={styles.notice}>
                Choose an enabled region to see its map, glass list, and
                members.
              </Text>
            ) : null}

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search regions"
              placeholderTextColor={styles.input.color}
              autoCapitalize="words"
              style={styles.input}
              accessibilityLabel="Search enabled regions"
            />
            <FlatList
              data={regions}
              contentContainerStyle={styles.regionList}
              keyExtractor={(region) => String(region.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    selectionStyles.row,
                    styles.regionRow,
                    item.id === state.selectedRegion?.id &&
                      selectionStyles.selected,
                    pressed && selectionStyles.pressed,
                  ]}
                  onPress={() => void select(item)}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: item.id === state.selectedRegion?.id,
                  }}
                >
                  <Text
                    style={[
                      selectionStyles.title,
                      item.id === state.selectedRegion?.id &&
                        selectionStyles.selectedText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.id === state.selectedRegion?.id ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.onAccent}
                    />
                  ) : null}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.notice}>
                  No enabled regions match that search.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  control: {
    minHeight: 44,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    backgroundColor: "rgba(250,249,246,0.14)",
    gap: t.spacing.xs,
  },
  controlText: { ...t.typography.label, color: t.colors.onInk, flexShrink: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end" as const,
    backgroundColor: t.colors.overlay,
  },
  sheet: {
    maxHeight: "85%" as const,
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    padding: t.spacing.sheetGutter,
    gap: t.spacing.md,
  },
  sheetHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
  },
  eyebrow: { ...t.typography.eyebrow, color: t.colors.textMuted },
  title: {
    ...t.typography.heading,
    color: t.colors.text,
    marginTop: t.spacing.xs,
  },
  close: { color: t.colors.textSecondary },
  locationButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.accentTonal,
  },
  locationText: { ...t.typography.bodyStrong, color: t.colors.onAccentTonal },
  notice: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  input: {
    ...t.typography.body,
    color: t.colors.inputText,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    backgroundColor: t.colors.surfaceSunken,
  },
  regionList: {
    gap: t.spacing.sm,
    paddingBottom: t.spacing.xs,
  },
  regionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
  },
}));
