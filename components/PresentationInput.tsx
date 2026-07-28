import { View } from "react-native";
import { Controller } from "react-hook-form";
import AirbnbRating from "@/components/shared/AirbnbRating";
import { makeStyles, useTheme } from "@/theme";

const PresentationInput = ({ control }: { control: any }) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const MARTINI_IMAGE = require("@/assets/images/martini_transparent.png");
  return (
    <Controller
      control={control}
      name="presentation"
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <AirbnbRating
            starImage={MARTINI_IMAGE}
            selectedColor="#9CA3AF"
            count={5}
            size={35}
            reviewSize={35}
            ratingContainerStyle={{
              gap: 10,
            }}
            defaultRating={value}
            reviewColor={colors.textSecondary}
            isDisabled={false}
            reviews={[
              "Messy disaster",
              "Lacking effort",
              "Acceptably plain",
              "Elegantly simple",
              "Artistic masterpiece",
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
    marginBottom: 10,
    width: "100%" as const,
  },
}));

export default PresentationInput;
