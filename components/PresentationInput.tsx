import { View } from "react-native";
import { Controller } from "react-hook-form";
import VerdictBlock from "@/components/shared/VerdictBlock";
import { makeStyles } from "@/theme";
import { isSelectableRating } from "@/utils/ratingUtils";

const PresentationInput = ({ control }: { control: any }) => {
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name="presentation"
      rules={{
        validate: (value) =>
          isSelectableRating(value) || "Choose a presentation rating",
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
            placeholder={"Coupe, garnish, the whole arrival."}
            accessibilityLabel="Presentation rating"
            labels={[
              "Messy disaster",
              "Lacking effort",
              "Acceptably plain",
              "Elegantly simple",
              "Artistic masterpiece",
            ]}
          />
        </View>
      )}
    />
  );
};

const useStyles = makeStyles(() => ({
  inputContainer: {
    marginBottom: 10,
    width: "100%" as const,
  },
}));

export default PresentationInput;
