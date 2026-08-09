"use client";

import { useEffect, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "ttc-admin-theme";
const THEME_CHANGE_EVENT = "ttc-admin-theme-change";

const getThemeSnapshot = () =>
  document.documentElement.classList.contains("dark");

const getServerThemeSnapshot = () => false;

const applyPreferredTheme = () => {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle(
    "dark",
    savedTheme === "dark" || (savedTheme !== "light" && prefersDark)
  );
};

const subscribeToTheme = (onChange: () => void) => {
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = () => {
    if (window.localStorage.getItem(THEME_STORAGE_KEY)) return;
    document.documentElement.classList.toggle("dark", colorScheme.matches);
    onChange();
  };
  const handleStorageChange = () => {
    applyPreferredTheme();
    onChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorageChange);
  colorScheme.addEventListener("change", handleSystemChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorageChange);
    colorScheme.removeEventListener("change", handleSystemChange);
  };
};

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const isDark = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  useEffect(() => {
    applyPreferredTheme();
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextIsDark);
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      nextIsDark ? "dark" : "light"
    );
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={toggleTheme}
      className={`theme-toggle group flex items-center rounded-lg text-sm font-bold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
        compact ? "gap-0 p-1.5" : "w-full justify-between gap-3 px-3 py-2"
      }`}
    >
      {compact ? null : <span>Dark mode</span>}
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb" />
      </span>
    </button>
  );
}
