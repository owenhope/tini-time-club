import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface TagProps {
  text: string;
}

const Tag: React.FC<TagProps> = ({ text }) => {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#2d5016",
  },
  tagText: {
    fontSize: 12,
    color: "#fff",
    textTransform: "capitalize",
  },
});

export default Tag;

