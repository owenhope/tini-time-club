const EXPLORE_VIEWS = ["map", "golden-glass", "members"] as const;

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
  if (requestedView === "places") return "golden-glass";

  if (firstParam(tab) === "members") return "members";
  // `places` was the released Top Places route. Keep it as a transition
  // alias, while all newly generated routes use Golden Glass.
  if (firstParam(tab) === "places") return "golden-glass";
  return "map";
};

export const getFirstExploreParam = firstParam;
