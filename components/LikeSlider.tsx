import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import ProfileList from "@/components/ProfileList";

const screenHeight = Dimensions.get("window").height;

interface LikesSliderProps {
  reviewId: string;
  onClose: () => void;
}

export default function LikesSlider({ reviewId, onClose }: LikesSliderProps) {
  const [likesUsers, setLikesUsers] = useState<any[]>([]);
  const [showContent, setShowContent] = useState(false);
  const sliderAnim = useRef(new Animated.Value(screenHeight)).current;

  const fetchLikesUsers = async () => {
    const { data: likesData, error: likesError } = await supabase
      .from("likes")
      .select("user_id")
      .eq("review_id", reviewId);
    if (likesError) {
      console.error("Error fetching likes users:", likesError);
      return;
    }
    if (!likesData || likesData.length === 0) {
      setLikesUsers([]);
      return;
    }
    const userIds = likesData.map((row: any) => row.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    if (profilesError) {
      console.error("Error fetching profiles for likes:", profilesError);
      return;
    }
    setLikesUsers(profilesData || []);
  };

  useEffect(() => {
    const openSlider = async () => {
      // Hide content while animating.
      setShowContent(false);
      await fetchLikesUsers();
      Animated.timing(sliderAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowContent(true);
      });
    };
    openSlider();
  }, [sliderAnim, reviewId]);

  const closeSlider = () => {
    // Hide content immediately on close.
    setShowContent(false);
    Animated.timing(sliderAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Animated.View
      style={[styles.slider, { transform: [{ translateY: sliderAnim }] }]}
    >
      {showContent && (
        <>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderTitle}>Likes</Text>
            <TouchableOpacity onPress={closeSlider}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          {/* Render the ProfileList component without a search bar */}
          <ProfileList profiles={likesUsers} enableSearch={false} />
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slider: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: screenHeight * 0.5,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sliderTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
