import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import LocationVerifiedBadge from "@/components/LocationVerifiedBadge";
import { useMembership } from "@/context/membership-context";
import { makeStyles } from "@/theme";
import { routes } from "@/utils/routes";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const BENEFITS = [
  {
    title: "Verified badge",
    body: "The Verified Business mark appears beside the place name across the club — on reviews, search, and the place page.",
  },
  {
    title: "Stand-out map pin",
    body: "Verified places get a distinct pin on the Explore map so members can spot them at a glance.",
  },
  {
    title: "Member confidence",
    body: "Members know the business details were confirmed with someone actually connected to the place.",
  },
] as const;

export default function LocationVerificationInfoScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { requireMembership } = useMembership();
  const params = useLocalSearchParams<{
    locationId?: string;
    name?: string;
    address?: string;
  }>();
  const locationId = firstParam(params.locationId) ?? "";
  const name = firstParam(params.name) ?? "this place";
  const address = firstParam(params.address);

  const continueToClaim = () => {
    if (!locationId || !requireMembership("location-claim")) return;
    router.push(
      routes.locationClaim({
        locationId,
        name,
        address,
      })
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.placeContext}>
        <Text style={styles.eyebrow}>BUSINESS VERIFICATION</Text>
        <View style={styles.placeNameRow}>
          <Text style={styles.placeName} selectable>
            {name}
          </Text>
          <LocationVerifiedBadge compact />
        </View>
        {address ? (
          <Text style={styles.placeAddress} selectable>
            {address}
          </Text>
        ) : null}
      </View>

      <View style={styles.benefits}>
        <Text style={styles.sectionLabel} selectable>
          WHAT A VERIFIED BUSINESS GETS
        </Text>
        {BENEFITS.map((benefit) => (
          <View key={benefit.title} style={styles.benefitCard}>
            <Text style={styles.benefitTitle} selectable>
              {benefit.title}
            </Text>
            <Text style={styles.benefitBody} selectable>
              {benefit.body}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={continueToClaim}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Claim ${name}`}
      >
        <Text style={styles.buttonText}>Verify this Location</Text>
      </Pressable>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    padding: t.spacing.gutter,
    paddingBottom: t.spacing.xxl,
    gap: t.spacing.lg,
  },
  placeContext: { gap: t.spacing.xs },
  eyebrow: { ...t.typography.eyebrow, color: t.colors.accent },
  placeNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  placeName: {
    ...t.typography.display,
    color: t.colors.text,
    flexShrink: 1,
  },
  placeAddress: { ...t.typography.caption, color: t.colors.textSecondary },
  benefits: { gap: t.spacing.sm },
  sectionLabel: { ...t.typography.eyebrow, color: t.colors.textMuted },
  benefitCard: {
    gap: t.spacing.xs,
    padding: t.spacing.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.card,
    backgroundColor: t.colors.surface,
  },
  benefitTitle: { ...t.typography.heading, color: t.colors.text },
  benefitBody: { ...t.typography.body, color: t.colors.textSecondary },
  button: {
    marginTop: t.spacing.sm,
    alignItems: "center" as const,
    borderRadius: t.radius.input,
    backgroundColor: t.colors.accent,
    padding: t.spacing.md,
  },
  buttonText: { ...t.typography.bodyStrong, color: t.colors.textOnAccent },
  pressed: { opacity: 0.7 },
}));
