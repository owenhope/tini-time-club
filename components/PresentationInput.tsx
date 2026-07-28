import { View } from "react-native";
import { Controller } from "react-hook-form";
import RatingSlider from "@/components/shared/RatingSlider";
import { makeStyles } from "@/theme";

const PresentationInput = ({ control }: { control: any }) => {
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name="presentation"
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <RatingSlider
            value={value}
            onChange={onChange}
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
