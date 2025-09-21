import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DiscoverTabs from "@/components/DiscoverTabs";

export default function SearchScreen() {
  const [query, setQuery] = useState("");

  const search = (text: string) => {
    setQuery(text);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#9ca3af" />
        <TextInput
          style={styles.input}
          placeholder="Search for people or places"
          value={query}
          onChangeText={search}
          placeholderTextColor="#9ca3af"
        />
        {query !== "" && (
          <TouchableOpacity onPress={() => search("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <DiscoverTabs query={query} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    margin: 20,
    paddingHorizontal: 16,
    borderRadius: 25,
    height: 48,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: "#1a1a1a",
  },
});
