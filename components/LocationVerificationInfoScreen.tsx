import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMembership } from "@/context/membership-context";
import { makeStyles, useTheme } from "@/theme";
import { routes } from "@/utils/routes";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function LocationVerificationInfoScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
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
        <Text style={styles.placeName} selectable>
          {name}
        </Text>
        {address ? (
          <Text style={styles.placeAddress} selectable>
            {address}
          </Text>
        ) : null}
      </View>

      <View style={styles.explainer}>
        <View style={styles.icon}>
          <MaterialIcons
            name="verified"
            size={20}
            color={colors.accent}
            accessibilityElementsHidden
          />
        </View>
        <Text style={styles.title} selectable>
          What does verifying this place mean?
        </Text>
        <Text style={styles.body} selectable>
          Tini Time Club reviews your connection to this business. If approved,
          members will see a Verified Business mark. Verification is not a
          rating, endorsement, or access to manage the place.
        </Text>
      </View>

      <Pressable
        onPress={continueToClaim}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Claim ${name}`}
      >
        <Text style={styles.buttonText}>Continue to claim</Text>
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
  placeName: { ...t.typography.heading, color: t.colors.text },
  placeAddress: { ...t.typography.caption, color: t.colors.textSecondary },
  explainer: {
    gap: t.spacing.sm,
    padding: t.spacing.lg,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.accentSubtle,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  icon: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 36,
    height: 36,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
  },
  title: { ...t.typography.heading, color: t.colors.text },
  body: { ...t.typography.body, color: t.colors.textSecondary },
  button: {
    alignItems: "center" as const,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.accent,
    padding: t.spacing.md,
  },
  buttonText: { ...t.typography.bodyStrong, color: t.colors.textOnAccent },
  pressed: { opacity: 0.7 },
}));
