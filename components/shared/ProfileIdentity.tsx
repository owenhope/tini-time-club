import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Avatar from "./Avatar";
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
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        ) : titlePlaceholder ? (
          <Pressable
            onPress={onTitlePlaceholderPress}
            accessibilityRole="button"
            accessibilityLabel={titlePlaceholder}
            style={styles.placeholderHit}
          >
            <Text style={styles.placeholder}>{titlePlaceholder}</Text>
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
              <Text style={styles.subtitleLink} numberOfLines={2}>
                {subtitle}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          )
        ) : null}

        {imageError ? <Text style={styles.errorText}>{imageError}</Text> : null}
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
  title: {
    ...t.typography.title,
    color: t.colors.text,
  },
  placeholder: {
    ...t.typography.bodyStrong,
    color: t.colors.accent,
  },
  placeholderHit: {
    minHeight: 44,
    justifyContent: "center" as const,
  },
  subtitle: {
    ...t.typography.body,
    color: t.colors.textSecondary,
  },
  subtitleLink: {
    ...t.typography.body,
    color: t.colors.accent,
  },
  errorText: {
    ...t.typography.caption,
    color: t.colors.danger,
  },
}));

export default ProfileIdentity;
