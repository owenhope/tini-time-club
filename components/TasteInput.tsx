import { View } from "react-native";
import { Controller } from "react-hook-form";
import RatingSlider from "@/components/shared/RatingSlider";
import { makeStyles } from "@/theme";

const TasteInput = ({ control }: { control: any }) => {
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name="taste"
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <RatingSlider
            value={value}
            onChange={onChange}
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
