import React, { createContext, useContext, useState, ReactNode } from "react";

interface HomeContextType {
  scrollToTop: (() => void) | null;
  setScrollToTop: (callback: (() => void) | null) => void;
}

const HomeContext = createContext<HomeContextType | undefined>(undefined);

export const HomeProvider = ({ children }: { children: ReactNode }) => {
  const [scrollToTop, setScrollToTop] = useState<(() => void) | null>(null);

  console.log("HomeProvider rendering, scrollToTop:", !!scrollToTop);

  const wrappedSetScrollToTop = (callback: (() => void) | null) => {
    console.log("setScrollToTop called with:", !!callback);
    setScrollToTop(callback);
  };

  return (
    <HomeContext.Provider
      value={{ scrollToTop, setScrollToTop: wrappedSetScrollToTop }}
    >
      {children}
    </HomeContext.Provider>
  );
};

export const useHomeContext = () => {
  const context = useContext(HomeContext);
  if (context === undefined) {
    throw new Error("useHomeContext must be used within a HomeProvider");
  }
  return context;
};
