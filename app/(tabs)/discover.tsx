import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Keyboard,
  Image,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const router = useRouter();

  const fetchDefaultResults = async () => {
    const { data: topUsers } = await supabase.rpc("top_profiles");
    const { data: topLocations } = await supabase.rpc("top_locations");
    setUsers(topUsers || []);
    setLocations(topLocations || []);
  };

  const search = async (text: string) => {
    setQuery(text);
    if (!text) return fetchDefaultResults();

    const [{ data: userMatches }, { data: locationMatches }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${text}%`)
          .limit(10),
        supabase
          .from("locations")
          .select("id, name, address")
          .ilike("name", `%${text}%`)
          .limit(10),
      ]);

    setUsers(userMatches || []);
    setLocations(locationMatches || []);
  };

  useEffect(() => {
    fetchDefaultResults();
  }, []);

  const renderSection = (
    title: string,
    data: any[],
    type: "user" | "location"
  ) => (
    <>
      {data.length > 0 && <Text style={styles.sectionHeader}>{title}</Text>}
      {data.map((item) => {
        const avatarUrl =
          type === "user" && item.avatar_url
            ? supabase.storage.from("avatars").getPublicUrl(item.avatar_url)
                .data.publicUrl
            : null;

        return (
          <TouchableOpacity
            key={`${type}-${item.id}`}
            style={styles.resultItem}
            onPress={() => {
              Keyboard.dismiss();
              type === "user"
                ? router.navigate(`/${item.username}`)
                : router.navigate(`/locations/${item.id}`);
            }}
          >
            {type === "user" ? (
              avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Ionicons
                  name="person-circle"
                  size={30}
                  color="#aaa"
                  style={{ marginRight: 10 }}
                />
              )
            ) : (
              <Ionicons
                name="location"
                size={24}
                style={{ marginRight: 10 }}
                color="#555"
              />
            )}
            <Text style={styles.resultText}>
              {type === "user" ? item.username : item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#888" />
        <TextInput
          style={styles.input}
          placeholder="Search for people or places"
          value={query}
          onChangeText={search}
          placeholderTextColor="#888"
        />
        {query !== "" && (
          <TouchableOpacity onPress={() => search("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={styles.resultsContainer}>
            {renderSection("Profiles", users, "user")}
            {renderSection("Locations", locations, "location")}
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    marginLeft: 8,
    color: "#000",
  },
  sectionHeader: {
    fontWeight: "600",
    fontSize: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    color: "#333",
  },
  resultsContainer: {
    paddingHorizontal: 12,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  resultText: {
    fontSize: 16,
    color: "#000",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    backgroundColor: "#ccc",
  },
});
