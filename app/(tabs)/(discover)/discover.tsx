import React, { useState } from "react";
import { SafeAreaView } from "react-native";
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
    <SafeAreaView style={styles.container}>
      {/* The search block runs green up behind the status bar. */}
      <StatusBar style="light" />
      <DiscoverTabs
        query={query}
        onTabChange={setActiveTab}
        activeTab={activeTab}
        onQueryChange={handleQueryChange}
      />
    </SafeAreaView>
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
