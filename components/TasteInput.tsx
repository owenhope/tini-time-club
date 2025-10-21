import React from "react";
import { View, StyleSheet } from "react-native";
import { Controller } from "react-hook-form";
import { AirbnbRating } from "react-native-ratings";

const TasteInput = ({ control }: { control: any }) => {
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
            reviewColor="#8B9A46"
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

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 5,
    width: "100%",
  },
});

export default TasteInput;
