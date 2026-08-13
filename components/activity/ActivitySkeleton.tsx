import React from "react";
import { View } from "react-native";
import Skeleton from "@/components/shared/Skeleton";
import { makeStyles } from "@/theme";

export default function ActivitySkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.row}>
          <Skeleton width={36} height={36} circle />
          <View style={styles.copy}>
            <Skeleton width="88%" height={15} />
            <Skeleton width="32%" height={13} />
          </View>
          <Skeleton width={48} height={48} radius={10} />
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    backgroundColor: t.colors.surface,
  },
  row: {
    minHeight: 76,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  copy: {
    flex: 1,
    gap: t.spacing.sm,
  },
}));
