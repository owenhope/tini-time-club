const INTERNAL_ROUTE_PATTERN = /^\/(home|places(?:\/\d+)?|users\/[^/?#]+)$/;

export const getNotificationRouteFromData = (
  data: Record<string, unknown> | null | undefined
): string | null => {
  const url = data?.url;
  return typeof url === "string" && INTERNAL_ROUTE_PATTERN.test(url)
    ? url
    : null;
};
