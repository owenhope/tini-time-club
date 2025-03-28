import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  PanResponder,
} from "react-native";
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
  // Start off-screen (below the visible area)
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

  // Animate the slider down and then trigger onClose.
  const closeSlider = () => {
    setShowContent(false);
    Animated.timing(sliderAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      sliderAnim.setValue(screenHeight);
    });
  };

  // PanResponder to enable swipe down to dismiss.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sliderAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          closeSlider();
        } else {
          Animated.timing(sliderAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.slider, { transform: [{ translateY: sliderAnim }] }]}
    >
      {showContent && (
        <>
          {/* A drag indicator to signal swipe-down functionality */}
          <View style={styles.sliderHeader}>
            <View style={styles.dragIndicatorContainer}>
              <View style={styles.dragIndicator} />
            </View>
          </View>
          {/* Render the list of profiles that liked the review */}
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
    alignItems: "center",
  },
  dragIndicatorContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
  },
  sliderTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
