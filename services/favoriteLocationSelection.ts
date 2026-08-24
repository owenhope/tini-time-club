export interface FavoriteLocationValue {
  id: number;
  name: string;
  address?: string | null;
  is_golden_glass?: boolean;
}

let pendingSelection: FavoriteLocationValue | null | undefined;

export const setPendingFavoriteLocation = (
  selection: FavoriteLocationValue | null
) => {
  pendingSelection = selection;
};

export const consumePendingFavoriteLocation = () => {
  const selection = pendingSelection;
  pendingSelection = undefined;
  return selection;
};
