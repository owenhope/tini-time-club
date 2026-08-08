import { View } from "react-native";
import { Controller } from "react-hook-form";
import VerdictBlock from "@/components/shared/VerdictBlock";
import { makeStyles } from "@/theme";
import { isSelectableRating } from "@/utils/ratingUtils";

const TasteInput = ({ control }: { control: any }) => {
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name="taste"
      rules={{
        validate: (value) =>
          isSelectableRating(value) || "Choose a taste rating",
      }}
      render={({ field: { onBlur, onChange, value } }) => (
        <View style={styles.inputContainer}>
          <VerdictBlock
            tone="paper"
            value={value}
            onChange={(rating) => {
              onChange(rating);
              onBlur();
            }}
            placeholder={"Be honest. It can take it."}
            accessibilityLabel="Taste rating"
            labels={[
              "Absolutely undrinkable",
              "Meh, forgettable",
              "Decent attempt",
              "Quite enjoyable",
              "Utter perfection",
            ]}
          />
        </View>
      )}
    />
  );
};

const useStyles = makeStyles(() => ({
  inputContainer: {
    marginVertical: 5,
    width: "100%" as const,
  },
}));

export default TasteInput;
