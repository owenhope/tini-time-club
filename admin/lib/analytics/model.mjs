const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const count = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const nullableNumber = (value) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const dayCounts = (value) =>
  (Array.isArray(value) ? value : []).map((row) => ({
    day: String(object(row).day ?? ""),
    count: count(object(row).count),
  }));

export const channelCounts = (value) =>
  (Array.isArray(value) ? value : []).map((row) => ({
    channel: String(object(row).channel ?? "unknown"),
    count: count(object(row).count),
  }));

export const record = object;
