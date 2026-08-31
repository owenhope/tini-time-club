import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { useLocationClaim } from "@/hooks/useLocationClaim";
import { makeStyles, useTheme } from "@/theme";
import { routes } from "@/utils/routes";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
        new Date(value)
      )
    : null;

export default function LocationClaimScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{
    locationId?: string;
    name?: string;
    address?: string;
  }>();
  const locationId = firstParam(params.locationId) ?? "";
  const locationName = firstParam(params.name) ?? "this place";
  const locationAddress = firstParam(params.address);
  const { status, accountEmail, loading, submitting, submit } =
    useLocationClaim(locationId, Boolean(profile && locationId));
  const [role, setRole] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [explanation, setExplanation] = useState("");

  const cooldown = status?.status === "rejected" && !status.can_resubmit;

  const backToPlace = () => {
    if (!locationId) {
      router.back();
      return;
    }
    router.dismissTo(
      routes.place(locationId, {
        name: locationName,
        address: locationAddress ?? "",
      })
    );
  };

  const submitForm = async () => {
    if (!role.trim() || !businessEmail.trim() || !explanation.trim()) {
      Alert.alert(
        "Complete your claim",
        "Role, business email, and a short explanation are required."
      );
      return;
    }
    try {
      await submit({
        businessRole: role,
        businessEmail,
        phone: phone.trim() || undefined,
        explanation,
      });
      Alert.alert(
        "Claim received",
        "Your claim is under review by Tini Time Club."
      );
    } catch {
      Alert.alert(
        "Couldn’t submit claim",
        "Please check your connection and try again."
      );
    }
  };

  if (!profile) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.placeContext}>
            <Text style={styles.eyebrow}>BUSINESS VERIFICATION</Text>
            <Text style={styles.placeName} selectable>
              {locationName}
            </Text>
            {locationAddress ? (
              <Text style={styles.placeAddress} selectable>
                {locationAddress}
              </Text>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : status?.status === "pending" ? (
            <StatusCard
              title="Claim under review"
              body="We’ll let you know when Tini Time Club has reviewed your claim."
              styles={styles}
            />
          ) : status?.status === "superseded" ? (
            <StatusCard
              title="This place was already verified"
              body="Your claim did not grant management access."
              styles={styles}
            />
          ) : status?.status === "rejected" && cooldown ? (
            <StatusCard
              title="Claim not approved"
              body={
                status.rejection_reason ??
                `You may submit again on ${formatDate(status.resubmission_at)}.`
              }
              styles={styles}
              detail={
                status.rejection_reason
                  ? `You may submit again on ${formatDate(status.resubmission_at)}.`
                  : undefined
              }
            />
          ) : (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle} selectable>
                Tell us about your connection
              </Text>
              <Text style={styles.formIntro} selectable>
                Your member name and account email are included for review.
              </Text>
              <Field
                label="Your name"
                value={profile.name?.trim() || profile.username}
                editable={false}
                styles={styles}
              />
              {accountEmail ? (
                <Field
                  label="Account email"
                  value={accountEmail}
                  editable={false}
                  styles={styles}
                />
              ) : null}
              <Field
                label="Your role at the business"
                value={role}
                onChangeText={setRole}
                placeholder="e.g. Owner, manager, or staff"
                maxLength={80}
                placeholderTextColor={colors.textMuted}
                styles={styles}
              />
              <Field
                label="Business contact email"
                value={businessEmail}
                onChangeText={setBusinessEmail}
                placeholder="A business email we can verify"
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={320}
                placeholderTextColor={colors.textMuted}
                styles={styles}
              />
              <Field
                label="Phone number (optional)"
                value={phone}
                onChangeText={setPhone}
                placeholder="A number we can reach the business at"
                keyboardType="phone-pad"
                maxLength={40}
                placeholderTextColor={colors.textMuted}
                styles={styles}
              />
              <Field
                label="How are you connected to this business?"
                value={explanation}
                onChangeText={setExplanation}
                placeholder="A sentence or two to help us verify your claim"
                multiline
                maxLength={1000}
                placeholderTextColor={colors.textMuted}
                styles={styles}
              />
              <Pressable
                onPress={() => void submitForm()}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.submit,
                  pressed && styles.pressed,
                  submitting && styles.disabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Submit business verification claim"
              >
                <Text style={styles.submitText}>
                  {submitting ? "Submitting…" : "Submit claim"}
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={backToPlace}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.cancelText}>Back to place</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  styles,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  styles: ReturnType<typeof useStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel} selectable>
        {label}
      </Text>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.multiline]}
        textAlignVertical={props.multiline ? "top" : "center"}
      />
    </View>
  );
}

function StatusCard({
  title,
  body,
  detail,
  styles,
}: {
  title: string;
  body: string;
  detail?: string;
  styles: ReturnType<typeof useStyles>;
}) {
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle} selectable>
        {title}
      </Text>
      <Text style={styles.statusBody} selectable>
        {body}
      </Text>
      {detail ? (
        <Text style={styles.statusDetail} selectable>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  scrollContent: { padding: t.spacing.gutter, paddingBottom: t.spacing.xxl },
  content: { gap: t.spacing.lg },
  placeContext: { gap: t.spacing.xs },
  eyebrow: { ...t.typography.eyebrow, color: t.colors.accent },
  placeName: { ...t.typography.heading, color: t.colors.text },
  placeAddress: { ...t.typography.caption, color: t.colors.textSecondary },
  sectionTitle: { ...t.typography.heading, color: t.colors.text },
  loading: { alignItems: "center" as const, padding: t.spacing.lg },
  formSection: { gap: t.spacing.md },
  formIntro: { ...t.typography.caption, color: t.colors.textSecondary },
  field: { gap: t.spacing.xs },
  fieldLabel: { ...t.typography.bodyStrong, color: t.colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    color: t.colors.inputText,
    backgroundColor: t.colors.surface,
  },
  multiline: { minHeight: 112, textAlignVertical: "top" as const },
  submit: {
    alignItems: "center" as const,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.accent,
    padding: t.spacing.md,
  },
  submitText: { ...t.typography.bodyStrong, color: t.colors.textOnAccent },
  disabled: { opacity: 0.6 },
  statusCard: {
    gap: t.spacing.xs,
    padding: t.spacing.lg,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  statusTitle: { ...t.typography.title, color: t.colors.text },
  statusBody: { ...t.typography.body, color: t.colors.textSecondary },
  statusDetail: { ...t.typography.caption, color: t.colors.textSecondary },
  cancel: { alignItems: "center" as const, padding: t.spacing.sm },
  cancelText: { ...t.typography.bodyStrong, color: t.colors.accent },
  pressed: { opacity: 0.7 },
}));
