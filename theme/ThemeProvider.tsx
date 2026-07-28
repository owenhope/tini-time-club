import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  darkColors,
  elevation,
  lightColors,
  radius,
  spacing,
  typography,
  type ThemeColors,
} from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: (typeof elevation)["light"] | (typeof elevation)["dark"];
  isDark: boolean;
}

interface ThemeContextValue extends Theme {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

const STORAGE_KEY = "theme_preference";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        // Falling back to "system" is fine; nothing to report.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch((error) =>
      console.error("Error saving theme preference:", error)
    );
  }, []);

  const isDark =
    preference === "system" ? systemScheme === "dark" : preference === "dark";

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      spacing,
      radius,
      typography,
      elevation: isDark ? elevation.dark : elevation.light,
      isDark,
      preference,
      setPreference,
    }),
    [isDark, preference, setPreference]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

/**
 * Builds a StyleSheet from the theme and memoises per theme object.
 *
 * Styles in this codebase are module-level StyleSheet.create calls, which
 * can't see the theme. This keeps that shape — one factory call per file —
 * while letting the values come from tokens:
 *
 *   const useStyles = makeStyles((t) => ({ card: { backgroundColor: t.colors.surface } }));
 *   const styles = useStyles();
 */
export function makeStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(factory: (theme: Theme) => T): () => T {
  const cache = new WeakMap<object, T>();

  return function useStyles(): T {
    const theme = useTheme();
    // Keyed on the colors object, which is a stable per-scheme singleton, so
    // each theme's sheet is created once for the lifetime of the app.
    const key = theme.colors as unknown as object;
    const cached = cache.get(key);
    if (cached) return cached;
    const created = StyleSheet.create(factory(theme));
    cache.set(key, created);
    return created;
  };
}
