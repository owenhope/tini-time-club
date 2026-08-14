export const EXPLORE_VIEWS = ["map", "places", "members"] as const;

export type ExploreView = (typeof EXPLORE_VIEWS)[number];
export type ExploreListView = Exclude<ExploreView, "map">;

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Resolves canonical `view` params and the previous `tab` shape. */
export const resolveExploreView = ({
  view,
  tab,
}: {
  view?: string | string[];
  tab?: string | string[];
}): ExploreView => {
  const requestedView = firstParam(view);
  if (EXPLORE_VIEWS.includes(requestedView as ExploreView)) {
    return requestedView as ExploreView;
  }

  return firstParam(tab) === "members" ? "members" : "map";
};

export const getFirstExploreParam = firstParam;
