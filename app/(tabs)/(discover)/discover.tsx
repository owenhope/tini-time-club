import React, { useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
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
      {/* The header owns the top inset, so the green runs up behind the
          status bar rather than starting under it. */}
      <StatusBar style="light" />
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
