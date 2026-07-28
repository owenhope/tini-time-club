import React from "react";
import AirbnbRating from "@/components/shared/AirbnbRating";

/**
 * Olive / martini tint for the filled rating icons.
 *
 * Deliberately not themed: this component only ever renders inside the review
 * photo overlay, on top of a dark scrim in both light and dark mode, so these
 * stay fixed for the same reason the overlay text stays white. There is also
 * no semantic token for a decorative icon tint.
 */
const OLIVE_COLOR = "#c3eb78";
const MARTINI_COLOR = "#f3ffc6";

interface ReviewRatingProps {
  value: number;
  label: "taste" | "presentation";
}

const ReviewRating: React.FC<ReviewRatingProps> = ({ value, label }) => {
  const MARTINI_IMAGE = require("@/assets/images/martini_transparent.png");
  const OLIVE_IMAGE = require("@/assets/images/olive_transparent.png");

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
