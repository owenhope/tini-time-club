const INTERNAL_ROUTE_PATTERN =
  /^\/(home|activity|places(?:\/\d+)?|users\/[^/?#]+|r\/\d+\?comments=1)$/;

export const getNotificationRouteFromData = (
  data: Record<string, unknown> | null | undefined
): string | null => {
  const url = data?.url;
  return typeof url === "string" && INTERNAL_ROUTE_PATTERN.test(url)
    ? url
    : null;
};
