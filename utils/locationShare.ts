import { Platform, Share } from "react-native";
import AnalyticService from "@/services/analyticsService";
import { TTC_WEB_ORIGIN } from "@/utils/shareUrls";

export interface ShareableLocation {
  id: string | number;
  name: string;
}

export const publicLocationUrl = (locationId: string | number) =>
  `${TTC_WEB_ORIGIN.replace(/\/$/, "")}/p/${encodeURIComponent(String(locationId))}`;

export const locationShareText = (location: ShareableLocation) =>
  `Check out ${location.name} on Tini Time Club.`;

export const shareLocationViaSheet = async (location: ShareableLocation) => {
  const url = publicLocationUrl(location.id);
  const text = locationShareText(location);
  const content =
    Platform.OS === "ios"
      ? {
          title: `${location.name} on Tini Time Club`,
          message: text,
          url,
        }
      : {
          title: `${location.name} on Tini Time Club`,
          message: `${text}\n\n${url}`,
        };

  const result = await Share.share(content);
  AnalyticService.capture("share_location", {
    locationId: String(location.id),
    locationName: location.name,
    outcome: result.action === Share.sharedAction ? "shared" : "dismissed",
  });
};
