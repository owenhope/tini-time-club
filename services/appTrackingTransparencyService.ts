import { Platform } from "react-native";
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { reportError } from "@/utils/log";

export async function requestAppTrackingTransparencyAsync(): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const currentPermission = await getTrackingPermissionsAsync();
    if (currentPermission.status !== PermissionStatus.UNDETERMINED) {
      return;
    }

    await requestTrackingPermissionsAsync();
  } catch (error) {
    reportError("[TrackingTransparency] Permission request failed:", error);
  }
}
