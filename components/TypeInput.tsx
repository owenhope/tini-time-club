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
                value === type.id && styles.selectedButton,
              ]}
              onPress={() => onChange(type.id)}
            >
              <Text
                style={[
                  styles.buttonText,
                  value === type.id && styles.selectedButtonText,
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  optionButton: {
    width: "48%", // Approximately 50% width with spacing
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "transparent",
    flexDirection: "row", // Ensures content is laid out horizontally
    justifyContent: "center",
    alignItems: "center",
  },
  selectedButton: {
    backgroundColor: "olive",
    borderColor: "olive",
  },
  buttonText: {
    fontSize: 18,
    color: "#FFF",
    textAlign: "center",
    textTransform: "capitalize",
  },
  selectedButtonText: {
    color: "#fff",
  },
});

export default TypeInput;
