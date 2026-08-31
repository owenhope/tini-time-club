import { createContext, useContext } from "react";
import { Alert } from "react-native";
import type { ShareDestination } from "@/utils/shareDestinations";

export interface ShareMenuItem {
  label: string;
  destination: ShareDestination;
  icon?: string;
  onPress: () => void;
}

export interface ShareMenuConfig {
  title: string;
  actions: ShareMenuItem[];
}

export type ShareMenuContextValue = (config: ShareMenuConfig) => void;

const fallbackShowShareMenu: ShareMenuContextValue = ({ title, actions }) => {
  Alert.alert(
    title,
    undefined,
    [
      ...actions.map((action) => ({
        text: action.label,
        onPress: action.onPress,
      })),
      { text: "Cancel", style: "cancel" as const },
    ],
    { cancelable: true }
  );
};

export const ShareMenuContext = createContext<ShareMenuContextValue>(
  fallbackShowShareMenu
);

export const useShareMenuSheet = () => useContext(ShareMenuContext);
