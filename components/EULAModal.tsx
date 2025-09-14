import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

interface EULAModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

const EULAModal: React.FC<EULAModalProps> = ({
  visible,
  onAccept,
  onDecline,
  loading = false,
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    setHasScrolledToBottom(isAtBottom);
  };

  const handleAccept = () => {
    if (loading) return; // Prevent action while loading

    if (!hasScrolledToBottom) {
      Alert.alert(
        "Please Read the Terms",
        "Please scroll to the bottom and read the complete terms before accepting.",
        [{ text: "OK" }]
      );
      return;
    }
    onAccept();
  };

  const handleDecline = () => {
    if (loading) return; // Prevent action while loading

    Alert.alert(
      "Terms Required",
      "You must accept the terms and conditions to use Tini Time Club. Would you like to read them again?",
      [
        { text: "Read Again", style: "cancel" },
        { text: "Exit App", onPress: onDecline, style: "destructive" },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            Terms of Service & Community Guidelines
          </Text>

          <ScrollView
            style={styles.scrollView}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.sectionTitle}>Welcome to Tini Time Club</Text>
            <Text style={styles.text}>
              By using Tini Time Club, you agree to these terms and our
              community guidelines. Please read them carefully.
            </Text>

            <Text style={styles.sectionTitle}>1. User-Generated Content</Text>
            <Text style={styles.text}>
              Tini Time Club allows users to share reviews, photos, and comments
              about cocktails and venues. You are responsible for all content
              you post.
            </Text>

            <Text style={styles.sectionTitle}>2. Zero Tolerance Policy</Text>
            <Text style={styles.text}>
              We have a ZERO TOLERANCE policy for: • Harassment, bullying, or
              threatening behavior • Hate speech, discrimination, or offensive
              language • Inappropriate, explicit, or adult content • Spam, fake
              reviews, or misleading information • Copyright infringement or
              stolen content • Any content that violates local laws
            </Text>

            <Text style={styles.sectionTitle}>3. Content Moderation</Text>
            <Text style={styles.text}>
              We actively monitor and moderate all user-generated content.
              Violations will result in immediate content removal and may lead
              to account suspension or termination.
            </Text>

            <Text style={styles.sectionTitle}>4. Reporting System</Text>
            <Text style={styles.text}>
              If you see inappropriate content or behavior, please report it
              immediately using our in-app reporting feature. We take all
              reports seriously and investigate promptly.
            </Text>

            <Text style={styles.sectionTitle}>5. Account Responsibility</Text>
            <Text style={styles.text}>
              You are responsible for maintaining the security of your account
              and for all activities that occur under your account. Do not share
              your account credentials with others.
            </Text>

            <Text style={styles.sectionTitle}>6. Privacy & Data</Text>
            <Text style={styles.text}>
              We respect your privacy and handle your data according to our
              Privacy Policy. By using the app, you consent to our data
              practices as described in our Privacy Policy.
            </Text>

            <Text style={styles.sectionTitle}>7. Age Requirements</Text>
            <Text style={styles.text}>
              You must be at least 21 years old to use Tini Time Club. We do not
              knowingly collect information from users under 21.
            </Text>

            <Text style={styles.sectionTitle}>8. Prohibited Activities</Text>
            <Text style={styles.text}>
              You may not: • Create fake accounts or impersonate others • Post
              reviews for venues you haven't visited • Use the app for
              commercial purposes without permission • Attempt to hack, disrupt,
              or damage the app • Violate any applicable laws or regulations
            </Text>

            <Text style={styles.sectionTitle}>9. Enforcement</Text>
            <Text style={styles.text}>
              We reserve the right to remove content, suspend accounts, or take
              other appropriate action against users who violate these terms.
              Decisions are final and at our sole discretion.
            </Text>

            <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
            <Text style={styles.text}>
              We may update these terms from time to time. Continued use of the
              app after changes constitutes acceptance of the new terms.
            </Text>

            <Text style={styles.footerText}>
              By accepting these terms, you acknowledge that you have read,
              understood, and agree to be bound by them.
            </Text>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.acceptButton,
                (!hasScrolledToBottom || loading) && styles.disabledButton,
              ]}
              onPress={handleAccept}
              disabled={!hasScrolledToBottom || loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.acceptButtonText}>Accepting...</Text>
                </View>
              ) : (
                <Text style={styles.acceptButtonText}>I Agree</Text>
              )}
            </TouchableOpacity>
          </View>

          {!hasScrolledToBottom && (
            <Text style={styles.scrollHint}>
              Please scroll to the bottom to enable the "I Agree" button
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    maxHeight: "90%",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 20,
  },
  scrollView: {
    maxHeight: 400,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10B981",
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#10B981",
  },
  declineButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  declineButtonText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollHint: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

export default EULAModal;
