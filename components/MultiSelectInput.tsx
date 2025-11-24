import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";

type Option = {
  id: number | string;
  name: string;
};

type MultiSelectInputProps = {
  options: Option[];
  selectedIds: (number | string)[];
  onSelectionChange: (selectedIds: (number | string)[]) => void;
  label?: string;
};

const MultiSelectInput = ({
  options,
  selectedIds,
  onSelectionChange,
  label,
}: MultiSelectInputProps) => {
  const toggleSelection = (id: number | string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map(({ id, name: optionName }) => {
          const isSelected = selectedIds.includes(id);

          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.optionButton,
                isSelected && styles.selectedButton,
              ]}
              onPress={() => toggleSelection(id)}
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000",
  },
  scrollContent: {
    paddingRight: 20,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fafafa",
  },
  selectedButton: {
    backgroundColor: "#B6A3E2",
    borderColor: "#B6A3E2",
  },
  buttonText: {
    fontSize: 14,
    color: "#000",
    textTransform: "capitalize",
  },
  selectedButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default MultiSelectInput;

