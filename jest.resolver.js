"use strict";

const rnResolver = require("@react-native/jest-preset/jest/resolver");
const reanimatedResolver = require("react-native-reanimated/jest/resolver");

// Reanimated and worklets have no native runtime under Jest. Their shipped
// resolver (which also applies the worklets one) drops ".native" extensions
// for those packages so the JS implementations load. Jest allows one
// resolver, so run theirs with the React Native preset resolver — which the
// Expo preset expects — standing in as the default.
module.exports = (request, options) => {
  const jestDefault = options.defaultResolver;
  return reanimatedResolver(request, {
    ...options,
    defaultResolver: (path, resolved) =>
      rnResolver(path, { ...resolved, defaultResolver: jestDefault }),
  });
};
