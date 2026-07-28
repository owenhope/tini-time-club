import React from "react";
import { View, Text } from "react-native";
import { makeStyles } from "@/theme";

interface TagProps {
  text: string;
}

const Tag: React.FC<TagProps> = ({ text }) => {
  const styles = useStyles();

  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  tag: {
    paddingVertical: 6,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.secondary,
  },
  tagText: {
    ...t.typography.label,
    fontWeight: "400" as const,
    letterSpacing: 0,
    color: t.colors.onSecondary,
    textTransform: "capitalize" as const,
  },
}));

export default Tag;
