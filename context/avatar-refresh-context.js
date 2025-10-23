// AvatarRefreshContext.js
import React, { createContext, useState, useContext } from "react";

// Create the context
const AvatarRefreshContext = createContext();

// Provider component that wraps your app and makes avatar refresh functionality available
export const AvatarRefreshProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to trigger avatar refresh
  const triggerAvatarRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <AvatarRefreshContext.Provider
      value={{ refreshTrigger, triggerAvatarRefresh }}
    >
      {children}
    </AvatarRefreshContext.Provider>
  );
};

// Custom hook for accessing the avatar refresh context
export const useAvatarRefresh = () => {
  const context = useContext(AvatarRefreshContext);
  if (context === undefined) {
    throw new Error(
      "useAvatarRefresh must be used within an AvatarRefreshProvider"
    );
  }
  return context;
};
