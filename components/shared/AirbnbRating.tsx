import React from "react";
import { AirbnbRating as BaseAirbnbRating } from "react-native-ratings";

/**
 * react-native-ratings' AirbnbRating (TapRating) is a function component that
 * declares its defaults via `defaultProps`. React 19 removed support for that,
 * so the defaults arrive as `undefined` and the component renders no stars.
 *
 * This wrapper re-applies the library's own defaults explicitly.
 */
const RATING_DEFAULTS = {
  defaultRating: 3,
  reviews: ["Terrible", "Bad", "Okay", "Good", "Great"],
  count: 5,
  showRating: true,
  reviewColor: "rgba(230, 196, 46, 1)",
  reviewSize: 25,
};

const AirbnbRating = (props: any) => (
  <BaseAirbnbRating {...RATING_DEFAULTS} {...props} />
);

export default AirbnbRating;
