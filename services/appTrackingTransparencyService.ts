import { Platform } from "react-native";
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { syncMetaAdvertiserTracking } from "@/services/metaAppEventsService";
import { reportError } from "@/utils/log";

export async function requestAppTrackingTransparencyAsync(): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const currentPermission = await getTrackingPermissionsAsync();
    if (currentPermission.status !== PermissionStatus.UNDETERMINED) {
      syncMetaAdvertiserTracking(
        currentPermission.status === PermissionStatus.GRANTED
      );
      return;
    }

    const { status } = await requestTrackingPermissionsAsync();
    syncMetaAdvertiserTracking(status === PermissionStatus.GRANTED);
  } catch (error) {
    reportError("[TrackingTransparency] Permission request failed:", error);
  }
}
