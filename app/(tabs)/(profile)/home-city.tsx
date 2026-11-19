import React from "react";
import { ScrollView } from "react-native";
import HomeCityPicker from "@/components/profile/HomeCityPicker";
import { makeStyles } from "@/theme";

/** Pushed settings page; the stack's header supplies the title and back. */
export default function HomeCityScreen() {
  const styles = useStyles();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Shows the saved city; with none saved, starts from the device's. */}
      <HomeCityPicker origin="profile" autoDetect />
    </ScrollView>
  );
}
const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.sheetGutter, paddingBottom: t.spacing.xxl },
}));
