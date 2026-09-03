import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from "react-hook-form";
import { Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { makeStyles } from "@/theme";

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
}: SelectableOptionsInputProps<TFieldValues>) => {
  const styles = useStyles();

  return (
    <Controller
      key={name}
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
                  onPress={() => {
                    void Haptics.selectionAsync();
                    onChange(id);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={optionName}
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
};

const useStyles = makeStyles((t) => ({
  inputContainer: {
    paddingVertical: t.spacing.xs,
    width: "100%" as const,
  },
  buttonGroup: {
    flexDirection: "column" as const,
    paddingTop: t.spacing.xs,
    gap: t.spacing.md,
  },
  optionButton: {
    width: "100%" as const,
    paddingVertical: t.spacing.lg,
    paddingHorizontal: t.spacing.xl - 4,
    borderRadius: t.radius.pill,
    // Reserve the selected outline so toggling never changes the pill's box.
    borderWidth: 2,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  // Spirit and type selections use the primary purple as a decisive selected
  // state. The two-pixel border is already reserved above, so the solid fill
  // does not change the pill's dimensions when toggled.
  selectedButton: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  buttonText: {
    ...t.typography.body,
    color: t.colors.text,
    textAlign: "center" as const,
    textTransform: "capitalize" as const,
  },
  selectedButtonText: {
    color: t.colors.onAccent,
  },
}));

export default SelectableOptionsInput;
