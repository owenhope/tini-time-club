import React, { useState } from "react";
import { SafeAreaView } from "react-native";
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
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
}));
