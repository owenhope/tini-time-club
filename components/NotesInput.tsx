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
    marginVertical: 20,
    width: "100%",
  },
  textarea: {
    fontSize: 18,
    minHeight: 100,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#FFF",
  },
});

export default NotesInput;