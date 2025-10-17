import React from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { Controller } from "react-hook-form";

const NotesInput = ({ control }: { control: any }) => (
  <Controller
    control={control}
    name="notes"
    render={({ field: { onChange, value } }) => (
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textarea}
          multiline={true}
          onChangeText={onChange}
          value={value}
        />
      </View>
    )}
  />
);

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 5,
    width: "100%",
  },
  textarea: {
    fontSize: 16,
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#000",
    textAlignVertical: "top",
  },
});

export default NotesInput;
