import React from "react";
import { FlatList, type FlatListProps } from "react-native";
import RegularPlaceRow from "@/components/RegularPlaceRow";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";
import { makeStyles } from "@/theme";

type Place = React.ComponentProps<typeof RegularPlaceRow>["place"];

export default function ProfilePlaceList<T extends Place>(
  props: Omit<FlatListProps<T>, "renderItem">
) {
  const styles = useStyles();
  const inset = useNativeTabBarContentInset();
  return (
    <FlatList
      {...props}
      keyExtractor={(place) => String(place.location_id)}
      renderItem={({ item }) => <RegularPlaceRow place={item} />}
      ListHeaderComponentStyle={styles.header}
      contentContainerStyle={{ paddingBottom: inset }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    />
  );
}

const useStyles = makeStyles((t) => ({
  header: { paddingBottom: t.spacing.md },
}));
