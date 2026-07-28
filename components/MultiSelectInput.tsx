import { Text, TouchableOpacity, View, ScrollView } from "react-native";
import { makeStyles } from "@/theme";

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
  const styles = useStyles();

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
              style={[styles.optionButton, isSelected && styles.selectedButton]}
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

const useStyles = makeStyles((t) => ({
  container: {
    marginVertical: 10,
    width: "100%" as const,
  },
  label: {
    ...t.typography.heading,
    fontSize: 16,
    letterSpacing: 0,
    marginBottom: t.spacing.md,
    color: t.colors.text,
  },
  scrollContent: {
    paddingRight: t.spacing.xl - 4,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: t.spacing.lg,
    marginRight: t.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  selectedButton: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  buttonText: {
    fontSize: 14,
    color: t.colors.text,
    textTransform: "capitalize" as const,
  },
  selectedButtonText: {
    color: t.colors.onAccent,
    fontWeight: "600" as const,
  },
}));

export default MultiSelectInput;
