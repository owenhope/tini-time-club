"use strict";

const rnResolver = require("@react-native/jest-preset/jest/resolver");

// react-native-worklets has no native runtime under Jest; its shipped resolver
// (react-native-worklets/jest/resolver.js) strips ".native" extensions so the
// JS implementation is used. Jest allows one resolver, so replicate that here
// and delegate to the React Native preset resolver the Expo preset expects.
module.exports = (request, options) => {
  if (
    options.basedir.includes("react-native-worklets") ||
    request.includes("react-native-worklets")
  ) {
    options = {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes("native")),
    };
  }

  return rnResolver(request, options);
};
