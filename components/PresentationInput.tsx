import React from "react";
import { View, StyleSheet } from "react-native";
import { Controller } from "react-hook-form";
import { AirbnbRating } from "react-native-ratings";

const PresentationInput = ({ control }: { control: any }) => {
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
            starContainerStyle={{ padding: 5, width: 35, height: 35 }}
            reviewSize={20}
            defaultRating={value}
            reviewColor="#9CA3AF"
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

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 5,
    width: "100%",
  },
});

export default PresentationInput;
