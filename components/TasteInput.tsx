import { View } from "react-native";
import { Controller } from "react-hook-form";
import AirbnbRating from "@/components/shared/AirbnbRating";
import { makeStyles, useTheme } from "@/theme";

const TasteInput = ({ control }: { control: any }) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const OLIVE_IMAGE = require("@/assets/images/olive_transparent.png");
  return (
    <Controller
      control={control}
      name="taste"
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <AirbnbRating
            starImage={OLIVE_IMAGE}
            selectedColor="#8B9A46"
            count={5}
            size={35}
            reviewSize={35}
            ratingContainerStyle={{
              gap: 10,
            }}
            reviewColor={colors.textSecondary}
            defaultRating={value}
            isDisabled={false}
            reviews={[
              "Absolutely undrinkable",
              "Meh, forgettable",
              "Decent attempt",
              "Quite enjoyable",
              "Utter perfection",
            ]}
            onFinishRating={onChange}
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
