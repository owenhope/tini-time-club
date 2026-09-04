import { makeStyles } from "@/theme";

/** Shared treatment for left-aligned region and venue selection rows. */
export const useSelectionRowStyles = makeStyles((t) => ({
  row: {
    minHeight: 56,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    borderCurve: "continuous" as const,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  selected: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  title: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    flexShrink: 1,
  },
  selectedText: { color: t.colors.onAccent },
  pressed: { opacity: 0.7 },
}));
