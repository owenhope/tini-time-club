import React, { useState, useEffect } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import imageCache from "@/utils/imageCache";

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!avatarPath) {
        setLoading(false);
        return;
      }

      try {
        const url = await imageCache.getAvatarUrl(avatarPath);
        setAvatarUrl(url);
        setError(null);
      } catch (error) {
        console.error("Error loading avatar:", error);
        setAvatarUrl(null);
        setError(`Avatar load error: ${error.message || error}`);
      } finally {
        setLoading(false);
      }
    };

    loadAvatar();
  }, [avatarPath]);

  const avatarStyle = [
    styles.avatar,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    style,
  ];

  const placeholderStyle = [
    styles.placeholder,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    style,
  ];

  if (loading) {
    return <View style={placeholderStyle} />;
  }

  if (error) {
    return (
      <View style={[placeholderStyle, { backgroundColor: "#ffebee" }]}>
        <Text
          style={[styles.initials, { fontSize: size * 0.2, color: "#d32f2f" }]}
        >
          ERROR
        </Text>
        <Text
          style={[styles.initials, { fontSize: size * 0.15, color: "#d32f2f" }]}
        >
          {error}
        </Text>
      </View>
    );
  }

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={avatarStyle}
        defaultSource={require("@/assets/images/olive_transparent.png")}
        onError={(error) => {
          const errorMsg = `Image load failed: ${
            error.nativeEvent.error || "Unknown error"
          }`;
          console.error(
            "Image failed to load:",
            error.nativeEvent.error,
            "URL:",
            avatarUrl
          );
          setError(errorMsg);
        }}
        onLoad={() => {
          // Image loaded successfully
        }}
      />
    );
  }

  // Show initials or default avatar
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

const styles = StyleSheet.create({
  avatar: {
    resizeMode: "cover",
  },
  placeholder: {
    backgroundColor: "#B6A3E2", // App primary color
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontWeight: "600",
    color: "#FFFFFF", // White text for better contrast
  },
});

export default Avatar;
