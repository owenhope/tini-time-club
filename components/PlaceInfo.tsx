import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import { fetchVenueContact } from "@/services/placesService";
import { MartiniIcon } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const prettyWebsite = (url?: string | null) =>
  url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

const PlaceInfo = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    locationId?: string;
    name?: string;
    address?: string;
    lat?: string;
    lon?: string;
    isGoldenGlass?: string;
  }>();
  const [placeDetails, setPlaceDetails] = useState<{
    phoneNumber?: string;
    website?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const name = firstParam(params.name) ?? "Location";
  const addressParam = firstParam(params.address);
  const address =
    addressParam && addressParam.length > 0
      ? stripNameFromAddress(name, addressParam)
      : null;
  const cityRegion = formatCityRegion(address);
  const lat = firstParam(params.lat);
  const lon = firstParam(params.lon);
  const websiteLabel = prettyWebsite(placeDetails?.website);

  useEffect(() => {
    if (!name) return;

    let active = true;
    fetchVenueContact(name, addressParam)
      .then((details) => {
        if (!active) return;
        setPlaceDetails(
          details
            ? {
                phoneNumber: details.phoneNumber,
                website: details.website,
              }
            : null
        );
      })
      .catch((error) => {
        reportError("Error fetching place information:", error);
        if (active) setPlaceDetails(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [addressParam, name]);

  const mapsUrl = useMemo(() => {
    if (lat && lon) return `https://maps.google.com/?q=${lat},${lon}`;
    if (address)
      return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    return null;
  }, [address, lat, lon]);

  const hasAnyInfo = !!(
    address ||
    placeDetails?.website ||
    placeDetails?.phoneNumber
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          {firstParam(params.isGoldenGlass) === "1" ? (
            <MartiniIcon size={20} color={colors.awardGold} filled />
          ) : null}
        </View>
        {cityRegion ? (
          <Text style={styles.subtitle} selectable>
            {cityRegion}
          </Text>
        ) : null}
      </View>

      <View style={styles.list}>
        {address ? (
          <InfoRow
            icon="map-outline"
            label="Address"
            value={address}
            onPress={mapsUrl ? () => Linking.openURL(mapsUrl) : undefined}
          />
        ) : null}

        {websiteLabel && placeDetails?.website ? (
          <InfoRow
            icon="globe-outline"
            label="Website"
            value={websiteLabel}
            onPress={() => Linking.openURL(placeDetails.website!)}
          />
        ) : null}

        {placeDetails?.phoneNumber ? (
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={placeDetails.phoneNumber}
            onPress={() => Linking.openURL(`tel:${placeDetails.phoneNumber}`)}
          />
        ) : null}

        {loading ? (
          <View style={styles.loadingRow} accessibilityRole="progressbar">
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.loadingText}>Loading contact info...</Text>
          </View>
        ) : null}

        {!loading && !hasAnyInfo ? (
          <Text style={styles.emptyText}>
            No contact information available.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? "link" : "text"}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.icon}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} selectable>
          {value}
        </Text>
      </View>
      {onPress ? (
        <Ionicons name="open-outline" size={18} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.xl,
    gap: t.spacing.xl,
  },
  header: {
    gap: t.spacing.xs,
  },
  nameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  name: {
    ...t.typography.title,
    color: t.colors.text,
  },
  subtitle: {
    ...t.typography.body,
    color: t.colors.textSecondary,
  },
  list: {
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
  },
  row: {
    minHeight: 68,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  pressed: {
    opacity: 0.65,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentSubtle,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  value: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  loadingRow: {
    minHeight: 58,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.sm,
    padding: t.spacing.md,
  },
  loadingText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    padding: t.spacing.lg,
    textAlign: "center" as const,
  },
}));

export default PlaceInfo;
