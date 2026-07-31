import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from "react-hook-form";
import { Text, TouchableOpacity, View } from "react-native";
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
};

const useStyles = makeStyles((t) => ({
  inputContainer: {
    marginVertical: 5,
    width: "100%" as const,
  },
  buttonGroup: {
    flexDirection: "column" as const,
    marginTop: 5,
  },
  optionButton: {
    width: "100%" as const,
    paddingVertical: t.spacing.lg,
    paddingHorizontal: t.spacing.xl - 4,
    marginBottom: t.spacing.md,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  selectedButton: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  buttonText: {
    fontSize: 15,
    color: t.colors.text,
    textAlign: "center" as const,
    textTransform: "capitalize" as const,
  },
  selectedButtonText: {
    color: t.colors.onAccent,
    fontWeight: "600" as const,
  },
}));

export default SelectableOptionsInput;
