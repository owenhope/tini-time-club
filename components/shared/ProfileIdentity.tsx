import React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Avatar from "./Avatar";
import AppText from "./AppText";
import { makeStyles, useTheme } from "@/theme";

export interface ProfileIdentityProps {
  /** Person: renders an Avatar. Place: renders the venue photo. */
  kind: "person" | "place";
  title: string;
  subtitle?: string | null;
  /** Tapping the subtitle, e.g. opening an address in Maps. */
  onSubtitlePress?: () => void;
  subtitleAccessibilityHint?: string;

  avatarPath?: string | null;
  username?: string;
  imageUrl?: string | null;

  onImagePress?: () => void;
  imageLoading?: boolean;
  imageError?: string | null;

  /** Shown in place of the title when it's missing and the viewer can set it. */
  titlePlaceholder?: string;
  onTitlePlaceholderPress?: () => void;
}

const AVATAR_SIZE = 72;

/**
 * The identity block at the top of every profile: image, name, subtitle.
 *
 * People and places previously had entirely separate header implementations
 * (ProfileHeader's avatar section vs Location's name/address block), which is
 * why their spacing and type never matched. One component, two kinds.
 */
const ProfileIdentity: React.FC<ProfileIdentityProps> = ({
  kind,
  title,
  subtitle,
  onSubtitlePress,
  subtitleAccessibilityHint,
  avatarPath,
  username,
  imageUrl,
  onImagePress,
  imageLoading = false,
  imageError,
  titlePlaceholder,
  onTitlePlaceholderPress,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  // Places only render media when they actually have an image — an empty
  // placeholder square just took up space on every venue.
  const media =
    kind === "person" ? (
      <Avatar
        avatarPath={avatarPath}
        username={username}
        size={AVATAR_SIZE}
        style={styles.avatar}
      />
    ) : imageUrl ? (
      <ExpoImage
        source={{ uri: imageUrl }}
        style={styles.placeImage}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />
    ) : null;

  return (
    <View style={styles.container}>
      {media !== null && (
        <View>
          {onImagePress ? (
            <Pressable
              onPress={onImagePress}
              accessibilityRole="button"
              accessibilityLabel={
                kind === "person" ? "Change profile photo" : "View photo"
              }
              accessibilityState={{ busy: imageLoading }}
            >
              {media}
            </Pressable>
          ) : (
            media
          )}
          {imageLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={colors.onAccent} />
            </View>
          )}
        </View>
      )}

      <View style={styles.text}>
        {title ? (
          <AppText variant="title" numberOfLines={2}>
            {title}
          </AppText>
        ) : titlePlaceholder ? (
          <Pressable
            onPress={onTitlePlaceholderPress}
            accessibilityRole="button"
            accessibilityLabel={titlePlaceholder}
            style={styles.placeholderHit}
          >
            <AppText variant="bodyStrong" tone="accent">
              {titlePlaceholder}
            </AppText>
          </Pressable>
        ) : null}

        {subtitle ? (
          onSubtitlePress ? (
            <Pressable
              onPress={onSubtitlePress}
              accessibilityRole="link"
              accessibilityLabel={subtitle}
              accessibilityHint={subtitleAccessibilityHint}
              style={styles.placeholderHit}
            >
              <AppText
                variant="body"
                tone="accent"
                numberOfLines={2}
              >
                {subtitle}
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="body" tone="secondary" numberOfLines={2}>
              {subtitle}
            </AppText>
          )
        ) : null}

        {imageError ? (
          <AppText variant="caption" tone="danger">
            {imageError}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.lg,
    paddingHorizontal: t.spacing.lg,
  },
  avatar: {
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  placeImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.imagePlaceholder,
  },
  loadingOverlay: {
    ...({ position: "absolute" } as const),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.scrim,
    borderRadius: t.radius.lg,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  placeholderHit: {
    minHeight: 44,
    justifyContent: "center" as const,
  },
}));

export default ProfileIdentity;
