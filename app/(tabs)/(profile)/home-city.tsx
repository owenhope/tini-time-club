import React from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "@/components/nav/AppHeader";
import HomeCityPicker from "@/components/profile/HomeCityPicker";
import { makeStyles } from "@/theme";

export default function HomeCityScreen() {
  const styles = useStyles();
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <AppHeader
        variant="media"
        title="Home city"
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <HomeCityPicker origin="profile" />
      </ScrollView>
    </SafeAreaView>
  );
}
const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.sheetGutter, paddingBottom: t.spacing.xxl },
}));
