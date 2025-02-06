import React from "react";
import { AirbnbRating } from "react-native-ratings";

interface ReviewRatingProps {
  value: number;
  label: "taste" | "presentation";
}

const ReviewRating: React.FC<ReviewRatingProps> = ({ value, label }) => {
  const MARTINI_IMAGE = require("@/assets/images/martini_transparent.png");
  const OLIVE_IMAGE = require("@/assets/images/olive_transparent.png");
  const OLIVE_COLOR = "#c3eb78";
  const MARTINI_COLOR = "#f3ffc6";

  return (
    <AirbnbRating
      starImage={label === "taste" ? OLIVE_IMAGE : MARTINI_IMAGE}
      selectedColor={label === "taste" ? OLIVE_COLOR : MARTINI_COLOR}
      count={5}
      size={20}
      reviewSize={16}
      showRating={false}
      ratingContainerStyle={{ alignItems: "flex-start" }}
      defaultRating={value}
    />
  );
};

export default ReviewRating;
