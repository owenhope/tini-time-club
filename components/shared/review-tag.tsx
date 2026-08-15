import React, { memo } from "react";
import { Text, View } from "react-native";
import { makeStyles } from "@/theme";
import { getReviewTagColors } from "@/utils/reviewTagColors";

interface ReviewTagProps {
  name: string;
  fallback?: "spirit" | "type";
}

const ReviewTag = memo(({ name, fallback = "spirit" }: ReviewTagProps) => {
  const styles = useStyles();
  const colors = getReviewTagColors(name);

  return (
    <View
      style={[
        styles.tag,
        fallback === "type" ? styles.typeFallback : styles.spiritFallback,
        colors && { backgroundColor: colors.backgroundColor },
      ]}
    >
      <Text
        style={[
          styles.text,
          fallback === "type" && styles.typeTextFallback,
          colors && { color: colors.textColor },
        ]}
      >
        {name}
      </Text>
    </View>
  );
});

ReviewTag.displayName = "ReviewTag";

export default ReviewTag;

const useStyles = makeStyles((t) => ({
  tag: {
    paddingHorizontal: t.spacing.md - 1,
    paddingVertical: 7,
    borderRadius: t.radius.pill,
  },
  spiritFallback: {
    backgroundColor: t.colors.highlight,
  },
  typeFallback: {
    backgroundColor: t.colors.scrimStrong,
  },
  text: {
    ...t.typography.eyebrow,
    fontSize: 12.5,
    letterSpacing: 1,
    color: t.colors.surfaceInkDeep,
  },
  typeTextFallback: {
    color: t.colors.textOnImage,
  },
}));
