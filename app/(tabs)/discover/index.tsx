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
import { stripNameFromAddress } from "@/utils/helpers";
import { getLocationRatingDisplay } from "@/utils/ratingUtils";

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
            style={styles.resultCard}
            onPress={() => {
              Keyboard.dismiss();
              type === "user"
                ? router.navigate(`/discover/users/${item.username}`)
                : router.navigate(`/discover/locations/${item.id}`);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              {type === "user" ? (
                <View style={styles.avatarContainer}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {item.username?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>
                    {getLocationRatingDisplay(item)}
                  </Text>
                </View>
              )}
              <View style={styles.textContainer}>
                <Text style={styles.resultTitle}>
                  {type === "user"
                    ? item.username || "Unknown User"
                    : item.name}
                </Text>
                {type === "location" && item.address && (
                  <Text style={styles.resultSubtitle}>
                    {stripNameFromAddress(item.name, item.address)}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );

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
  sectionHeader: {
    fontWeight: "600",
    fontSize: 18,
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 20,
    color: "#1a1a1a",
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 25,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 25,
    backgroundColor: "#336654",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 25,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  ratingContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#B6A3E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 1,
  },
  resultSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  ratingText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});
