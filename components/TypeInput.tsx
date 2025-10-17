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
    marginVertical: 5,
    width: "100%",
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 5,
  },
  optionButton: {
    width: "48%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fafafa",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedButton: {
    backgroundColor: "#B6A3E2",
    borderColor: "#B6A3E2",
  },
  buttonText: {
    fontSize: 16,
    color: "#000",
    textAlign: "center",
    textTransform: "capitalize",
  },
  selectedButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default TypeInput;
