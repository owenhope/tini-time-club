import React from "react";
import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from "react-hook-form";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Option = {
  id: number | string;
  name: string;
};

type SelectableOptionsInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  options: Option[];
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>;
};

const SelectableOptionsInput = <TFieldValues extends FieldValues>({
  control,
  name,
  options,
  rules = { required: true },
}: SelectableOptionsInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    rules={rules}
    render={({ field: { onChange, value } }) => (
      <View style={styles.inputContainer}>
        <View style={styles.buttonGroup}>
          {options.map(({ id, name: optionName }) => {
            const isSelected = value === id;

            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.optionButton,
                  isSelected && styles.selectedButton,
                ]}
                onPress={() => onChange(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    isSelected && styles.selectedButtonText,
                  ]}
                >
                  {optionName}
                </Text>
              </TouchableOpacity>
            );
          })}
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
    flexDirection: "column",
    marginTop: 5,
  },
  optionButton: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
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

export default SelectableOptionsInput;
