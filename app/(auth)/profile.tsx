import { View, Button, StyleSheet, Image } from "react-native";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/utils/supabase";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";

const Profile = () => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    loadUserAvatar();
  }, []);

  const loadUserAvatar = async () => {
    const {
      data: { user: User },
    } = await supabase.auth.getUser();

    if (!User) return;

    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(`${User.id}/avatar.png`);

      if (error) {
        console.error(error);
        return;
      }

      if (data) {
        const fr = new FileReader();
        fr.readAsDataURL(data);
        fr.onload = () => {
          setImage(fr.result as string);
        };
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);

      const {
        data: { user: User },
      } = await supabase.auth.getUser();

      if (!User) return;

      const img = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(img.uri, {
        encoding: "base64",
      });
      const filePath = `${User.id}/avatar.png`;
      const contentType = "image/png";

      try {
        const { error } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), { contentType, upsert: true });

        if (error) {
          console.error("Error uploading avatar:", error);
        } else {
          console.log("Avatar uploaded successfully");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <View>
      {image ? (
        <Image style={styles.avatar} source={{ uri: image }} />
      ) : (
        <View style={styles.avatar}></View>
      )}
      <Button title="Set Avatar Image" onPress={pickImage} />
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 200,
    height: 200,
    backgroundColor: "#ccc",
    alignSelf: "center",
    borderRadius: 100,
    margin: 40,
  },
});

export default Profile;
