import { Alert } from "react-native";
import AnalyticService from "@/services/analyticsService";
import { TTC_WEB_ORIGIN } from "@/utils/shareUrls";
import {
  copyShareText,
  instagramAppUrl,
  messageShareUrl,
  openShareUrl,
  shareMessageWithUrl,
  whatsappShareUrl,
} from "@/utils/shareDestinations";
import { warn } from "@/utils/log";

export interface ShareableLocation {
  id: string | number;
  name: string;
}

export type LocationShareChannel =
  | "sheet"
  | "copy_link"
  | "instagram_story"
  | "instagram_post"
  | "message"
  | "whatsapp";

export const publicLocationUrl = (locationId: string | number) =>
  `${TTC_WEB_ORIGIN.replace(/\/$/, "")}/p/${encodeURIComponent(String(locationId))}`;

export const locationShareText = (location: ShareableLocation) =>
  `Check out ${location.name} on Tini Time Club.`;

const locationShareMessage = (location: ShareableLocation) =>
  shareMessageWithUrl(
    locationShareText(location),
    publicLocationUrl(location.id)
  );

const logLocationShare = (
  location: ShareableLocation,
  channel: LocationShareChannel,
  outcome: string
) => {
  AnalyticService.capture("share_location", {
    locationId: String(location.id),
    locationName: location.name,
    channel,
    outcome,
  });
};

export const shareLocationViaWhatsApp = async (location: ShareableLocation) => {
  const opened = await openShareUrl(
    whatsappShareUrl(locationShareMessage(location)),
    "WhatsApp unavailable",
    "WhatsApp does not appear to be installed on this device.",
    "WhatsApp location share failed:"
  );
  logLocationShare(location, "whatsapp", opened ? "opened" : "unavailable");
};

export const shareLocationViaMessage = async (location: ShareableLocation) => {
  const opened = await openShareUrl(
    messageShareUrl(locationShareMessage(location)),
    "Messages unavailable",
    "Messages could not be opened on this device.",
    "Message location share failed:"
  );
  logLocationShare(location, "message", opened ? "opened" : "unavailable");
};

export const copyLocationLink = async (location: ShareableLocation) => {
  try {
    await copyShareText(publicLocationUrl(location.id));
    Alert.alert("Link copied", "Location link copied to clipboard.");
    logLocationShare(location, "copy_link", "copied");
  } catch (error) {
    warn("Location link copy failed:", error);
    Alert.alert("Copy failed", "The location link could not be copied.");
    logLocationShare(location, "copy_link", "failed");
  }
};

export const shareLocationViaInstagram = async (
  location: ShareableLocation,
  channel: Extract<LocationShareChannel, "instagram_story" | "instagram_post">
) => {
  let copied = false;

  try {
    await copyShareText(locationShareMessage(location));
    copied = true;
  } catch (error) {
    warn("Instagram location clipboard handoff failed:", error);
  }

  const opened = await openShareUrl(
    instagramAppUrl,
    "Instagram unavailable",
    "Instagram does not appear to be installed on this device.",
    "Instagram location share failed:"
  );
  logLocationShare(
    location,
    channel,
    opened ? (copied ? "opened_with_clipboard" : "opened") : "unavailable"
  );
};
