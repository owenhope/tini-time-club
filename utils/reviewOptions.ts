import type { NamedOption } from "@/types/types";

const SPIRIT_ORDER = ["vodka", "gin", "vesper"] as const;
const TYPE_ORDER = [
  "classic",
  "dry",
  "50/50",
  "twist",
  "dirty",
  "filthy",
  "espresso",
] as const;

const normalizeOptionName = (name: string) => name.trim().toLowerCase();

const filterSupportedOptions = (
  options: NamedOption[],
  order: readonly string[]
): NamedOption[] => {
  const optionIndex = new Map<string, number>(
    order.map((name, index) => [name, index])
  );
  const seen = new Set<string>();

  return options
    .filter((option) => optionIndex.has(normalizeOptionName(option.name)))
    .sort(
      (a, b) =>
        optionIndex.get(normalizeOptionName(a.name))! -
        optionIndex.get(normalizeOptionName(b.name))!
    )
    .filter((option) => {
      const name = normalizeOptionName(option.name);
      if (seen.has(name)) return false;

      seen.add(name);
      return true;
    });
};

export const getSupportedSpirits = (spirits: NamedOption[]): NamedOption[] =>
  filterSupportedOptions(spirits, SPIRIT_ORDER);

export const getSupportedTypes = (types: NamedOption[]): NamedOption[] =>
  filterSupportedOptions(types, TYPE_ORDER);
