import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";
import AnalyticService from "@/services/analyticsService";
import { createScreenVisitTracker } from "@/utils/featureUsage";

export default function AppUsageTracker() {
  const pathname = usePathname();
  const track = useRef(
    createScreenVisitTracker((event) => {
      void AnalyticService.capture(event);
    })
  );
  useEffect(() => {
    track.current(pathname);
  }, [pathname]);
  return null;
}
