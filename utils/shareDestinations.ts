import { Alert, Linking, Platform } from "react-native";
import { warn } from "@/utils/log";

export type ShareDestination =
  "instagram_story" | "instagram_post" | "whatsapp" | "message" | "copy_link";

export interface ShareDestinationAction {
  label: string;
  destination: ShareDestination;
}

export const getShareDestinationActions = (): ShareDestinationAction[] => [
  { label: "Instagram Story", destination: "instagram_story" },
  { label: "WhatsApp", destination: "whatsapp" },
  { label: "Message", destination: "message" },
  { label: "Copy Link", destination: "copy_link" },
];

export const shareMessageWithUrl = (text: string, url: string) =>
  `${text}\n\n${url}`;

export const whatsappShareUrl = (message: string) =>
  `whatsapp://send?text=${encodeURIComponent(message)}`;

export const messageShareUrl = (message: string) =>
  `${Platform.OS === "ios" ? "sms:&body=" : "sms:?body="}${encodeURIComponent(
    message
  )}`;

export const instagramAppUrl = "instagram://app";

export const copyShareText = async (text: string) => {
  const Clipboard = await import("expo-clipboard");
  return Clipboard.setStringAsync(text);
};

export const openShareUrl = async (
  url: string,
  unavailableTitle: string,
  unavailableMessage: string,
  logMessage: string
) => {
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    warn(logMessage, error);
    Alert.alert(unavailableTitle, unavailableMessage);
    return false;
  }
};
