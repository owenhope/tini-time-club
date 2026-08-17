import React, { useState, useMemo, memo } from "react";
import { View, Image, Text } from "react-native";
import imageCache from "@/utils/imageCache";
import { makeStyles, useTheme } from "@/theme";
import AvatarRing from "./AvatarRing";
import OliveIcon from "./OliveIcon";

interface AvatarProps {
  avatarPath?: string | null;
  username?: string;
  fallbackText?: string;
  size?: number;
  style?: any;
  showInitials?: boolean;
  showRing?: boolean;
  /**
   * Active review count for the ranking ring. Every avatar is ringed — the
   * first tier starts at zero — so a missing count just means the base tier.
   */
  reviewCount?: number | null;
  /**
   * Sits on a green ground. The initials disc is normally the brand green,
   * which on a green surface leaves the ring wrapped around nothing; on ink it
   * takes the sage fill with near-black-green initials instead.
   */
  onInk?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  avatarPath,
  username,
  fallbackText,
  size = 40,
  style,
  showInitials = true,
  showRing = true,
  reviewCount,
  onInk = false,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  // Public-bucket URLs are built locally, so the URL exists on first render —
  // no loading frame. `failed` only flips if the image itself 404s.
  const avatarUrl = useMemo(
    () => imageCache.getAvatarUrlSync(avatarPath ?? null),
    [avatarPath]
  );
  const [failed, setFailed] = useState(false);

  const avatarStyle = useMemo(
    () => [
      styles.avatar,
      style,
      { width: size, height: size, borderRadius: size / 2 },
    ],
    [styles, size, style]
  );

  const placeholderStyle = useMemo(
    () => [
      styles.placeholder,
      onInk && styles.placeholderOnInk,
      style,
      { width: size, height: size, borderRadius: size / 2 },
    ],
    [styles, size, style, onInk]
  );

  let face: React.ReactElement;
  if (avatarUrl && !failed) {
    face = (
      <Image
        source={{ uri: avatarUrl }}
        style={avatarStyle}
        onError={() => setFailed(true)}
      />
    );
  } else if (showInitials && (username || fallbackText)) {
    face = (
      <View style={placeholderStyle}>
        <Text
          style={[
            styles.initials,
            onInk && styles.initialsOnInk,
            { fontSize: size * 0.4, lineHeight: size * 0.48 },
          ]}
        >
          {username?.charAt(0).toUpperCase() || fallbackText}
        </Text>
      </View>
    );
  } else {
    face = (
      <View
        style={[
          styles.oliveFallback,
          style,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <OliveIcon
          size={size * 0.78}
          color={colors.onAccentTonal}
          pimentoColor={colors.onAccentTonal}
        />
      </View>
    );
  }

  return showRing ? (
    <AvatarRing reviewCount={reviewCount} size={size}>
      {face}
    </AvatarRing>
  ) : (
    face
  );
};

const useStyles = makeStyles((t) => ({
  avatar: {
    resizeMode: "cover" as const,
  },
  oliveFallback: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentTonal,
  },
  placeholder: {
    backgroundColor: t.colors.accentTonal,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  placeholderOnInk: {
    backgroundColor: t.colors.accentTonal,
  },
  initials: {
    ...t.typography.bodyStrong,
    color: t.colors.onAccentTonal,
  },
  initialsOnInk: {
    color: t.colors.onAccentTonal,
  },
}));

export default memo(Avatar);
