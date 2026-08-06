import React, { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { View } from "react-native";
import CelebrationModal from "@/components/CelebrationModal";
import { makeStyles } from "@/theme";

export default function CelebrationPreview() {
  const router = useRouter();
  const styles = useStyles();
  const [visible, setVisible] = useState(true);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <View style={styles.container}>
      {visible ? (
        <CelebrationModal
          achievements={[
            {
              kind: "regular",
              locationId: 1206,
              locationName: "The Gull Bar & Kitchen",
            },
          ]}
          profile={{ username: "Owen", avatar_url: null }}
          reviewCount={2}
          previewMode
          onClose={() => {
            setVisible(false);
            router.back();
          }}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surfaceBrand,
  },
}));
