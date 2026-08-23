import React, { useMemo, useState } from "react";

interface TabBarVisibilityValue {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const TabBarVisibilityContext = React.createContext<TabBarVisibilityValue>({
  hidden: false,
  setHidden: () => undefined,
});

export const TabBarVisibilityProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden]);

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
};

export const useTabBarVisibility = () => React.use(TabBarVisibilityContext);
