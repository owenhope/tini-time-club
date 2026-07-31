import React, { useState, useMemo, memo } from "react";
import { View, Image, Text } from "react-native";
import imageCache from "@/utils/imageCache";
import { makeStyles } from "@/theme";

interface AvatarProps {
  avatarPath?: string | null;
  username?: string;
  size?: number;
  style?: any;
  showInitials?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  avatarPath,
  username,
  size = 40,
  style,
  showInitials = true,
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
      { width: size, height: size, borderRadius: size / 2 },
      style,
    ],
    [styles, size, style]
  );

  const placeholderStyle = useMemo(
    () => [
      styles.placeholder,
      { width: size, height: size, borderRadius: size / 2 },
      style,
    ],
    [styles, size, style]
  );

  if (avatarUrl && !failed) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={avatarStyle}
        defaultSource={require("@/assets/images/olive_transparent.png")}
        onError={() => setFailed(true)}
      />
    );
  }

  // Initials or default avatar
  if (showInitials && username) {
    return (
      <View style={placeholderStyle}>
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
          {username.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={require("@/assets/images/olive_transparent.png")}
      style={avatarStyle}
    />
  );
};

const useStyles = makeStyles((t) => ({
  avatar: {
    resizeMode: "cover" as const,
  },
  placeholder: {
    backgroundColor: t.colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  initials: {
    fontWeight: "600" as const,
    color: t.colors.onAccent,
  },
}));

export default memo(Avatar);
