import { Text, TouchableOpacity, View } from "react-native";
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
  /** Cap on selections; picking beyond it replaces the oldest choice. */
  maxSelections?: number;
};

const MultiSelectInput = ({
  options,
  selectedIds,
  onSelectionChange,
  label,
  maxSelections,
}: MultiSelectInputProps) => {
  const styles = useStyles();

  const toggleSelection = (id: number | string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else if (maxSelections != null && selectedIds.length >= maxSelections) {
      const keep = maxSelections - 1;
      onSelectionChange([...(keep > 0 ? selectedIds.slice(-keep) : []), id]);
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      {/* Wrapping rows keep every option visible at once — a horizontal
          scroller hid the tail of the list behind a swipe. */}
      <View style={styles.optionsWrap}>
        {options.map(({ id, name: optionName }) => {
          const isSelected = selectedIds.includes(id);

          return (
            <TouchableOpacity
              key={id}
              style={[styles.optionButton, isSelected && styles.selectedButton]}
              onPress={() => toggleSelection(id)}
              accessibilityRole="checkbox"
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
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    paddingVertical: t.spacing.md,
    width: "100%" as const,
  },
  label: {
    ...t.typography.eyebrow,
    marginBottom: t.spacing.md,
    color: t.colors.textSecondary,
  },
  optionsWrap: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: t.spacing.sm,
  },
  optionButton: {
    minHeight: 44,
    justifyContent: "center" as const,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  selectedButton: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  buttonText: {
    ...t.typography.caption,
    color: t.colors.text,
    textTransform: "capitalize" as const,
  },
  selectedButtonText: {
    color: t.colors.onAccent,
  },
}));

export default MultiSelectInput;
