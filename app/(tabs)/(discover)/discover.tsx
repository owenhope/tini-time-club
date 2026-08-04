import React, { useState } from "react";
import { View } from "react-native";
import DiscoverTabs from "@/components/DiscoverTabs";
import { makeStyles } from "@/theme";

export default function SearchScreen() {
  const styles = useStyles();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"profiles" | "locations">(
    "locations"
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
  };

  return (
    <View style={styles.container}>
      {/* The header owns the top inset and the status bar with it, so the
          green runs up behind the notch rather than starting under it. */}
      <DiscoverTabs
        query={query}
        onTabChange={setActiveTab}
        activeTab={activeTab}
        onQueryChange={handleQueryChange}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // The green runs up behind the notch so the search block reads as one
  // continuous brand surface; the results below paint their own paper.
  container: {
    flex: 1,
    backgroundColor: t.colors.surfaceInk,
  },
}));
