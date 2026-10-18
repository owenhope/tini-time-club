import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { AppText } from "@/components/shared";
import RegularPlaceRow from "@/components/RegularPlaceRow";
import {
  getProfileFavorites,
  type FavoritePlace,
  type FavoritesCursor,
} from "@/services/locationFavoritesService";
import { useProfile } from "@/context/profile-context";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";
import { makeStyles } from "@/theme";

export default function ProfileFavorites({
  profileId,
  header,
  onScroll,
}: {
  profileId?: string;
  header: React.ReactElement;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const styles = useStyles();
  const viewerId = useProfile().profile?.id;
  const key = `${viewerId}:${profileId}`;
  const inset = useNativeTabBarContentInset();
  const request = useRef(0);
  const pending = useRef(false);
  const [result, setResult] = useState<{
    key: string;
    items: FavoritePlace[];
    cursor: FavoritesCursor | null;
  }>({ key: "", items: [], cursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const current = result.key === key;

  const load = useCallback(
    async (cursor: FavoritesCursor | null = null) => {
      const more = cursor != null;
      if (!profileId || !viewerId) {
        setLoading(false);
        return;
      }
      if (more && pending.current) return;
      const token = more ? request.current : ++request.current;
      pending.current = true;
      setLoading(true);
      setError(null);
      try {
        const page = await getProfileFavorites(profileId, cursor);
        if (token !== request.current) return;
        setResult((previous) => ({
          key,
          cursor: page.cursor,
          items:
            more && previous.key === key
              ? [
                  ...previous.items,
                  ...page.items.filter(
                    (item) =>
                      !previous.items.some(
                        (old) => old.location_id === item.location_id
                      )
                  ),
                ]
              : page.items,
        }));
      } catch {
        if (token === request.current) {
          if (!more) setResult({ key, items: [], cursor: null });
          setError("Couldn't load favorites. Tap to retry.");
        }
      } finally {
        if (token === request.current) {
          pending.current = false;
          setLoading(false);
        }
      }
    },
    [profileId, viewerId, key]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        request.current++;
        pending.current = false;
      };
    }, [load])
  );

  return (
    <FlatList
      data={current && viewerId ? result.items : []}
      keyExtractor={(item) => String(item.location_id)}
      renderItem={({ item }) => <RegularPlaceRow place={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        !loading && !error ? (
          <View style={styles.message}>
            <AppText tone="secondary">
              {viewerId === profileId
                ? "Star a location to save it here. Your favorites are visible to other members."
                : "No favorite places yet."}
            </AppText>
          </View>
        ) : null
      }
      ListFooterComponent={
        error ? (
          <Pressable
            style={styles.message}
            onPress={() => void load(current ? result.cursor : null)}
            accessibilityRole="button"
          >
            <AppText>{error}</AppText>
          </Pressable>
        ) : loading ? (
          <ActivityIndicator />
        ) : null
      }
      refreshing={loading && (!current || result.items.length === 0)}
      onRefresh={() => void load()}
      onEndReached={() => {
        if (!error && current && result.cursor) void load(result.cursor);
      }}
      onEndReachedThreshold={0.4}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingBottom: inset }}
    />
  );
}

const useStyles = makeStyles((t) => ({
  message: { padding: t.spacing.gutter },
}));
