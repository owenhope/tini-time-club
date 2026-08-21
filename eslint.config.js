// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettier = require("eslint-config-prettier");

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ["dist/*", "ios/*", "android/*", "supabase/functions/*"],
  },
  {
    rules: {
      // The React Compiler rule family flags ~80 pre-existing violations in
      // this codebase (refs read during render, setState inside effects,
      // mutation of captured values). They point at real fragility and are
      // worth working through, but blocking CI on them today would mean
      // nothing else could land. Warn so they stay visible, and tighten to
      // "error" as each is cleared.
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    // Typography is a deep module: callers choose a semantic role and do not
    // rebuild font geometry locally. Avatar/Input own intentional responsive
    // calculations; review-share owns a private scale for exported artwork.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: [
      "**/__tests__/**",
      "components/review-share/**/*.{ts,tsx}",
      "components/shared/Avatar.tsx",
      "components/shared/Input.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Property[key.name='fontSize']",
          message: "Use a semantic theme typography role instead of fontSize",
        },
        {
          selector: "Property[key.name='lineHeight']",
          message: "Use a semantic theme typography role instead of lineHeight",
        },
        {
          selector: "Property[key.name='fontFamily']",
          message: "Use a semantic theme typography role instead of fontFamily",
        },
      ],
    },
  },
]);
