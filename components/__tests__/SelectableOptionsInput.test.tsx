import React, { useState } from "react";
import { Pressable, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { useForm, useWatch } from "react-hook-form";
import SelectableOptionsInput from "@/components/SelectableOptionsInput";
import { ThemeProvider } from "@/theme";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

interface FormValues {
  spirit: number | string;
  type: number | string;
}

const OPTIONS = {
  spirit: [{ id: 1, name: "Vodka" }],
  type: [{ id: 10, name: "Twist" }],
};

const ConditionalOptionForm = () => {
  const [field, setField] = useState<"spirit" | "type">("spirit");
  const { control } = useForm<FormValues>({
    shouldUnregister: false,
    defaultValues: { spirit: "", type: "" },
  });
  const values = useWatch({ control });

  return (
    <>
      <SelectableOptionsInput
        control={control}
        name={field}
        options={OPTIONS[field]}
      />
      <Pressable testID="switch-field" onPress={() => setField("type")} />
      <Text testID="form-values">{JSON.stringify(values)}</Text>
    </>
  );
};

describe("SelectableOptionsInput", () => {
  it("retains a selection when the same input switches to another field", () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <ConditionalOptionForm />
        </ThemeProvider>
      );
    });
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: "Vodka" })
        .props.onPress();
      renderer.root.findByProps({ testID: "switch-field" }).props.onPress();
    });
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: "Twist" })
        .props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: "form-values" }).props.children
    ).toBe(JSON.stringify({ spirit: 1, type: 10 }));
  });
});
