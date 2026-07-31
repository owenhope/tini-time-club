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
    // Guardrail for the theme-token refactor: new styles should pull type
    // from t.typography.* rather than hardcoding fontSize. Warn (not error)
    // because a tail of literals without a matching token remains.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Property[key.name='fontSize'][value.type='Literal'][value.raw=/^[0-9]/]",
          message:
            "Prefer theme typography tokens (t.typography.*) over raw fontSize",
        },
      ],
    },
  },
]);
