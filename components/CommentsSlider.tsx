// CommentsSlider.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
  Image,
  Modal,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import { formatRelativeDate } from "@/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import { NOTIFICATION_TYPES } from "@/utils/consts";

const screenHeight = Dimensions.get("window").height;

interface CommentsSliderProps {
  review: {
    id: string;
    user_id: string;
    location?: { name?: string };
  };
  onClose: () => void;
  onCommentDeleted?: (reviewId: string, commentId: number) => void;
  onCommentAdded?: (reviewId: string, newComment: any) => void;
}

export default function CommentsSlider({
  review,
  onClose,
  onCommentDeleted,
  onCommentAdded,
}: CommentsSliderProps) {
  const { profile } = useProfile();
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showContent, setShowContent] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedInfraction, setSelectedInfraction] = useState<string | null>(
    null
  );
  const sliderAnim = useRef(new Animated.Value(screenHeight)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const openSlider = async () => {
      setShowContent(false);
      const { data } = await supabase
        .from("comments")
        .select("*, profile:profiles(id, username, avatar_url)")
        .eq("review_id", review.id)
        .order("inserted_at", { ascending: true });

      setComments(data || []);

      Animated.timing(sliderAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowContent(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      });
    };

    openSlider();
  }, [review.id]);

  const handleAddComment = async () => {
    if (!profile || !commentText.trim()) return;

    const { data, error } = await supabase
      .from("comments")
      .insert({
        review_id: review.id,
        user_id: profile.id,
        body: commentText.trim(),
      })
      .select("*, profile:profiles(id, username, avatar_url)")
      .single();

    if (error) {
      console.error("Error adding comment:", error);
      return;
    }

    setCommentText("");
    setComments((prev) => [...prev, data]);
    flatListRef.current?.scrollToEnd({ animated: true });
    onCommentAdded?.(review.id, data);

    if (review.user_id && profile.id !== review.user_id) {
      const notificationBody = `${
        profile.username
      } commented on your review from ${
        review.location?.name || "an unknown location"
      }`;
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: review.user_id,
          body: notificationBody,
          type: NOTIFICATION_TYPES.USER,
        });
      if (notificationError) {
        console.error(
          "Error creating comment notification:",
          notificationError
        );
      }
    }
  };

  const deleteComment = async (id: number) => {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== id));
      onCommentDeleted?.(review.id, id);
    }
  };

  const confirmDeleteComment = (id: number) => {
    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteComment(id),
      },
    ]);
  };

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

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) sliderAnim.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100) closeSlider();
        else
          Animated.timing(sliderAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ translateY: sliderAnim }] },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.slider, isFocused && styles.sliderExpanded]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {showContent && (
              <>
                <View style={styles.sliderHeader}>
                  <View style={styles.dragIndicatorContainer}>
                    <View style={styles.dragIndicator} />
                  </View>
                </View>

                {comments.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyTitle}>LEAVE A COMMENT</Text>
                    <Text style={styles.emptySubtitle}>
                      Share your thoughts and be the first to join the
                      conversation.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={comments}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => {
                      const username = item.profile?.username || "Unknown";
                      const relativeDate = formatRelativeDate(item.inserted_at);
                      const isOwnComment = profile?.id === item.user_id;
                      const avatarUrl = item.profile?.avatar_url
                        ? supabase.storage
                            .from("avatars")
                            .getPublicUrl(item.profile.avatar_url).data
                            .publicUrl
                        : null;

                      return (
                        <View style={styles.commentRow}>
                          <View style={styles.commentOuter}>
                            <View style={styles.commentInner}>
                              {avatarUrl ? (
                                <Image
                                  source={{ uri: avatarUrl }}
                                  style={styles.avatar}
                                />
                              ) : (
                                <View style={styles.avatarPlaceholder}>
                                  <Text style={styles.avatarInitial}>
                                    {username.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              <View style={styles.commentContent}>
                                <View style={styles.commentHeaderRow}>
                                  <Text style={styles.username}>
                                    {username}
                                  </Text>
                                  <Text style={styles.timestamp}>
                                    {" "}
                                    · {relativeDate}
                                  </Text>
                                </View>
                                <Text style={styles.commentBody}>
                                  {item.body}
                                </Text>
                              </View>
                            </View>
                            {isOwnComment ? (
                              <TouchableOpacity
                                onPress={() => confirmDeleteComment(item.id)}
                                style={styles.deleteIcon}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={16}
                                  color="#888"
                                />
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                onPress={() => setReportModalVisible(true)}
                                style={styles.deleteIcon}
                              >
                                <Ionicons
                                  name="flag-outline"
                                  size={16}
                                  color="#888"
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    }}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    keyboardShouldPersistTaps="handled"
                  />
                )}

                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Add a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={styles.input}
                    returnKeyType="send"
                    onSubmitEditing={handleAddComment}
                  />
                  <TouchableOpacity onPress={handleAddComment}>
                    <Text style={styles.sendButton}>Post</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Animated.View>
    <Modal
      visible={reportModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setReportModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Report Comment</Text>
          {['Spam', 'Inappropriate', 'Harassment', 'Other'].map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.optionButton}
              onPress={() => {
                setSelectedInfraction(option);
                setReportModalVisible(false);
              }}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setReportModalVisible(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slider: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: screenHeight * 0.4,
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
  sliderExpanded: {
    height: screenHeight * 0.8,
  },
  sliderHeader: { alignItems: "center" },
  dragIndicatorContainer: { alignItems: "center", paddingVertical: 8 },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  commentRow: { marginBottom: 16 },
  commentOuter: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  commentInner: { flexDirection: "row", alignItems: "flex-start", flex: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarInitial: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  commentContent: { flex: 1 },
  commentHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
    flexWrap: "wrap",
  },
  username: { fontWeight: "bold", color: "#000" },
  timestamp: { color: "#888", fontSize: 12 },
  commentBody: { fontSize: 14, color: "#000" },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 8,
    marginRight: 10,
  },
  sendButton: { color: "#000000", fontWeight: "bold" },
  deleteIcon: { paddingLeft: 8, paddingTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  optionButton: { paddingVertical: 8, alignSelf: "stretch" },
  optionText: { textAlign: "center", fontSize: 16 },
  cancelButton: { marginTop: 10 },
  cancelText: { color: "#007AFF", fontSize: 16 },
});
