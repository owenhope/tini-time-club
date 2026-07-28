import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * The locations tab was renamed to places. Old deep links
 * (tini-time-club://locations/<id>) still land here; forward them.
 */
export default function LegacyLocationRedirect() {
  const { location } = useLocalSearchParams<{ location: string }>();
  return <Redirect href={`/(tabs)/(places)/places/${location}`} />;
}
