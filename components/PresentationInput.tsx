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
            selectedColor="#f3ffc6"
            count={5}
            size={40}
            starContainerStyle={{ padding: 25 }}
            reviewSize={24}
            defaultRating={value}
            reviewColor="#f3ffc6"
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
    marginVertical: 20,
    width: "100%",
  },
});

export default PresentationInput;