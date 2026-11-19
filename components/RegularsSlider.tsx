import React from "react";
import { Pressable, Text, View } from "react-native";
import { MemberAvatar, VerifiedName } from "@/components/shared";
import NativeSheet from "@/components/shared/NativeSheet";
import type { Regular } from "@/services/regularsService";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { makeStyles } from "@/theme";

interface RegularsSliderProps {
  regulars: Regular[];
  locationName?: string | null;
  onClose: () => void;
}

export default function RegularsSlider({
  regulars,
  locationName,
  onClose,
}: RegularsSliderProps) {
  const openProfile = useOpenProfile();

  const openRegular = (regular: Regular) => {
    onClose();
    openProfile(regular.username, regular.profile_id);
  };

  return (
    <NativeSheet onClose={onClose} testID="regulars-sheet">
      <RegularsSheetContent
        regulars={regulars.slice(0, 3)}
        locationName={locationName}
        onOpenRegular={openRegular}
      />
    </NativeSheet>
  );
}

/** Shared with the onboarding illustration so it matches the venue sheet. */
export function RegularsSheetContent({
  regulars,
  locationName,
  onOpenRegular,
}: {
  regulars: Regular[];
  locationName?: string | null;
  onOpenRegular?: (regular: Regular) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.sheetContent}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Regulars</Text>
        {locationName ? (
          <Text style={styles.title} numberOfLines={2}>
            {locationName}
          </Text>
        ) : null}
      </View>

      <View style={styles.list}>
        {regulars.slice(0, 3).map((regular) => (
          <Pressable
            key={regular.profile_id}
            onPress={onOpenRegular ? () => onOpenRegular(regular) : undefined}
            disabled={!onOpenRegular}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole={onOpenRegular ? "link" : "text"}
            accessibilityLabel={
              onOpenRegular
                ? `View ${regular.username}'s profile`
                : `${regular.username}, ${regular.review_count} reviews`
            }
          >
            <MemberAvatar member={regular} size={42} />
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
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  sheetContent: { gap: t.spacing.lg },
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
    borderRadius: t.radius.thumb,
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
