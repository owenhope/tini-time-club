export type TabBarAccent = "green" | "purple";

const PURPLE_HEADER_PATHS = ["/profile", "/places/", "/users/", "/r/"] as const;

export const getTabBarAccentForPath = (pathname: string): TabBarAccent =>
  PURPLE_HEADER_PATHS.some((path) =>
    path.endsWith("/") ? pathname.startsWith(path) : pathname === path
  )
    ? "purple"
    : "green";
