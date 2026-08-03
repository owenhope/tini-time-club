import React, { useState, useMemo, memo } from "react";
import { View, Image, Text } from "react-native";
import imageCache from "@/utils/imageCache";
import { fonts, makeStyles } from "@/theme";
import AvatarRing from "./AvatarRing";

interface AvatarProps {
  avatarPath?: string | null;
  username?: string;
  size?: number;
  style?: any;
  showInitials?: boolean;
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
  size = 40,
  style,
  showInitials = true,
  reviewCount,
  onInk = false,
}) => {
  const styles = useStyles();
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
        defaultSource={require("@/assets/images/olive_transparent.png")}
        onError={() => setFailed(true)}
      />
    );
  } else if (showInitials && username) {
    face = (
      <View style={placeholderStyle}>
        <Text
          style={[
            styles.initials,
            onInk && styles.initialsOnInk,
            { fontSize: size * 0.4 },
          ]}
        >
          {username.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  } else {
    face = (
      <Image
        source={require("@/assets/images/olive_transparent.png")}
        style={avatarStyle}
      />
    );
  }

  return (
    <AvatarRing reviewCount={reviewCount} size={size}>
      {face}
    </AvatarRing>
  );
};

const useStyles = makeStyles((t) => ({
  avatar: {
    resizeMode: "cover" as const,
  },
  // The initials disc is the club's green, not the primary purple.
  placeholder: {
    backgroundColor: t.colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  placeholderOnInk: {
    backgroundColor: t.colors.accentOnImage,
  },
  initials: {
    fontFamily: fonts.semibold,
    color: t.colors.onAccent,
  },
  initialsOnInk: {
    color: t.colors.surfaceInkDeep,
  },
}));

export default memo(Avatar);
