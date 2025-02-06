import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Controller } from "react-hook-form";

const TypeInput = ({
  control,
  types,
}: {
  control: any;
  types: { id: number; name: string }[];
}) => (
  <Controller
    control={control}
    name="type"
    rules={{
      required: true,
    }}
    defaultValue=""
    render={({ field: { onChange, value } }) => (
      <View style={styles.inputContainer}>
        <View style={styles.buttonGroup}>
          {types.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionButton,
                value === type.id && styles.selectedButton, // Highlight if selected
              ]}
              onPress={() => onChange(type.id)} // Update form value
            >
              <Text
                style={[
                  styles.buttonText,
                  value === type.id && styles.selectedButtonText, // Highlight text if selected
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )}
  />
);

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 20,
    width: "100%",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "transparent", // Default button background
    borderWidth: 1,
    borderColor: "#ccc",
    width: 100,
  },
  selectedButton: {
    backgroundColor: "olive", // Highlight color for selected button
    borderColor: "olive",
  },
  buttonText: {
    fontSize: 18,
    color: "#FFF", // Default text color
    textAlign: "center",
    textTransform: "capitalize",
  },
  selectedButtonText: {
    color: "#fff", // Highlight text color for selected button
  },
});

export default TypeInput;